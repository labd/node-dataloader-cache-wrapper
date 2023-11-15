import { type Redis } from 'ioredis'
import type DataLoader from 'dataloader'

export type cacheOptions<K, V> = {
  keys: ReadonlyArray<K>
  client?: Redis
  ttl: number

  bachLoadFn: DataLoader.BatchLoadFn<K, V>
  cacheKeysFn: (ref: K) => string[]
  lookupFn: (items: V[], ref: K) => V | undefined
  primeFn?: (items: V[]) => void
}

// dataloaderCache is a wrapper around the dataloader batchLoadFn that adds
// caching. It takes an array of keys and returns an array of items. If an item
// is not in the cache, it will be fetched from the batchLoadFn and then written
// to the cache for next time.
//
// Note: this function is O^2, so it should only be used for small batches of
// keys.
export const dataloaderCache = async <K, V>(
  args: cacheOptions<K, V>
): Promise<(V | null)[]> => {
  const items = await fromCache<K, V>(args.keys, args)
  const result = new Array<V | null>(args.keys.length).fill(null)

  // Find the items that are not in the cache. Take a shortcut when the cache
  // is empty.
  const cacheMiss: Array<K> = []
  if (items.length === 0) {
    cacheMiss.push(...args.keys)
  } else {
    args.keys.forEach((key, index) => {
      const item = args.lookupFn(items, key)
      if (item) {
        result[index] = item
      } else {
        cacheMiss.push(key)
      }
    })
  }

  // Fetch the items that are not in the cache and write them to the cache for
  // next time
  if (cacheMiss.length > 0) {
    const newItems = await args.bachLoadFn(cacheMiss)
    const buffer = new Map<string, V>()

    const lookupItems = Array.from(newItems).filter(
      (item): item is V => item !== null
    ) as V[]

    args.keys.forEach((key, index) => {
      const item = args.lookupFn(lookupItems, key)

      if (item) {
        result[index] = item

        const cacheKeys = args.cacheKeysFn(key)
        cacheKeys.forEach((cacheKey) => {
          buffer.set(cacheKey, item)
        })
      }
    })
    await toCache<K, V>(buffer, args)
  }

  // Allow the caller to prime the cache
  if (args.primeFn) {
    args.primeFn(result.filter((item): item is V => item !== null))
  }

  return result
}

// Read items from the cache by the keys
const fromCache = async <K, V>(
  keys: ReadonlyArray<K>,
  options: cacheOptions<K, V>
): Promise<V[]> => {
  if (!options.client) {
    return []
  }

  const cacheKeys = keys.flatMap(options.cacheKeysFn)
  const cachedValues = await options.client.mget(cacheKeys)
  return cachedValues
    .filter((v): v is string => v != null)
    .map((v: string) => JSON.parse(v))
}

// Write items to the cache
const toCache = async <K, V>(
  items: Map<string, V>,
  options: cacheOptions<K, V>
): Promise<void> => {
  if (!options.client) {
    return
  }

  const commands: (string | number)[][] = []
  items.forEach(async (value, key) => {
    commands.push(['set', key, JSON.stringify(value), 'ex', options.ttl])
  })

  await options.client.multi(commands).exec()
}
