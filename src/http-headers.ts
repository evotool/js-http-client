import type { OutgoingHttpHeaders } from 'http';

export class HttpHeaders {
  private readonly _map: Map<string, number | string | string[]>;

  constructor(headers: OutgoingHttpHeaders = {}) {
    this._map = new Map<string, number | string | string[]>(
      Object.entries(headers)
        .map((entry) => {
          entry[0] = entry[0].toLowerCase();

          return entry;
        })
        .filter(([key, value]) => key && value !== undefined) as [string, number | string | string[]][],
    );
  }

  has(key: string): boolean {
    return this._map.has(key);
  }

  get(key: string): number | string | string[] | undefined {
    return this._map.get(key);
  }

  set(key: string, value: number | string | string[]): this {
    this._map.set(key.toLowerCase(), value);

    return this;
  }

  clear(): void {
    return this._map.clear();
  }

  delete(key: string): boolean {
    return this._map.delete(key);
  }

  toObject(): OutgoingHttpHeaders {
    return Object.fromEntries(this._map.entries());
  }
}
