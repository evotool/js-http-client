/* eslint-disable @typescript-eslint/no-use-before-define */
import * as FormData from 'form-data';
import { IncomingMessage, request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { parse as parseUrl, resolve as resolveUrl } from 'url';

import { HttpHeaders } from './http-headers';
import { HttpResponse } from './http-response';
import type { CommonHttpRequestOptions, HttpQuery, HttpRequestOptions, HttpRequestOptionsWithBody, Logger } from './types';

export class HttpClient {
	protected static readonly _logger: { debug(...args: any[]): void } = console;

	static stringifyQuery = (query?: HttpQuery): string => {
		if (!query) {
			return '';
		}

		return `?${Object
			.entries(query)
			.map(([key, value]) => {
				key = encodeURIComponent(key);

				if (Array.isArray(value)) {
					return value.map((v) => {
						if (typeof v === 'string') {
							return `${key}=${encodeURIComponent(v)}`;
						}

						if (typeof v === 'number' && isFinite(v)) {
							return `${key}=${encodeURIComponent(v)}`;
						}

						if (typeof v === 'boolean') {
							return `${key}=${v ? '1' : '0'}`;
						}

						if (v instanceof Date) {
							return `${key}=${v.toISOString()}`;
						}
					})
						.filter(Boolean)
						.join('&');
				}

				if (typeof value === 'string') {
					return `${key}=${encodeURIComponent(value)}`;
				}

				if (typeof value === 'number' && isFinite(value)) {
					return `${key}=${encodeURIComponent(`${value}`)}`;
				}

				if (typeof value === 'boolean') {
					return `${key}=${value ? '1' : '0'}`;
				}

				if (value instanceof Date) {
					return `${key}=${value.toISOString()}`;
				}
			})
			.filter(Boolean)
			.join('&')}`;
	};

	static request(options: CommonHttpRequestOptions, logger?: Logger): Promise<HttpResponse<string | object | Buffer | null>>;
	static request<T>(options: CommonHttpRequestOptions, logger?: Logger): Promise<HttpResponse<T>>;
	static request<T>(options: CommonHttpRequestOptions, logger: Logger = this._logger, redirectFrom?: HttpResponse<T>): Promise<HttpResponse<T | string | object | Buffer | null>> {
		return new Promise<HttpResponse<T | string | Buffer | null>>((resolve, reject) => {
			let { method, url, headers, query, body, redirects = 1 } = options;

			const parsedUrl = parseUrl(url);
			parsedUrl.query = this.stringifyQuery(query);

			if (!parsedUrl.port) {
				parsedUrl.port = parsedUrl.protocol === 'https:' ? '443' : '80';
			}

			if (!(headers instanceof HttpHeaders)) {
				headers = new HttpHeaders(headers);
			}

			const requestOptions = {
				method,
				headers: headers.toObject(),
				protocol: `${parsedUrl.protocol || 'http:'}` as 'http:' | 'https:',
				hostname: parsedUrl.hostname,
				port: parsedUrl.port,
				path: (parsedUrl.path || '/') + parsedUrl.query,
			};

			const callback = (res: IncomingMessage): void => {
				const statusCode = res.statusCode!;
				const response = new HttpResponse<T | string | Buffer>(res, logger, redirectFrom);

				if (statusCode >= 300 && statusCode < 400) {
					const location = res.headers['location'];

					if (location && redirects > response.redirects.length) {
						const url = location;

						// @ts-ignore
						return resolve(this.request({ ...options, url }, logger, response));
					}
				} else if (statusCode >= 400 && statusCode < 500) {
					logger.debug('request fail with code', statusCode);
				} else if (statusCode >= 500) {
					logger.debug('request fail with code', statusCode);
				}

				resolve(response);
			};

			if (body instanceof FormData) {
				body.submit(requestOptions, (err, res) => err ? reject(err) : callback(res));

				return;
			}

			const requestHandler = requestOptions.protocol === 'http:' ? httpRequest : httpsRequest;
			const req = requestHandler(requestOptions, callback);

			let status = 0; // 0 - pending, 1 - resolved, 2 - rejected

			req.on('error', (err) => {
				if (status > 0) {
					return;
				}

				status = 2;
				reject(err);
				logger.debug(`${url} request error: ${err.message}`);
			});

			req.on('finish', () => {
				if (status > 0) {
					return;
				}

				status = 1;
				logger.debug(`${url} request finish`);
			});

			if (body && method !== 'GET' && method !== 'TRACE') {
				if (typeof body === 'object') {
					try {
						body = JSON.stringify(body);
					} catch (err) {
						return reject(err);
					}

					req.setHeader('Content-Length', headers.get('content-length') || Buffer.byteLength(body));
					req.setHeader('Content-Type', 'application/json; charset=utf-8');
				} else {
					req.setHeader('Content-Type', headers.get('content-type') || 'text/plain; charset=utf-8');
					req.setHeader('Content-Length', headers.get('content-length') || Buffer.byteLength(body));
				}

				req.write(body);
			}

			req.end();
		});
	}

	static get<T>(url: string, options: HttpRequestOptions): Promise<HttpResponse<T>> {
		return this.request<T>({ method: 'GET', url, ...options });
	}

	static delete<T>(url: string, options: HttpRequestOptionsWithBody): Promise<HttpResponse<T>> {
		return this.request<T>({ method: 'DELETE', url, ...options });
	}

	static trace<T>(url: string, options: HttpRequestOptions): Promise<HttpResponse<T>> {
		return this.request<T>({ method: 'TRACE', url, ...options });
	}

	static head<T>(url: string, options: HttpRequestOptionsWithBody): Promise<HttpResponse<T>> {
		return this.request<T>({ method: 'HEAD', url, ...options });
	}

	static post<T>(url: string, options: HttpRequestOptionsWithBody): Promise<HttpResponse<T>> {
		return this.request<T>({ method: 'POST', url, ...options });
	}

	static put<T>(url: string, options: HttpRequestOptionsWithBody): Promise<HttpResponse<T>> {
		return this.request<T>({ method: 'PUT', url, ...options });
	}

	static patch<T>(url: string, options: HttpRequestOptionsWithBody): Promise<HttpResponse<T>> {
		return this.request<T>({ method: 'PATCH', url, ...options });
	}

	private _url: string | undefined;

	constructor(private readonly _logger?: Logger) {}

	setUrl(url: string): void {
		this._url = url;
	}

	resolveUrl(url: string): string {
		return this._url ? resolveUrl(this._url, url) : url;
	}

	request<T>(options: CommonHttpRequestOptions): Promise<HttpResponse<T>> {
		return HttpClient.request<T>(options, this._logger);
	}

	get<T>(url: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
		return HttpClient.request<T>({ method: 'GET', url: this.resolveUrl(url), ...options }, this._logger);
	}

	delete<T>(url: string, options: HttpRequestOptionsWithBody = {}): Promise<HttpResponse<T>> {
		return HttpClient.request<T>({ method: 'DELETE', url: this.resolveUrl(url), ...options }, this._logger);
	}

	trace<T>(url: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
		return HttpClient.request<T>({ method: 'TRACE', url: this.resolveUrl(url), ...options }, this._logger);
	}

	head<T>(url: string, options: HttpRequestOptionsWithBody = {}): Promise<HttpResponse<T>> {
		return HttpClient.request<T>({ method: 'HEAD', url: this.resolveUrl(url), ...options }, this._logger);
	}

	post<T>(url: string, options: HttpRequestOptionsWithBody = {}): Promise<HttpResponse<T>> {
		return HttpClient.request<T>({ method: 'POST', url: this.resolveUrl(url), ...options }, this._logger);
	}

	put<T>(url: string, options: HttpRequestOptionsWithBody = {}): Promise<HttpResponse<T>> {
		return HttpClient.request<T>({ method: 'PUT', url: this.resolveUrl(url), ...options }, this._logger);
	}

	patch<T>(url: string, options: HttpRequestOptionsWithBody = {}): Promise<HttpResponse<T>> {
		return HttpClient.request<T>({ method: 'PATCH', url: this.resolveUrl(url), ...options }, this._logger);
	}
}
