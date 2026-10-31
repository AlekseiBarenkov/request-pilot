import type { ServerConfig } from './config'
import { AppError } from './errors'

const MINUTE_MS = 60_000
const BUSY_RETRY_SECONDS = 1

export type RequestPermit = {
  release: () => void
}

export type RequestLimiter = {
  acquire: (ip: string) => RequestPermit
}

export type RequestLimiterOptions = {
  now?: () => number
}

export function createRequestLimiter(config: ServerConfig, options: RequestLimiterOptions = {}): RequestLimiter {
  const now = options.now ?? Date.now
  const hitsByIp = new Map<string, number[]>()
  let activeRequests = 0
  let dayKey = ''
  let dayCount = 0

  function acquire(ip: string): RequestPermit {
    const current = now()

    if (activeRequests >= config.maxConcurrentRequests) {
      throw new AppError('SERVER_BUSY', { retryAfterSeconds: BUSY_RETRY_SECONDS })
    }

    const currentDay = new Date(current).toISOString().slice(0, 10)

    if (currentDay !== dayKey) {
      dayKey = currentDay
      dayCount = 0
    }

    if (dayCount >= config.dailyRequestLimit) {
      throw new AppError('DAILY_LIMIT_REACHED', { retryAfterSeconds: secondsUntilNextUtcDay(current) })
    }

    const cutoff = current - MINUTE_MS
    const recent = (hitsByIp.get(ip) ?? []).filter((timestamp) => timestamp > cutoff)

    if (recent.length >= config.rateLimitPerMinute) {
      const oldest = recent[0]

      if (oldest === undefined) {
        hitsByIp.delete(ip)
      } else {
        hitsByIp.set(ip, recent)
      }

      throw new AppError('RATE_LIMITED', {
        retryAfterSeconds: oldest === undefined ? 1 : Math.max(1, Math.ceil((oldest + MINUTE_MS - current) / 1000)),
      })
    }

    recent.push(current)
    hitsByIp.set(ip, recent)
    dayCount += 1
    activeRequests += 1

    let released = false

    return {
      release() {
        if (released) {
          return
        }

        released = true
        activeRequests = Math.max(0, activeRequests - 1)
      },
    }
  }

  return { acquire }
}

function secondsUntilNextUtcDay(current: number): number {
  const date = new Date(current)
  const nextDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)

  return Math.max(1, Math.ceil((nextDay - current) / 1000))
}
