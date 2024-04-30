import DataLoader from 'dataloader'
import { dataloaderCache } from './index.js'
import { describe, expect, it } from 'vitest'
import Keyv from 'keyv'

type MyKey = {
  id: string
  slug: string
}

type MyValue = {
  slug: string
  name: string
}

describe('Test no cache', () => {
  const fetchItemsBySlug = async (
    keys: readonly MyKey[]
  ): Promise<(MyValue | null)[]> =>
    dataloaderCache({
      batchLoadFn: fetchItemsBySlugUncached,
      keys: keys,
      store: undefined,
      ttl: 3600,

      cacheKeysFn: (ref: MyKey) => {
        const key = `${ref.id}`
        return [`item-data:${key}:id:${ref.slug}`]
      },
    })

  const fetchItemsBySlugUncached = async (
    keys: readonly MyKey[]
  ): Promise<(MyValue | Error)[]> =>
    keys.map((key) => ({
      slug: key.slug,
      name: key.slug,
    }))

  const loader = new DataLoader<MyKey, any>(fetchItemsBySlug, {
    maxBatchSize: 50,
  })

  it('Load existing product', async () => {
    const value = await loader.load({
      id: '1',
      slug: 'test',
    })
    expect(value.slug).toBe('test')
    expect(value.name).toBe('test')
  })
})

describe('Test keyv store', () => {
  const store = new Keyv()

  const fetchItemsBySlug = async (
    keys: readonly MyKey[]
  ): Promise<(MyValue | null)[]> =>
    dataloaderCache({
      batchLoadFn: fetchItemsBySlugUncached,
      keys: keys,
      store: store,
      ttl: 3600,

      cacheKeysFn: (ref: MyKey) => {
        const key = `${ref.id}`
        return [`item-data:${key}:id:${ref.slug}`]
      },
    })

  const fetchItemsBySlugUncached = async (
    keys: readonly MyKey[]
  ): Promise<(MyValue | Error)[]> =>
    keys.map((key) => ({
      slug: key.slug,
      name: key.slug,
    }))

  const loader = new DataLoader<MyKey, any>(fetchItemsBySlug, {
    maxBatchSize: 50,
  })

  it('Load existing product', async () => {
    const value = await loader.load({
      id: '1',
      slug: 'test-1',
    })
    expect(value.slug).toBe('test-1')
    expect(value.name).toBe('test-1')

    // This should be one cache hit
    {
      const cachedValue = await loader.loadMany([
        {
          id: '1',
          slug: 'test-1',
        },
        {
          id: '2',
          slug: 'test-2',
        },
      ])
      expect(cachedValue[0].slug).toBe('test-1')
      expect(cachedValue[0].name).toBe('test-1')

      expect(cachedValue[1].slug).toBe('test-2')
      expect(cachedValue[1].name).toBe('test-2')
    }

    // This should be two cache hits
    {
      const cachedValue = await loader.loadMany([
        {
          id: '1',
          slug: 'test-1',
        },
        {
          id: '3',
          slug: 'test-3',
        },
        {
          id: '2',
          slug: 'test-2',
        },
      ])

      expect(cachedValue[0].slug).toBe('test-1')
      expect(cachedValue[0].name).toBe('test-1')

      expect(cachedValue[1].slug).toBe('test-3')
      expect(cachedValue[1].name).toBe('test-3')

      expect(cachedValue[2].slug).toBe('test-2')
      expect(cachedValue[2].name).toBe('test-2')
    }
  })
})
