# @labdigital/dataloader-cache-wrapper

## 0.6.2

### Patch Changes

- 207909c: Fix type mismastch with DataLoader

## 0.6.1

### Patch Changes

- 67309b2: Fix missing attributes on DataLoaderCache

## 0.6.0

### Minor Changes

- 178f4b2: Add new class `DataLoaderCache` to simplify the API. It wraps the `DataLoader`
  class and automatically uses the `dataloaderCache` when the `cache` option is
  configured.

## 0.5.1

### Patch Changes

- 10d8cdf: Update dependencies

## 0.5.0

### Minor Changes

- 7020b97: Update dependencies

## 0.4.0

### Minor Changes

- 8b10587: Properly support caching null values, and dont handle these as missing

## 0.3.0

### Minor Changes

- 3fbea90: Move to `keyv` as cache implementation. This makes it compatible with various
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

## 0.2.0

### Minor Changes

- ffe9f26: Refactor to simplify the API by removing the lookupFn callback

## 0.1.1

### Patch Changes

- 0fd4457: Fix silly typo in latest change. bachLoadFn -> batchLoadFn

## 0.1.0

### Minor Changes

- 01243d5: Move all arguments to the options object for consistency
- dc082bf: Add support for adding a callback to prime the dataloader cache

## 0.0.5

### Patch Changes

- 822774e: Simplify the lookupFn function definition to improve the API

## 0.0.4

### Patch Changes

- 0edf554: Fix release artifact

## 0.0.3

### Patch Changes

- bedf41c: Fix ESM exports

## 0.0.2

### Patch Changes

- 95be409: Fix issue returning missing items from the dataloader
