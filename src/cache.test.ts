import DataLoader from "dataloader";
import Keyv from "keyv";
import { assert, describe, expect, it } from "vitest";
import { dataloaderCache } from "./cache";

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
		keys: readonly MyKey[],
	): Promise<(MyValue | null)[]> =>
		dataloaderCache({
			batchLoadFn: fetchItemsBySlugUncached,
			keys: keys,
			store: undefined,
			ttl: 3600,

			cacheKeysFn: (ref: MyKey) => {
				const key = `${ref.id}`;
				return [`item-data:${key}:id:${ref.slug}`];
			},
		});

	const fetchItemsBySlugUncached = async (
		keys: readonly MyKey[],
	): Promise<(MyValue | Error)[]> =>
		keys.map((key) => ({
			slug: key.slug,
			name: key.slug,
		}));

	const loader = new DataLoader<MyKey, MyValue | null>(fetchItemsBySlug, {
		maxBatchSize: 50,
	});

	it("Load existing product", async () => {
		const value = await loader.load({
			id: "1",
			slug: "test",
		});
		assert(value);
		expect(value.slug).toBe("test");
		expect(value.name).toBe("test");
	});
});

describe("Test keyv store", () => {
	const store = new Keyv();

	const fetchItemsBySlug = async (
		keys: readonly MyKey[],
	): Promise<(MyValue | null)[]> =>
		dataloaderCache({
			batchLoadFn: fetchItemsBySlugUncached,
			keys: keys,
			store: store,
			ttl: 3600,

			cacheKeysFn: (ref: MyKey) => {
				const key = `${ref.id}`;
				return [`item-data:${key}:id:${ref.slug}`];
			},
		});

	const fetchItemsBySlugUncached = async (
		keys: readonly MyKey[],
	): Promise<(MyValue | null | Error)[]> =>
		keys.map((key) => {
			if (key.slug.startsWith("null-")) {
				return null;
			}
			return {
				slug: key.slug,
				name: key.slug,
			};
		});

	const loader = new DataLoader<MyKey, MyValue | null>(fetchItemsBySlug, {
		maxBatchSize: 50,
	});

	it("Load existing product", async () => {
		const value = await loader.load({
			id: "1",
			slug: "test-1",
		});
		assert(value);
		expect(value.slug).toBe("test-1");
		expect(value.name).toBe("test-1");

		// This should be one cache hit
		{
			const cachedValue = await loader.loadMany([
				{
					id: "1",
					slug: "test-1",
				},
				{
					id: "2",
					slug: "test-2",
				},
			]);

			assert(cachedValue[0] && !(cachedValue[0] instanceof Error));
			expect(cachedValue[0].slug).toBe("test-1");
			expect(cachedValue[0].name).toBe("test-1");

			assert(cachedValue[1] && !(cachedValue[1] instanceof Error));
			expect(cachedValue[1].slug).toBe("test-2");
			expect(cachedValue[1].name).toBe("test-2");
		}

		// This should be two cache hits
		{
			const cachedValue = await loader.loadMany([
				{
					id: "1",
					slug: "test-1",
				},
				{
					id: "3",
					slug: "test-3",
				},
				{
					id: "2",
					slug: "test-2",
				},
			]);

			assert(cachedValue[0] && !(cachedValue[0] instanceof Error));
			expect(cachedValue[0].slug).toBe("test-1");
			expect(cachedValue[0].name).toBe("test-1");

			assert(cachedValue[1] && !(cachedValue[1] instanceof Error));
			expect(cachedValue[1].slug).toBe("test-3");
			expect(cachedValue[1].name).toBe("test-3");

			assert(cachedValue[2] && !(cachedValue[2] instanceof Error));
			expect(cachedValue[2].slug).toBe("test-2");
			expect(cachedValue[2].name).toBe("test-2");
		}
	});

	it("Cache missing product", async () => {
		const value = await loader.load({
			id: "1",
			slug: "test-1",
		});
		assert(value && !(value instanceof Error));
		expect(value.slug).toBe("test-1");
		expect(value.name).toBe("test-1");

		// This should be one cache hit
		{
			const cachedValue = await loader.loadMany([
				{
					id: "1",
					slug: "test-1",
				},
				{
					id: "2",
					slug: "test-2",
				},
			]);

			assert(cachedValue[0] && !(cachedValue[0] instanceof Error));
			expect(cachedValue[0].slug).toBe("test-1");
			expect(cachedValue[0].name).toBe("test-1");

			assert(cachedValue[1] && !(cachedValue[1] instanceof Error));
			expect(cachedValue[1].slug).toBe("test-2");
			expect(cachedValue[1].name).toBe("test-2");
		}

		// This should be two cache hits
		{
			const cachedValue = await loader.loadMany([
				{
					id: "1",
					slug: "test-1",
				},
				{
					id: "3",
					slug: "test-3",
				},
				{
					id: "2",
					slug: "test-2",
				},
				{
					id: "4",
					slug: "null-1",
				},
			]);

			assert(cachedValue[0] && !(cachedValue[0] instanceof Error));
			expect(cachedValue[0].slug).toBe("test-1");
			expect(cachedValue[0].name).toBe("test-1");

			assert(cachedValue[1] && !(cachedValue[1] instanceof Error));
			expect(cachedValue[1].slug).toBe("test-3");
			expect(cachedValue[1].name).toBe("test-3");

			assert(cachedValue[2] && !(cachedValue[2] instanceof Error));
			expect(cachedValue[2].slug).toBe("test-2");
			expect(cachedValue[2].name).toBe("test-2");

			expect(cachedValue[3]).toBe(null);

			const storedNull = await store.get("item-data:4:id:null-1");
			expect(storedNull).toBeNull();

			const storedUndefined = await store.get("item-data:5:id:null-1");
			expect(storedUndefined).toBeUndefined();
		}
	});
});
