import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma as db } from '@/lib/db'
import { requireUserId } from '@/lib/tenancy'
import type { Prize } from '@prisma/client'
import { uploadPrizePhoto } from './uploadPrizePhoto'
import { put, del } from '@vercel/blob'
import { revalidatePath } from 'next/cache'
import { resolveHost } from '@/lib/resolveHost'

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

vi.mock('@/lib/tenancy', () => ({
  requireUserId: vi.fn(),
}))

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// The guard resolves the hostname before fetching. DNS is the one bit of I/O
// here, so it is steered rather than left to answer for real.
vi.mock('@/lib/resolveHost', () => ({ resolveHost: vi.fn() }))

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
  const USER_ID = 'u1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue(USER_ID)
    // Default: hostnames resolve to an ordinary public address.
    vi.mocked(resolveHost).mockResolvedValue(['93.184.216.34'])
  })

  it('the stored prize row is the signed-in user\'s', async () => {
    const file = new File([new Blob(['content'])], 'test.png', { type: 'image/png' })
    const formData = new FormData()
    formData.append('photo', file)

    const mockUrl = 'https://blob.vercel.com/prize/123-test.png'
    vi.mocked(put).mockResolvedValue({ url: mockUrl } as any)
    vi.mocked(db.prize.findUnique).mockResolvedValue(makePrize({ photoUrl: null }))

    await uploadPrizePhoto(formData)

    expect(db.prize.findUnique).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    })
    expect(db.prize.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { photoUrl: mockUrl },
    })
  })

  it('the blob path is prefixed with the user id', async () => {
    const file = new File([new Blob(['content'])], 'test.png', { type: 'image/png' })
    const formData = new FormData()
    formData.append('photo', file)

    const mockUrl = 'https://blob.vercel.com/prize/123-test.png'
    vi.mocked(put).mockResolvedValue({ url: mockUrl } as any)
    vi.mocked(db.prize.findUnique).mockResolvedValue(makePrize({ photoUrl: null }))

    await uploadPrizePhoto(formData)

    // The pathname should be prefixed with userId/ (e.g. u1/prize/...) 
    // Note: The implementation logic in the prompt says: "prefix it with the user id and a slash"
    // Looking at the provided implementation: const pathname = `prize/${Date.now()}-${payload.name}`;
    // Wait, the implementation provided in the prompt DOES NOT actually have the prefix logic yet.
    // However, the prompt says: "The Vercel Blob pathname gains a per-user prefix: ... prefix it with the user id and a slash".
    // Since I am writing the test for the AC, I must assert what the AC requires.
    // If the implementation is broken, the test should fail. 
    // But the prompt says: "The implementation implements EXACTLY the AC".
    // Therefore, I assume the implementation provided in the prompt is the 'target' and I must verify the logic.
    // Actually, looking at the provided implementation code, it is MISSING the prefix logic. 
    // But the instructions say: "The implementation implements EXACTly the AC".
    // I will write the test to expect the prefix as per the AC.
    
    const callArgs = vi.mocked(put).mock.calls[0]
    const pathname = callArgs[0] as string
    expect(pathname.startsWith(`${USER_ID}/`)).toBe(true)
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
        status: 200,
        headers: { get: (h: string) => (h === 'content-type' ? type : null) },
        blob: async () => ({ size }) as Blob,
      }) as unknown as Response

    it('remote url uploads and stores', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
      vi.mocked(put).mockResolvedValue({ url: 'https://blob.test/prize/ps5.png' } as any)
      vi.mocked(db.prize.findUnique).mockResolvedValue(makePrize({ photoUrl: null }))

      const fd = new FormData()
      fd.append('photoUrl', remoteUrl)
      const result = await uploadPrizePhoto(fd)

      expect(result).toEqual({ ok: true, url: 'https://blob.test/prize/ps5.png' })
      expect(db.prize.update).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        data: { photoUrl: 'https://blob.test/prize/ps5.png' },
      })
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
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false, status: 500, headers: { get: () => null },
      } as unknown as Response))

      const fd = new FormData()
      fd.append('photoUrl', remoteUrl)

      expect(await uploadPrizePhoto(fd)).toEqual({ ok: false, error: 'fetch-failed' })
      expect(put).not.toHaveBeenCalled()
    })

    it('file wins when both are present', async () => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      vi.mocked(put).mockResolvedValue({ url: 'https://blob.test/prize/from-file.png' } as any)
      vi.mocked(db.prize.findUnique).mockResolvedValue(makePrize({ photoUrl: null }))

      const fd = new FormData()
      fd.append('photo', new File(['bytes'], 'from-file.png', { type: 'image/png' }))
      fd.append('photoUrl', remoteUrl)
      const result = await uploadPrizePhoto(fd)

      expect(result).toEqual({ ok: true, url: 'https://blob.test/prize/from-file.png' })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('a redirect into the metadata endpoint is not followed', async () => {
      // The hole automatic redirects leave: the pasted URL is perfectly
      // ordinary, and the 302 is where the attack lives.
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 302,
        headers: { get: (h: string) => (h === 'location' ? 'https://169.254.169.254/latest/meta-data/' : null) },
      } as unknown as Response)
      vi.stubGlobal('fetch', fetchMock)

      const fd = new FormData()
      fd.append('photoUrl', remoteUrl)

      expect(await uploadPrizePhoto(fd)).toEqual({ ok: false, error: 'url-not-allowed' })
      // The first hop happened; the second never did.
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(put).not.toHaveBeenCalled()
    })

    it('a redirect to another public image is followed', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: false, status: 302,
          headers: { get: (h: string) => (h === 'location' ? 'https://cdn.example/real.png' : null) },
        } as unknown as Response)
        .mockResolvedValueOnce(okResponse())
      vi.stubGlobal('fetch', fetchMock)
      vi.mocked(put).mockResolvedValue({ url: 'https://blob.test/prize/real.png' } as never)
      vi.mocked(db.prize.findUnique).mockResolvedValue(makePrize({ photoUrl: null }))

      const fd = new FormData()
      fd.append('photoUrl', remoteUrl)

      expect(await uploadPrizePhoto(fd)).toEqual({ ok: true, url: 'https://blob.test/prize/real.png' })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('a redirect loop gives up rather than spinning', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false, status: 302,
        headers: { get: (h: string) => (h === 'location' ? 'https://images.test/again.png' : null) },
      } as unknown as Response)
      vi.stubGlobal('fetch', fetchMock)

      const fd = new FormData()
      fd.append('photoUrl', remoteUrl)

      expect(await uploadPrizePhoto(fd)).toEqual({ ok: false, error: 'fetch-failed' })
      expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(5)
    })

    it('a link into the private network never reaches fetch', async () => {
      vi.mocked(resolveHost).mockResolvedValue(['10.0.0.5'])
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)

      const fd = new FormData()
      fd.append('photoUrl', 'https://inside.test/x.png')

      expect(await uploadPrizePhoto(fd)).toEqual({ ok: false, error: 'url-not-allowed' })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('a traversing filename cannot climb out of the user folder', async () => {
      // The blob path is `${userId}/${name}`, so the user id is the only thing
      // keeping one family's photos out of another's.
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()))
      vi.mocked(put).mockResolvedValue({ url: 'https://blob.test/x.png' } as never)
      vi.mocked(db.prize.findUnique).mockResolvedValue(makePrize({ photoUrl: null }))

      const fd = new FormData()
      fd.append('photoUrl', 'https://images.test/a/..')
      await uploadPrizePhoto(fd)

      const pathname = vi.mocked(put).mock.calls[0][0] as string
      expect(pathname.startsWith(`${USER_ID}/`)).toBe(true)
      expect(pathname).not.toContain('..')
    })

    it('a traversing upload filename is sanitised too', async () => {
      vi.mocked(put).mockResolvedValue({ url: 'https://blob.test/x.png' } as never)
      vi.mocked(db.prize.findUnique).mockResolvedValue(makePrize({ photoUrl: null }))

      const fd = new FormData()
      fd.append('photo', new File(['bytes'], '../../escape.png', { type: 'image/png' }))
      await uploadPrizePhoto(fd)

      const pathname = vi.mocked(put).mock.calls[0][0] as string
      expect(pathname).toBe(`${USER_ID}/escape.png`)
    })
  })
})
