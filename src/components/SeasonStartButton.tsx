'use client'

import { useState } from 'react'
import { startSeason } from '@/app/actions/startSeason'
import { resetSeason } from '@/app/actions/resetSeason'

interface SeasonStartButtonProps {
  hasStarted: boolean
  isReady: boolean
}

export default function SeasonStartButton({ hasStarted, isReady }: SeasonStartButtonProps) {
  const [pending, setPending] = useState<boolean>(false)

  const handleStart = async () => {
    setPending(true)
    try {
      await startSeason()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start season'
      console.error(msg)
    } finally {
      setPending(false)
    }
  }

  const handleReset = async () => {
    setPending(true)
    try {
      await resetSeason()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reset season'
      console.error(msg)
    } finally {
      setPending(false)
    }
  }

  if (!hasStarted) {
    return (
      <button
        type="button"
        data-testid="season-start"
        disabled={!isReady || pending}
        onClick={handleStart}
        className="w-full rounded-lg py-4 text-xl font-bold text-white bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Starting...' : 'Start my season'}
      </button>
    )
  }

  return (
    <button
      type="button"
      data-testid="season-reset"
      disabled={pending}
      onClick={handleReset}
      className="w-full rounded-lg py-4 text-xl font-bold text-white bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Resetting...' : 'Reset my season'}
    </button>
  )
}