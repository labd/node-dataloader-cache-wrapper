# node-dataloader-cache-wrapper


## Usage
```ts
import { DataLoaderCache } from "@labdigital/dataloader-cache-wrapper"

const loader = new DataLoaderCache<ProductReference, any>(ProductDataLoader, {
	cache: {
		storeFn: () => new Keyv(),
		ttl: 3600,
	},
	cacheKeyFn: (ref: ProdProductReferenceuctRef) => {
		const key = `${ref.store}-${ref.locale}-${ref.currency}`;
		return `some-data:${key}:id:${ref.slug}`
	},
	maxBatchSize: 50,
});

```

Or use the older API with the `dataloaderCache` function:

```ts
import { dataloaderCache } from "@labdigital/dataloader-cache-wrapper"

export const createProductBySlugLoader = () => {
  return new DataLoader<ProductReference, any>(ProductDataLoader, {
    maxBatchSize: 50,
  });
};

export const ProductDataLoader = async (keys: readonly any[]): Promise<(Product | null)[]> => {
  return dataloaderCache(_uncachedProductDataLoader, keys, {
    store: new Keyv(),
    ttl: 3600,

    cacheKeysFn: (ref: ProductReference) => {
      const key = `${ref.store}-${ref.locale}-${ref.currency}`;
      return [`some-data:${key}:id:${ref.slug}`];
    },
  })
}
```
