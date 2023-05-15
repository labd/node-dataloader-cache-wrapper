import { type Redis } from 'ioredis'
import type DataLoader from 'dataloader'

export type cacheOptions = {
  client?: Redis
  ttl: number

  cacheKeysFn: (ref: any) => string[]
  lookupFn: (items: any, ref: any) => any
}

// dataloaderCache is a wrapper around the dataloader batchLoadFn that adds
// caching. It takes an array of keys and returns an array of items. If an item
// is not in the cache, it will be fetched from the batchLoadFn and then written
// to the cache for next time.
//
// Note: this function is O^2, so it should only be used for small batches of
// keys.
export const dataloaderCache = async <K, V>(
  batchLoadFn: DataLoader.BatchLoadFn<K, V>,
  keys: ReadonlyArray<K>,
  options: cacheOptions
): Promise<V[]> => {
  const items = await fromCache<K, V>(keys, options)
  const result = new Array<V>(keys.length)

  // Find the items that are not in the cache. Take a shortcut when the cache
  // is empty.
  const cacheMiss: Array<K> = []
  if (items.length === 0) {
    cacheMiss.push(...keys)
  } else {
    keys.forEach((key, index) => {
      const item = options.lookupFn(items, key)
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
    const newItems = await batchLoadFn(cacheMiss)
    const buffer = new Map<string, V>()

    keys.forEach((key, index) => {
      const item = options.lookupFn(newItems, key)
      if (item) {
        result[index] = item

        const cacheKeys = options.cacheKeysFn(key)
        cacheKeys.forEach((cacheKey) => {
          buffer.set(cacheKey, item)
        })
      }
    })
    await toCache<V>(buffer, options)
  }

  return result
}

const fromCache = async <K, V>(
  keys: ReadonlyArray<K>,
  options: cacheOptions
): Promise<V[]> => {
  if (!options.client) {
    return []
  }

  const cacheKeys = keys.flatMap(options.cacheKeysFn)
  const cachedValues = await options.client.mget(cacheKeys)
  return cachedValues
    .filter((v: any): v is string => v != null)
    .map((v: string) => JSON.parse(v))
}

const toCache = async <V>(
  items: Map<string, V>,
  options: cacheOptions
): Promise<void> => {
  if (!options.client) {
    return
  }

  const commands: any[][] = []
  items.forEach(async (value, key) => {
    commands.push(['set', key, JSON.stringify(value), 'ex', options.ttl])
  })

  await options.client.multi(commands).exec()
}
