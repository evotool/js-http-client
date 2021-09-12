import type { HttpQueryValue } from './types';

export function joinUrl(url: string, uri: string): string {
  return `${url.replace(/\/+$/, '')}/${uri.replace(/^\/+/, '')}`;
}

function parseQueryFn(key: string) {
  return (value: HttpQueryValue) => {
    if (typeof value === 'string' || (typeof value === 'number' && isFinite(value))) {
      return `${key}=${encodeURIComponent(value)}`;
    }

    if (typeof value === 'boolean') {
      return `${key}=${value ? '1' : '0'}`;
    }

    if (value instanceof Date) {
      return `${key}=${value.toISOString()}`;
    }

    return null;
  };
}

export function serializeQuery(query: any): string {
  if (!query) {
    return '';
  }

  return `?${Object
    .entries(query)
    .map(([key, value]) => {
      key = encodeURIComponent(key);

      const parseQuery = parseQueryFn(key);

      if (Array.isArray(value)) {
        return value.map(parseQuery).filter(Boolean).join('&');
      }

      return parseQuery(value as HttpQueryValue);
    })
    .filter(Boolean)
    .join('&')}`;
}
