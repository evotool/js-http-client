# @evojs/http-client

HttpClient class for nodejs

![@evojs/http-client npm version](https://img.shields.io/npm/v/@evojs/http-client.svg) ![supported node version for @evojs/http-client](https://img.shields.io/node/v/@evojs/http-client.svg) ![total npm downloads for @evojs/http-client](https://img.shields.io/npm/dt/@evojs/http-client.svg) ![monthly npm downloads for @evojs/http-client](https://img.shields.io/npm/dm/@evojs/http-client.svg) ![npm licence for @evojs/http-client](https://img.shields.io/npm/l/@evojs/http-client.svg)

## Usage example

```typescript
import { HttpClient } from '@evojs/http-client';

const http = new HttpClient();

http
	.get('https://registry.npmjs.org/@evojs/logger')
	.then(res => res.body())
	.then(packument => {
		console.log(packument);
	});
```

## License

Licensed under MIT license
