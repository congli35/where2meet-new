import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { customAlphabet } from 'nanoid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate unique event ID (8 characters)
const eventIdAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const generateEventId = customAlphabet(eventIdAlphabet, 8)

// Generate short code (6 characters, uppercase only for easy sharing)
const shortCodeAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const generateShortCode = customAlphabet(shortCodeAlphabet, 6)

export const generateUniqueIds = () => {
  return {
    eventId: generateEventId(),
    shortCode: generateShortCode()
  }
}

// Device fingerprinting for browser
export const generateDeviceFingerprint = async (): Promise<string> => {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return 'server-' + Math.random().toString(36).substring(2, 15)
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('fingerprint', 2, 2)
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset().toString(),
    screen.width + 'x' + screen.height,
    ctx ? canvas.toDataURL() : 'no-canvas'
  ].join('|')

  // Use Web Crypto API to generate hash
  const encoder = new TextEncoder()
  const data = encoder.encode(fingerprint)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex.substring(0, 16)
}

export type EventParticipationEntry = {
  eventId: string
  nickname: string
  isCreator: boolean
  joinedAt: string
}

const PARTICIPATION_STORAGE_KEY = 'eventParticipation'

const getStorage = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

const safeJSONParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch (error) {
    console.error('Failed to parse localStorage item:', error)
    return fallback
  }
}

const readParticipationStore = (): Record<string, EventParticipationEntry> => {
  const storage = getStorage()
  if (!storage) return {}
  return safeJSONParse<Record<string, EventParticipationEntry>>(
    storage.getItem(PARTICIPATION_STORAGE_KEY),
    {}
  )
}

const writeParticipationStore = (store: Record<string, EventParticipationEntry>) => {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(PARTICIPATION_STORAGE_KEY, JSON.stringify(store))
  } catch (error) {
    console.error('Failed to save participation store:', error)
  }
}

const upsertParticipationEntry = (eventId: string, nickname: string, isCreator: boolean) => {
  const store = readParticipationStore()
  store[eventId] = {
    eventId,
    nickname,
    isCreator,
    joinedAt: new Date().toISOString()
  }
  writeParticipationStore(store)
}

const getParticipationHistoryInternal = (): EventParticipationEntry[] => {
  const store = readParticipationStore()
  return Object.values(store).sort((a, b) => {
    const timeA = new Date(a.joinedAt).getTime()
    const timeB = new Date(b.joinedAt).getTime()
    return timeB - timeA
  })
}

// Local storage utilities
export const localStorageUtils = {
  getMyEvents: (): string[] => {
    return getParticipationHistoryInternal()
      .filter(entry => entry.isCreator)
      .map(entry => entry.eventId)
      .slice(0, 5)
  },

  addEvent: (eventId: string, nickname: string): void => {
    if (typeof window === 'undefined') return
    upsertParticipationEntry(eventId, nickname, true)
  },

  updateRecentView: (eventId: string): void => {
    const storage = getStorage()
    if (!storage) return
    try {
      const views = safeJSONParse<Record<string, string>>(storage.getItem('recent_views'), {})
      views[eventId] = new Date().toISOString()
      storage.setItem('recent_views', JSON.stringify(views))
    } catch (error) {
      console.error('Failed to update recent view:', error)
    }
  },

  // Participation tracking utilities
  hasJoinedEvent: (eventId: string): boolean => {
    const store = readParticipationStore()
    return !!store[eventId]
  },

  markEventJoined: (eventId: string, nickname: string, options?: { isCreator?: boolean }): void => {
    if (typeof window === 'undefined') return
    upsertParticipationEntry(eventId, nickname, options?.isCreator ?? false)
  },

  getJoinedEventInfo: (eventId: string): EventParticipationEntry | null => {
    const store = readParticipationStore()
    return store[eventId] || null
  },

  getParticipationHistory: (): EventParticipationEntry[] => {
    return getParticipationHistoryInternal()
  }
}

// Vote tracking utilities
export const voteUtils = {
  // Get user's votes for an event
  getMyVotes: (eventId: string): number[] => {
    if (typeof window === 'undefined') return []
    try {
      const votesKey = 'myVotes'
      const allVotes = localStorage.getItem(votesKey)
      if (!allVotes) return []
      const parsedVotes = JSON.parse(allVotes)
      return parsedVotes[eventId] || []
    } catch {
      return []
    }
  },

  // Mark a recommendation as voted
  markVoted: (eventId: string, recommendationId: number): void => {
    if (typeof window === 'undefined') return
    try {
      const votesKey = 'myVotes'
      const allVotes = localStorage.getItem(votesKey)
      const parsedVotes = allVotes ? JSON.parse(allVotes) : {}

      // Clear any existing vote for this event (one vote per event)
      parsedVotes[eventId] = [recommendationId]

      localStorage.setItem(votesKey, JSON.stringify(parsedVotes))
    } catch (error) {
      console.error('Failed to mark vote:', error)
    }
  },

  // Remove vote
  removeVote: (eventId: string): void => {
    if (typeof window === 'undefined') return
    try {
      const votesKey = 'myVotes'
      const allVotes = localStorage.getItem(votesKey)
      if (!allVotes) return

      const parsedVotes = JSON.parse(allVotes)
      delete parsedVotes[eventId]

      localStorage.setItem(votesKey, JSON.stringify(parsedVotes))
    } catch (error) {
      console.error('Failed to remove vote:', error)
    }
  },

  // Check if voted for a specific recommendation
  hasVoted: (eventId: string, recommendationId: number): boolean => {
    const votes = voteUtils.getMyVotes(eventId)
    return votes.includes(recommendationId)
  },

  // Check if voted for any recommendation in this event
  hasVotedInEvent: (eventId: string): boolean => {
    const votes = voteUtils.getMyVotes(eventId)
    return votes.length > 0
  },

  // Get current vote for this event (since user can only vote for one)
  getCurrentVote: (eventId: string): number | null => {
    const votes = voteUtils.getMyVotes(eventId)
    return votes.length > 0 ? votes[0] : null
  }
}

// Date utilities
export const dateUtils = {
  addDays: (date: Date, days: number): Date => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  },

  getExpiryDate: (): Date => {
    return dateUtils.addDays(new Date(), 30) // 30 days expiry
  },

  formatRelativeTime: (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
    } else if (diffHours > 0) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      if (diffMinutes <= 0) {
        return 'Just now'
      }
      return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`
    }
  }
}

// Nickname utilities
export const generateUniqueNickname = (baseNickname: string, existingNicknames: string[]): string => {
  // If no duplicate, return original
  if (!existingNicknames.includes(baseNickname)) {
    return baseNickname
  }

  // Generate random 2-digit suffix (10-99) until unique
  let uniqueName: string
  let attempts = 0
  const maxAttempts = 90 // 90 possible combinations (10-99)

  do {
    const suffix = Math.floor(Math.random() * 90) + 10 // 10-99
    uniqueName = `${baseNickname}_${suffix}`
    attempts++

    // Prevent infinite loop (unlikely but safe)
    if (attempts > maxAttempts) {
      // Fallback: use timestamp-based suffix
      uniqueName = `${baseNickname}_${Date.now().toString().slice(-2)}`
      break
    }
  } while (existingNicknames.includes(uniqueName))

  return uniqueName
}

// Error handling utilities
export const errorMessages = {
  NETWORK_ERROR: 'Network connection failed. Please check your connection and try again.',
  EVENT_NOT_FOUND: 'This event does not exist or has expired.',
  RATE_LIMIT: 'Too many actions in a short time. Please try again shortly.',
  INVALID_ADDRESS: 'We could not understand this address. Please provide more detail.',
  LLM_ERROR: 'The recommendation service is temporarily unavailable. Please try again later.',
  VALIDATION_ERROR: 'Some inputs look incorrect. Please review and try again.',
  VOTING_NOT_STARTED: 'Voting has not started yet.',
  ALREADY_VOTED: 'You already voted for this recommendation.',
  NOT_PARTICIPANT: 'Only participants in this event can perform this action.',
  EVENT_FULL: 'The event is full or voting has already started.',
  VOTING_ENDED: 'Voting has already ended.'
} as const

export type ErrorCode = keyof typeof errorMessages

export const getErrorMessage = (code: ErrorCode): string => {
  return errorMessages[code] || 'The action could not be completed. Please try again.'
}
