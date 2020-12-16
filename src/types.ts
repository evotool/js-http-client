import type { HttpHeaders } from './http-headers';

export type HttpMethod = 'GET' | 'TRACE' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export interface HttpQuery {
	[key: string]: boolean | number | string | Date | (boolean | number | string | Date)[] | undefined;
}

export interface HttpRequestOptions {

	/**
	 * Request http headers
	 * @default { 'Content-Type': typeof body === 'object' ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'Content-Length': BodyByteLength }
	 */
	headers?: HttpHeaders | { [key: string]: number | string | string[] };

	/**
	 * Request query params
	 * @default {}
	 */
	query?: HttpQuery;

	/**
	 * Request max number of redirects
	 * @default 1
	 */
	redirects?: number;

	/**
	 * Request query stringifier
	 */
	queryStringifier?(query: { [key: string]: any }): string;

	/**
	 * Body parser
	 * @default 'auto'
	 */
	bodyParser?: BodyParser;
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

export type BodyParser = 'auto' | 'json' | 'text' | 'raw';
