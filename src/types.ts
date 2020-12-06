import type { HttpHeaders } from './http-headers';

export type HttpMethod = 'GET' | 'TRACE' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export interface HttpQuery {
	[key: string]: boolean | number | string | Date | (boolean | number | string | Date)[] | undefined;
}

export interface HttpRequestOptions {

	/**
	 * @default { 'Content-Type': typeof body === 'object' ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'Content-Length': BodyByteLength }
	 */
	headers?: HttpHeaders | { [key: string]: number | string | string[] };

	/**
	 * @default {}
	 */
	query?: HttpQuery;

	/**
	 * @default 1
	 */
	redirects?: number;
}

export interface HttpRequestOptionsWithBody extends HttpRequestOptions {
	body?: any;
}

export interface CommonHttpRequestOptions extends HttpRequestOptionsWithBody {
	method: HttpMethod;
	url: string;
}

export interface Logger {
	debug(...args: any[]): void;
}
