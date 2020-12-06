import { parse as parseContentType } from 'content-type';
import type { IncomingHttpHeaders, IncomingMessage } from 'http';

import type { Logger } from './types';

export class HttpResponse<T> {
	private _body?: Promise<T | string | Buffer | null>;

	url: string;
	method: string;
	statusCode: number;
	statusMessage: string;
	headers: IncomingHttpHeaders;

	get redirects(): HttpResponse<T>[] {
		const redirects: HttpResponse<T>[] = [];

		let redirect: HttpResponse<T> | undefined = this;

		while (redirect = redirect._redirectFrom) {
			redirects.push(redirect);
		}

		return redirects.reverse();
	}

	get completed(): boolean {
		return this._res.complete;
	}

	get destroyed(): boolean {
		return this._res.destroyed;
	}

	constructor(private readonly _res: IncomingMessage, private readonly _logger: Logger, private readonly _redirectFrom?: HttpResponse<T>) {
		this.url = _res.url!;
		this.method = _res.method!;
		this.statusCode = _res.statusCode || 0;
		this.statusMessage = _res.statusMessage || '';
		this.headers = _res.headers;
	}

	close(): void {
		this._res.connection.destroy();
		this._res.destroy();
	}

	body(): Promise<T | string | Buffer | null> {
		if (!this._body) {
			this._body = new Promise<T | string | Buffer | null>((r, t) => {
				if (this.destroyed) {
					return t(new Error('Destroyed connection'));
				}

				const chunks: string[] | Buffer[] = [];

				this._res.on('data', (chunk: string | Buffer) => {
					chunks.push(chunk as any);
				});

				this._res.on('end', () => {
					this._logger?.debug(`${this.url} body end with ${chunks.length} chunks`);

					if (!this._res.headers['content-type'] && !chunks.length) {
						return r(null);
					}

					const { type } = parseContentType(this._res);

					switch (type) {
						case 'application/json':
							try {
								r(JSON.parse(chunks.join('')) as T);
							} catch (err) {
								t(err);
							}

							break;

						default:
							if (chunks[0] instanceof Buffer) {
								return r(Buffer.concat(chunks as Buffer[]));
							}

							r(chunks.join(''));

							break;
					}
				});

				this._res.on('error', (err: Error) => {
					t(err);
				});
			});
		}

		return this._body;
	}
}
