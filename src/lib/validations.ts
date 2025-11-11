import { z } from 'zod'

// Event validation schemas
export const createEventSchema = z.object({
  title: z.string().min(1, 'Event name is required').max(50, 'Event name must be 50 characters or fewer'),
  creatorNickname: z.string().min(1, 'Nickname is required').max(20, 'Nickname must be 20 characters or fewer'),
  creatorAddress: z.string().min(2, 'Address must be at least 2 characters').max(200, 'Address must be 200 characters or fewer'),
  purpose: z.enum(['dining', 'coffee', 'meeting', 'other'], {
    message: 'Please select why you are meeting'
  }),
  eventTime: z.string().optional()
    .transform(val => !val || val === '' ? undefined : val)
    .refine(val => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid date/time format'
    }),
  specialRequirements: z.string().optional()
    .transform(val => !val || val === '' ? undefined : val)
    .refine(val => !val || val.length <= 200, {
      message: 'Special requirements must be 200 characters or fewer'
    }),
  expectedParticipants: z.number()
    .int('Participant count must be a whole number')
    .min(2, 'Invite at least 2 people')
    .max(50, 'A maximum of 50 people is supported')
})

export const joinEventSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required').max(20, 'Nickname must be 20 characters or fewer'),
  address: z.string().min(2, 'Address must be at least 2 characters').max(200, 'Address must be 200 characters or fewer')
})

// Event ID validation
export const eventIdSchema = z.string().min(8, 'Invalid event ID')

// Short code validation
export const shortCodeSchema = z.string().length(6, 'Invalid event code')

// Vote validation schemas
export const voteSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required').max(20, 'Nickname must be 20 characters or fewer')
})

export const recommendationIdSchema = z.string().transform(val => {
  const num = parseInt(val, 10)
  if (isNaN(num) || num <= 0) {
    throw new Error('Invalid recommendation ID')
  }
  return num
})

// Event status validation
export const eventStatusSchema = z.enum(['WAITING', 'READY', 'VOTING', 'FINALIZED', 'EXPIRED'])

// Status transition validation
export const canTransitionTo = (current: string, next: string): boolean => {
  const validTransitions: Record<string, string[]> = {
    'WAITING': ['READY', 'EXPIRED'],
    'READY': ['VOTING', 'EXPIRED'],
    'VOTING': ['FINALIZED', 'EXPIRED'],
    'FINALIZED': ['EXPIRED'],
    'EXPIRED': []
  }
  return validTransitions[current]?.includes(next) ?? false
}

// LLM response validation schema (supports both success and error cases)
const recommendationSchema = z.object({
  rank: z.number().int().min(1).max(3).describe('Rank (1-3)'),
  name: z.string().describe('Location name'),
  type: z.string().describe('Type of location (restaurant, cafe, district, etc.)'),
  description: z.string().describe('Reason for recommending this place'),
  fairness_analysis: z.string().describe('Explanation of how travel stays fair'),
  coordinates: z.object({
    lat: z.number().describe('Latitude coordinate'),
    lng: z.number().describe('Longitude coordinate'),
  }).describe('Geographic coordinates for the recommendation'),
  distances: z.array(z.object({
    participant: z.string().describe('Participant nickname'),
    participant_address: z.string().describe('Participant address'),
    coordinates: z.object({
      lat: z.number().describe('Latitude coordinate for the participant'),
      lng: z.number().describe('Longitude coordinate for the participant'),
    }).describe('Geographic coordinates for the participant'),
    estimate: z.string().describe('Distance estimate'),
    transport: z.string().describe('Likely transport mode and duration'),
    time: z.string().describe('Estimated travel time')
  })).describe('Distance information per participant'),
  facilities: z.array(z.string()).describe('Highlights or facilities list'),
  suitability_score: z.number().min(0).max(10).describe('Suitability score (0-10)')
})

export const llmResponseSchema = z.object({
  // Success fields
  analysis: z.string().optional().describe('Brief analysis of the geographic spread'),
  recommendations: z.array(recommendationSchema).optional().describe('Recommended meetup locations'),

  // Error fields
  error: z.boolean().optional().describe('Whether the model returned an error'),
  error_code: z.string().optional().describe('Error code'),
  error_message: z.string().optional().describe('Error details for users'),
  suggestions: z.string().optional().describe('Suggested fix for invalid input')
})

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/<[^>]*>/g, '')
}

// Spam detection patterns
const suspiciousPatterns = [
  /(ad|promo|add ?wechat|test|spam)/i,
  /^[a-z]{1,3}$/i,
  /(.)\\1{5,}/
]

export const isSuspiciousContent = (content: string): boolean => {
  return suspiciousPatterns.some(pattern => pattern.test(content))
}

export type CreateEventInput = z.infer<typeof createEventSchema>
export type JoinEventInput = z.infer<typeof joinEventSchema>
export type VoteInput = z.infer<typeof voteSchema>
