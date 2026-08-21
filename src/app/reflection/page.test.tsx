import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Page from './page'
import { requireUserId } from '@/lib/tenancy'
import { prisma as db } from '@/lib/db'

vi.mock('next/font/google', () => new Proxy({}, {
  get: () => () => ({ variable: 'mock-font-variable', className: 'mock-font' }),
}))

vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

vi.mock('@/lib/db', () => ({
  prisma: {
    weeklyReflection: {
      findMany: vi.fn(),
    },
  },
}))

describe('Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('the reflection list is scoped to the signed-</strong>in user', async () => {
    const weekStart = new Date('2024-01-01') // Mocking date logic is hard in server components, but we check the call
    
    vi.mocked(db.weeklyReflection.findMany).mockResolvedValue([
      {
        id: 'r1',
        userId: 'u1',
        weekStarting: new Date('2024-01-01'),
        playerNote: 'Great week',
        coachSummary: 'Good job',
        createdAt: new Date(),
      },
    ])

    // We render the component. Since it's an async Server Component, 
    // in a real Vitest/Next environment we'd await the component execution.
    // In this scaffold, we treat it as a function call.
    const PageComponent = await (Page as any)()
    render(PageComponent)

    expect(db.weeklyReflection.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { weekStarting: 'desc' },
    })
    
    expect(screen.getByText('Great week')).toBeInTheDocument()
  })
})