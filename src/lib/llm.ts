import { LLMRequest, LLMResponse } from '@/types'
import { llmResponseSchema } from './validations'
import { textModel, generateObject } from './ai'

// LLM Integration for location recommendations using Google Gemini
export class LLMService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
  }

  private generatePrompt(request: LLMRequest): string {
    const { title, purpose, eventTime, specialRequirements, participants } = request

    const purposeMap = {
      dining: 'a group meal',
      coffee: 'a coffee chat',
      meeting: 'a meeting',
      other: 'a casual hangout'
    }

    return `You are an intelligent meet-up location assistant.

[Event Details]
- Title: ${title}
- Purpose: ${purposeMap[purpose as keyof typeof purposeMap]}
- Time: ${eventTime ? new Date(eventTime).toLocaleString('en-US') : 'TBD'}
- Special requirements: ${specialRequirements || 'None'}

[Participant Addresses]
${participants.map(p => `- ${p.nickname}: ${p.address}`).join('\n')}

[Task]
Analyze these addresses and recommend 3 fair, suitable meeting locations.

[Requirements]
1. Understand roughly where each address is located (no need for exact coordinates).
2. Find areas that keep travel times fair for everyone.
3. Suggest concrete places in those areas that match the meeting purpose.
4. Estimate the distance and likely transport for each participant.
5. Provide approximate latitude/longitude coordinates for each recommendation.
6. Explain why each location is fair.

[Address Validation]
First, verify whether every address is valid:
- Each address must be a specific, real place (not just "downtown" or a city name).
- All addresses should be in the same metro region (no cross-country suggestions).
- If an invalid address is detected, return an error response.

[If the addresses are invalid]
Return:
{
  "error": true,
  "error_code": "INVALID_ADDRESSES",
  "error_message": "Explain which addresses are invalid and why",
  "suggestions": "Describe how to update the addresses so they become valid"
}

[If the addresses are valid]
Return recommendations with this structure:
{
  "analysis": "Short analysis of the geographic spread",
  "recommendations": [
    {
      "rank": 1,
      "name": "Name of the recommended place",
      "type": "Type of location (mall, cafe, park, etc.)",
      "description": "Why this place fits the group",
      "fairness_analysis": "Explain how it balances the commute",
      "coordinates": {
        "lat": 31.2304,
        "lng": 121.4737
      },
      "distances": [
        {
          "participant": "Participant nickname",
          "participant_address": "Participant address",
          "coordinates": {
            "lat": 32.2304,
            "lng": 122.4737
          },
          "estimate": "Distance estimate",
          "transport": "Likely mode of transport",
          "time": "Estimated travel time"
        }
      ],
      "facilities": ["Key highlight 1", "Key highlight 2", "Key highlight 3"],
      "suitability_score": 9.2
    }
  ]
}

Notes:
- Always return exactly 3 recommendations.
- Distance estimates can be approximate (e.g., "about 3 km").
- Transport info should be practical (e.g., "subway 15 min", "drive 20 min").
- Suitability scores range from 0-10.
- Coordinates should correspond to real-world places.
- Recommendations must be real, recognizable locations.`
  }

  private generateSystemPrompt(): string {
    return `You are a professional meet-up location assistant with deep geographic knowledge.

Your responsibilities:
1. Validate that the provided addresses are usable.
2. Analyze how the participants are distributed geographically.
3. Recommend fair, realistic places to meet.
4. Provide clear distance and transport estimates.

Key principles:
- Fairness first: keep the maximum travel time difference as small as possible.
- Practicality: recommend real, recognizable locations.
- Accuracy: ground every claim in real geography.
- Clarity: provide concise explanations and reasoning.`
  }

  async generateRecommendations(request: LLMRequest): Promise<LLMResponse> {
    if (!this.apiKey) {
      console.warn('No Google API key found, will use fallback')
      throw new Error('NO_API_KEY')
    }

    const prompt = this.generatePrompt(request)
    const systemPrompt = this.generateSystemPrompt()

    try {
      console.log('[LLM] Calling Gemini via Vercel AI SDK...')

      const result = await generateObject({
        model: textModel,
        schema: llmResponseSchema,
        prompt: prompt,
        system: systemPrompt,
        temperature: 0.0, // Deterministic output
      })

      console.log('[LLM] Gemini response received')
      const response = result.object as LLMResponse

      // Handle error responses
      if (response.error) {
        console.warn('[LLM] AI returned error response:', response.error_code)
        throw new Error(response.error_code || 'LLM_ERROR')
      }

      // Validate success response
      if (!response.recommendations || response.recommendations.length === 0) {
        console.warn('[LLM] No recommendations returned')
        throw new Error('NO_RESULTS')
      }

      // Transform to LLMResponse format
      return {
        analysis: response.analysis || 'Recommendations derived from participant distribution.',
        recommendations: response.recommendations
      }

    } catch (error) {
      
      console.error('[LLM] Gemini API error:', error)
      
      // Rethrow known errors
      if (error instanceof Error) {
        if (error.message === 'NO_API_KEY') throw error
        if (error.message.includes('INVALID_ADDRESSES')) throw error
        if (error.message === 'NO_RESULTS') throw error
      }
      return getFallbackRecommendations();

      // throw new Error('LLM_ERROR')
    }
  }
}

// Singleton instance
export const llmService = new LLMService()

// Fallback recommendations for when LLM is unavailable
export const getFallbackRecommendations = (): LLMResponse => {
  return {
    analysis: "The AI service is unavailable right now. Here are general centrally located ideas to help you keep planning.",
    recommendations: [
      {
        rank: 1,
        name: "Downtown shopping district",
        type: "Commercial area",
        description: "Transit-friendly area with lots of dining options.",
        fairness_analysis: "Being at the city center keeps travel times similar for most participants.",
        coordinates: {
          lat: 39.9042,
          lng: 116.4074
        },
        distances: [
          {
            participant: "All participants",
            estimate: "About 15-30 minutes",
            transport: "Public transit"
          }
        ],
        facilities: ["Near subway", "Many restaurants", "Parking available"],
        suitability_score: 7.0
      },
      {
        rank: 2,
        name: "Large indoor mall",
        type: "Shopping mall",
        description: "Climate-controlled space with plenty of seating and food.",
        fairness_analysis: "Big malls are typically close to major roads and bus lines, keeping access fair.",
        coordinates: {
          lat: 31.2304,
          lng: 121.4737
        },
        distances: [
          {
            participant: "All participants",
            estimate: "About 20-40 minutes",
            transport: "Multiple transport options"
          }
        ],
        facilities: ["Indoor environment", "Easy parking", "Many choices"],
        suitability_score: 6.5
      },
      {
        rank: 3,
        name: "Transit hub area",
        type: "Transit hub",
        description: "Highest accessibility with express connections.",
        fairness_analysis: "Transit hubs offer the fairest travel time since they connect every direction.",
        coordinates: {
          lat: 30.5728,
          lng: 104.0668
        },
        distances: [
          {
            participant: "All participants",
            estimate: "About 10-25 minutes",
            transport: "Public transit"
          }
        ],
        facilities: ["Easy transfers", "Links multiple districts", "Shops nearby"],
        suitability_score: 6.0
      }
    ]
  }
}
