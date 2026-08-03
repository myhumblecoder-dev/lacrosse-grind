import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generate } from './llm'

describe('llm', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('ollama provider returns response field', async () => {
    process.env.LLM_PROVIDER = 'ollama'
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
    process.env.OLLlama_MODEL = 'gemma4:26b'

    const mockResponse = { response: 'hello from ollama' }
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await generate('hi')

    expect(result).toBe('hello from ollama')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          model: 'gemma4:26b',
          prompt: 'hi',
          stream: false,
        }),
      })
    )
  })

  it('anthropic provider returns content text', async () => {
    process.env.LLM_PROVIDER = 'anthropic'
    process.env.ANTHROPIC_API_KEY = 'sk-ant-123'
    process.env.ANTHROPIC_MODEL = 'claude-3-mock'

    const mockResponse = {
      content: [{ text: 'hello from anthropic' }],
    }
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const result = await generate('hi')

    expect(result).toBe('hello from anthropic')
    expect(fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'sk-ant-123',
          'anthropic-version': '2023-06-01',
        }),
        body: JSON.stringify({
          model: 'claude-3-mock',
          max_tokens: 512,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      })
    )
  })

  it('ollama fetch throws on non-ok response', async () => {
    process.env.LLM_PROVIDER = 'ollama'
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    } as Response)

    await expect(generate('hi')).rejects.toThrow('Ollama request failed: Not Found')
  })

  it('anthropic fetch throws on non-ok response', async () => {
    process.env.LLM_PROVIDER = 'anthropic'
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
    } as Response)

    await expect(generate('hi')).rejects.toThrow('Anthropic request failed: Unauthorized')
  })
})
