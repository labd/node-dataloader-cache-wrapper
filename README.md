# node-dataloader-cache-wrapper


## Usage

```ts
import { dataloaderCache } from "@labdigital/dataloader-cache-wrapper"

export const createProductBySlugLoader = () => {
  return new DataLoader<ProductReference, any>(ProductDataLoader, {
    maxBatchSize: 50,
  });
};

export const ProductDataLoader = async (keys: readonly any[]): Promise<(Product | null)[]> => {
  return dataloaderCache(_uncachedProductDataLoader, keys, {
    client: redisClient,
    ttl: 3600,

    cacheKeysFn: (ref: ProductRef) => {
      const key = `${ref.store}-${ref.locale}-${ref.currency}`;
      return [`some-data:${key}:id:${ref.slug}`];
    },
  })
}
```
