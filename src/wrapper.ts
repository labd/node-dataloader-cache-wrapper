import DataLoader, { type BatchLoadFn } from "dataloader";
import type Keyv from "keyv";
import { dataloaderCache } from "./cache";
import type { NotUndefined } from "./cache";

type Options<K, V, C = K> = {
	cache?: {
		ttl: number;
		storeFn: <V>() => Keyv<V | null>;
	};
	cacheKeyFn: (key: K) => string;
	maxBatchSize?: number;
	name?: string;
};

/**
 * DataLoaderCache is a small wrapper around DataLoader that adds caching to
 * a keyv store. It has the same API as DataLoader, but does require setting a
 * cacheKeyFn to generate the cache key (which needs to return a string).
 *
 */
export class DataLoaderCache<K extends NotUndefined, V> {
	_dataloader: DataLoader<K, V | null>;
	_cacheStore?: Keyv<V | null>;
	_cacheKeyFn: (key: K) => string;

	name: string | undefined

	constructor(
		batchLoadFn: BatchLoadFn<K, V | null>,
		options: Options<K, V, string>,
	) {
		this._cacheKeyFn = options.cacheKeyFn;
		this.name = options.name

		let wrappedBatchLoadFn: BatchLoadFn<K, V | null>;
		if (options.cache) {
			this._cacheStore = options.cache.storeFn();
			const cacheTtl = options.cache.ttl;

			wrappedBatchLoadFn = async (keys: readonly K[]): Promise<(V | null)[]> =>
				dataloaderCache<K, V>({
					keys: keys,
					store: this._cacheStore,
					ttl: cacheTtl,
					batchLoadFn,
					cacheKeysFn: (key: K) => {
						return [this._cacheKeyFn(key)];
					},
				});
		} else {
			wrappedBatchLoadFn = batchLoadFn;
		}

		this._dataloader = new DataLoader<K, V | null, string>(wrappedBatchLoadFn, {
			batch: true,
			maxBatchSize: options.maxBatchSize ?? 50,
			cache: true,
			cacheKeyFn: this._cacheKeyFn,
			name: options.name,
		});
	}

	prime(key: K, value: V | null) {
		return this._dataloader.prime(key, value);
	}

	async load(key: K): Promise<V | null> {
		return this._dataloader.load(key);
	}

	async loadMany(keys: readonly K[]): Promise<Array<V | null | Error>> {
		return this._dataloader.loadMany(keys);
	}

	async clear(key: K) {
		if (this._cacheStore) {
			await this._cacheStore.delete(this._cacheKeyFn(key));
		}
		return this._dataloader.clear(key);
	}

	async clearAll() {
		if (this._cacheStore) {
			await this._cacheStore.clear();
		}
		return this._dataloader.clearAll();
	}
}
