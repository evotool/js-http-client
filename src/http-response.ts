import { parse as parseContentType } from 'content-type';
import type { IncomingHttpHeaders, IncomingMessage } from 'http';

import type { BodyParser, Logger } from './types';

export class HttpResponse<T> {
	static DEFAULT_CHARSET = 'utf-8';

	private _body?: Promise<T>;

	readonly url: string;
	readonly method: string;
	readonly statusCode: number;
	readonly statusMessage: string;
	readonly headers: IncomingHttpHeaders;

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

	constructor(private readonly _res: IncomingMessage, private readonly _bodyParser: BodyParser, private readonly _logger: Logger, private readonly _redirectFrom?: HttpResponse<T>) {
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

	body(): Promise<T> {
		if (!this._body) {
			this._body = new Promise<T>((r, t) => {
				if (this.destroyed) {
					return t(new Error('Destroyed connection'));
				}

				const chunks: Buffer[] = [];

				this._res.on('data', (chunk: string | Buffer) => {
					chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
				});

				this._res.on('end', () => {
					this._logger?.debug(`${this.url} body end with ${chunks.length} chunks`);

					if (!this._res.headers['content-type'] && !chunks.length) {
						r(null as unknown as T);

						return;
					}

					const { type, parameters: { charset } } = parseContentType(this._res);

					const buffer = Buffer.concat(chunks);

					if ((this._bodyParser === 'auto' && type === 'application/json') || this._bodyParser === 'json') {
						try {
							r(JSON.parse(buffer.toString(charset as any || HttpResponse.DEFAULT_CHARSET)) as T);
						} catch (err) {
							t(err);
						}

						return;
					}

					if (this._bodyParser === 'text') {
						r(buffer.toString(charset as any || HttpResponse.DEFAULT_CHARSET) as unknown as T);

						return;
					}

					r(buffer as unknown as T);
				});

				this._res.on('error', (err: Error) => {
					t(err);
				});
			});
		}

		return this._body;
	}
}
