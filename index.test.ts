import DataLoader from "dataloader";
import { dataloaderCache } from ".";

type MyKey = {
  id: string;
  slug: string;
};

type MyValue = {
  slug: string;
  name: string;
};

describe("Test no cache", () => {
  const fetchItemsBySlug = async (
    keys: readonly MyKey[]
  ): Promise<(MyValue | null)[]> => {
    return dataloaderCache(fetchItemsBySlugUncached, keys, {
      client: undefined,
      ttl: 3600,

      cacheKeysFn: (ref: MyKey) => {
        const key = `${ref.id}`;
        return [`item-data:${key}:id:${ref.slug}`];
      },
      lookupFn: (items: MyValue[], ref: MyKey) => {
        return items.find((p) => p.slug === ref.slug);
      },
    });
  };

  const fetchItemsBySlugUncached = async (
    keys: readonly MyKey[]
  ): Promise<(MyValue | null)[]> => {
    return keys.map((key) => {
      return {
        slug: key.slug,
        name: key.slug,
      };
    });
  };

  const loader = new DataLoader<MyKey, any>(fetchItemsBySlug, {
    maxBatchSize: 50,
  });

  it("Load existing product", async () => {
    const value = await loader.load({
      id: "1",
      slug: "test",
    });
    expect(value.slug).toBe("test");
    expect(value.name).toBe("test");
  });
});
