---
'@labdigital/dataloader-cache-wrapper': minor
---

Move to `keyv` as cache implementation. This makes it compatible with various
cache implementations. To update replace the `client` option with `store` and
pass a `Keyv` instance.

```ts


import { dataloaderCache } from "@labdigital/dataloader-cache-wrapper"
import Keyv from 'keyv';

const redis = new Redis('redis://user:pass@localhost:6379');
const keyvRedis = new KeyvRedis(redis);

export const createProductBySlugLoader = () => {
  return new DataLoader<ProductReference, any>(ProductDataLoader, {
    maxBatchSize: 50,
  });
};

export const ProductDataLoader = async
(keys: readonly any[]): Promise<(Product | null)[]> => {
  return dataloaderCache(_uncachedProductDataLoader, keys, {
    store: new Keyv({ store: keyvRedis }),
    ttl: 3600,

    cacheKeysFn: (ref: ProductRef) => {
      const key = `${ref.store}-${ref.locale}-${ref.currency}`;
      return [`some-data:${key}:id:${ref.slug}`];
    },
  })
}
```
