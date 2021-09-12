import type { HttpHeaders } from './http-headers';

export type HttpMethod = 'GET' | 'TRACE' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type HttpQueryValue = boolean | number | string | Date | (boolean | number | string | Date)[];
export type HttpQuery = Record<string, HttpQueryValue | null | undefined>;

export interface HttpRequestOptions {

  /**
	 * Request http headers
	 * @default { 'Content-Type': typeof body === 'object' ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'Content-Length': BodyByteLength }
	 */
  headers?: HttpHeaders | Record<string, number | string | string[]>;

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
	 * Request query serialzier
	 */
  querySerializer?(query: any): string;

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
