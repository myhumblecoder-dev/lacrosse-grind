import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma as db } from '@/lib/db'
import type { Prize } from '@prisma/client'
import { uploadPrizePhoto } from './uploadPrizePhoto'
import { put, del } from '@vercel/blob'
import { revalidatePath } from 'next/cache'

vi.mock('@/lib/db', () => ({
  prisma: {
    prize: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const makePrize = (overrides: Partial<Prize> = {}): Prize =>
  ({
    id: '',
    title: '',
    description: '',
    photoUrl: '',
    createdAt: new Date(Date.UTC(2024, 0, 1)),
    updatedAt: new Date(Date.UTC(2024, 0, 1)),
    ...overrides,
  } as unknown as Prize)

describe('uploadPrizePhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads an image and stores the url', async () => {
    const file = new File([new Blob(['content'])], 'test.png', { type: 'image/png' })
    const formData = new FormData()
    formData.append('photo', file)

    const mockUrl = 'https://blob.vercel.com/prize/123-test.png'
    vi.mocked(put).mockResolvedValue({ url: mockUrl } as any)
    vi.mocked(db.prize.findUnique).mockResolvedValue(makePrize({ photoUrl: null }))

    const result = await uploadPrizePhoto(formData)

    expect(result).toEqual({ ok: true, url: mockUrl })
    expect(put).toHaveBeenCalledWith(
      expect.stringContaining('prize/'),
      file,
      { access: 'public' }
    )
    expect(db.prize.update).toHaveBeenCalledWith({
      where: { id: 'prize' },
      data: { photoUrl: mockUrl },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/prize')
  })

  it('missing file returns no-file', async () => {
    const formData = new FormData()
    const result = await uploadPrizePhoto(formData)

    expect(result).toEqual({ ok: false, error: 'no-file' })
    expect(put).not.toHaveBeenCalled()
  })

  it('non-image returns not-an-image', async () => {
    const file = new File([new Blob(['content'])], 'test.txt', { type: 'text/plain' })
    const formData = new FormData()
    formData.append('photo', file)

    const result = await uploadPrizePhoto(formData)

    expect(result).toEqual({ ok: false, error: 'not-an-image' })
    expect(put).not.toHaveBeenCalled()
  })

  it('oversized file returns too-large', async () => {
    const largeBlob = new Blob([new ArrayBuffer(6 * 1024 * 1024)]) // 6MB
    const file = new File([largeBlob], 'big.png', { type: 'image/png' })
    const formData = new FormData()
    formData.append('photo', file)

    const result = await uploadPrizePhoto(formData)

    expect(result).toEqual({ ok: false, error: 'too-large' })
    expect(put).not.toHaveBeenCalled()
  })

  describe('remote url', () => {
    const remoteUrl = 'https://images.test/photos/ps5.png'

    const okResponse = (type = 'image/png', size = 1024) =>
      ({
        ok: true,
        headers: { get: (h: string) => (h === 'content-type' ? type : null) },
        blob: async () => ({ size }) as Blob,
      }) as unknown as Response

    it('remote url uploads and stores', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
      vi.mocked(put).mockResolvedValue({ url: 'https://blob.test/prize/ps5.png' } as never)
      vi.mocked(db.prize.findUnique).mockResolvedValue(null)

      const fd = new FormData()
      fd.append('photoUrl', remoteUrl)
      const result = await uploadPrizePhoto(fd)

      expect(result).toEqual({ ok: true, url: 'https://blob.test/prize/ps5.png' })
      // the blob pathname keeps the final segment of the remote path
      expect(vi.mocked(put).mock.calls[0][0]).toContain('ps5.png')
      expect(db.prize.update).toHaveBeenCalledWith({
        where: { id: 'prize' },
        data: { photoUrl: 'https://blob.test/prize/ps5.png' },
      })
      expect(revalidatePath).toHaveBeenCalledWith('/prize')
    })

    it('non-image url returns not-an-image', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse('text/html')))

      const fd = new FormData()
      fd.append('photoUrl', remoteUrl)

      expect(await uploadPrizePhoto(fd)).toEqual({ ok: false, error: 'not-an-image' })
      expect(put).not.toHaveBeenCalled()
    })

    it('oversized url returns too-large', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse('image/png', 6 * 1024 * 1024)))

      const fd = new FormData()
      fd.append('photoUrl', remoteUrl)

      expect(await uploadPrizePhoto(fd)).toEqual({ ok: false, error: 'too-large' })
      expect(put).not.toHaveBeenCalled()
    })

    it('failed fetch returns fetch-failed', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false } as Response))

      const fd = new FormData()
      fd.append('photoUrl', remoteUrl)

      expect(await uploadPrizePhoto(fd)).toEqual({ ok: false, error: 'fetch-failed' })
      expect(put).not.toHaveBeenCalled()
    })

    it('file wins when both are present', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      vi.mocked(put).mockResolvedValue({ url: 'https://blob.test/prize/from-file.png' } as never)
      vi.mocked(db.prize.findUnique).mockResolvedValue(null)

      const fd = new FormData()
      fd.append('photo', new File(['bytes'], 'from-file.png', { type: 'image/png' }))
      fd.append('photoUrl', remoteUrl)
      const result = await uploadPrizePhoto(fd)

      expect(result).toEqual({ ok: true, url: 'https://blob.test/prize/from-file.png' })
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})
