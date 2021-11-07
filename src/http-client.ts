/* eslint-disable @typescript-eslint/no-use-before-define */
import * as FormData from 'form-data';
import type { IncomingMessage } from 'http';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { URL } from 'url';

import { joinUrl, serializeQuery } from './helpers';
import { HttpHeaders } from './http-headers';
import { HttpResponse } from './http-response';
import type { CommonHttpRequestOptions, HttpRequestOptions, HttpRequestOptionsWithBody, Logger } from './types';

export class HttpClient {
  protected static readonly _logger: Logger = console;
  static serializeQuery = serializeQuery;

  private _baseUrl: string | undefined;

  constructor(private readonly _logger?: Logger) {}

  setUrl(baseUrl: string): void {
    this._logger?.debug(`Set base url. BaseUrl = ${baseUrl}`);
    this._baseUrl = baseUrl;
  }

  resolveUrl(url: string): string {
    return this._baseUrl ? joinUrl(this._baseUrl, url) : url;
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

  static request(options: CommonHttpRequestOptions, logger?: Logger): Promise<HttpResponse<string | object | Buffer | null>>;
  static request<T>(options: CommonHttpRequestOptions, logger?: Logger): Promise<HttpResponse<T>>;
  static request<T>(options: CommonHttpRequestOptions, logger: Logger = this._logger, redirectFrom?: HttpResponse<T>): Promise<HttpResponse<T | string | object | Buffer | null>> {
    logger?.debug(`Creating ${options.method} request. Url = ${options.url}`);

    return new Promise<HttpResponse<T | string | Buffer | null>>((resolve, reject) => {
      let { method, url, headers, query, body, redirects = 1, bodyParser = 'auto' } = options;

      const parsedUrl = new URL(url);
      parsedUrl.search = (options.querySerializer || this.serializeQuery)(query);

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
        path: parsedUrl.pathname + parsedUrl.search,
      };

      const callback = (res: IncomingMessage): void => {
        const statusCode = res.statusCode!;
        const response = new HttpResponse<T | string | Buffer>(res, bodyParser, logger, redirectFrom);

        if (statusCode >= 300 && statusCode < 400) {
          const location = res.headers.location;

          if (location && redirects > response.redirects.length) {
            const url = location;

            // @ts-ignore
            return resolve(this.request({ ...options, url }, logger, response));
          }
        } else if (statusCode >= 400) {
          logger.debug(`Request HTTP error. Code = ${statusCode}.`);

          reject(new Error('Request HTTP error'));

          return;
        }

        resolve(response);
      };

      if (body instanceof FormData) {
        logger?.debug(`Submiting FormData.`);
        body.submit(requestOptions, (err, res) => err ? reject(err) : callback(res));

        return;
      }

      const requestHandler = requestOptions.protocol === 'http:' ? httpRequest : httpsRequest;
      const req = requestHandler(requestOptions, callback);

      let handled = false;

      req.on('error', (err) => {
        if (handled) {
          return;
        }

        handled = true;
        reject(err);
        logger.debug(`Request error. Url = ${url}, error = ${err.message}.`);
      });

      req.on('finish', () => {
        if (handled) {
          return;
        }

        handled = true;
        logger.debug(`Request finish. Url = ${url}.`);
      });

      if (body && method !== 'GET' && method !== 'TRACE') {
        if (typeof body === 'object' && !(body instanceof Buffer)) {
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
}
