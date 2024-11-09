import hashObject from 'object-hash'
import type DataLoader from 'dataloader'
import Keyv from 'keyv'

type NotUndefined = object | string | number | boolean | NotUndefined[]

export type cacheOptions<K, V> = {
  keys: ReadonlyArray<K>
  store?: Keyv<V>
  ttl: number

  batchLoadFn: DataLoader.BatchLoadFn<K, V>
  cacheKeysFn: (ref: K) => string[]
}

// dataloaderCache is a wrapper around the dataloader batchLoadFn that adds
// caching. It takes an array of keys and returns an array of items. If an item
// is not in the cache, it will be fetched from the batchLoadFn and then written
// to the cache for next time.
//
// Note: this function is O^2, so it should only be used for small batches of
// keys.
export const dataloaderCache = async <K extends NotUndefined, V>(
  args: cacheOptions<K, V | null>
): Promise<(V | null)[]> => {
  const result = await fromCache<K, V>(args.keys, args)
  const store: Record<string, V | null> = {}

  // Check results, if an item is null then it was not in the cache, we place
  // these in the cacheMiss array and fetch them.
  const cacheMiss: Array<K> = []
  for (const [key, cached] of zip(args.keys, result)) {
    if (cached === undefined) {
      cacheMiss.push(key)
    } else {
      store[hashObject(key)] = cached
    }
  }

  // Fetch the items that are not in the cache and write them to the cache for
  // next time
  if (cacheMiss.length > 0) {
    const newItems = await args.batchLoadFn(cacheMiss)
    const buffer = new Map<string, V | null>()

    zip(cacheMiss, Array.from(newItems)).forEach(([key, item]) => {
      if (key === undefined) {
        throw new Error('key is undefined')
      }

      if (!(item instanceof Error)) {
        store[hashObject(key)] = item

        const cacheKeys = args.cacheKeysFn(key)
        cacheKeys.forEach((cacheKey) => {
          buffer.set(cacheKey, item)
        })
      }
    })

    await toCache<K, V | null>(buffer, args)
  }

  return args.keys.map((key) => {
    const item = store[hashObject(key)]
    if (item) {
      return item
    }

    return null
  })
}

// Read items from the cache by the keys
const fromCache = async <K, V>(
  keys: ReadonlyArray<K>,
  options: cacheOptions<K, V | null>
): Promise<(V | null | undefined)[]> => {
  if (!options.store) {
    return new Array<V | null | undefined>(keys.length).fill(undefined)
  }

  const cacheKeys = keys.flatMap(options.cacheKeysFn)
  const cachedValues = await options.store.get(cacheKeys)
  return cachedValues.map((v) => v )
}

// Write items to the cache
const toCache = async <K, V>(
  items: Map<string, V | null>,
  options: cacheOptions<K, V | null>
): Promise<void> => {
  if (!options.store) {
    return
  }
  for (const [key, value] of items) {
    options.store.set(
      key,
      value,
      options.ttl
    )
  }
}

function zip<T, U>(arr1: readonly T[], arr2: readonly U[]): [T, U][] {
  const minLength = Math.min(arr1.length, arr2.length)
  const result: [T, U][] = []

  for (let i = 0; i < minLength; i++) {
    result.push([arr1[i], arr2[i]])
  }

  return result
}
