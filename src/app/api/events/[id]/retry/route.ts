import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { llmService } from '@/lib/llm'
import { LLMRequest } from '@/types'
import { z } from 'zod'

const retryRecommendationsSchema = z.object({
  creatorNickname: z.string().min(1).max(20)
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      body = null
    }

    const validation = retryRecommendationsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { creatorNickname } = validation.data
    const { id: eventId } = await params

    // Check if event exists and is in READY status
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        participants: {
          orderBy: { joinedAt: 'asc' }
        }
      }
    })

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'EVENT_NOT_FOUND'
      }, { status: 404 })
    }

    if (event.status !== 'READY') {
      return NextResponse.json({
        success: false,
        error: 'EVENT_NOT_READY'
      }, { status: 400 })
    }

    if (event.participants.length !== event.expectedParticipants) {
      return NextResponse.json({
        success: false,
        error: 'PARTICIPANTS_NOT_COMPLETE'
      }, { status: 400 })
    }

    const creator = event.participants.find(p => p.isCreator)
    if (!creator || creator.nickname !== creatorNickname) {
      return NextResponse.json({
        success: false,
        error: 'NOT_AUTHORIZED'
      }, { status: 403 })
    }

    // Prepare LLM request
    const llmRequest: LLMRequest = {
      title: event.title,
      purpose: event.purpose || 'other',
      eventTime: event.eventTime || undefined,
      specialRequirements: event.specialRequirements || undefined,
      participants: event.participants.map(p => ({
        nickname: p.nickname,
        address: p.address
      }))
    }

    console.log(`[Manual Retry] Generating recommendations for event ${eventId}`)

    // Generate recommendations synchronously (user is waiting)
    const recommendations = await llmService.generateRecommendations(llmRequest)

    if (recommendations.recommendations && recommendations.recommendations.length > 0) {
      const recommendationData = recommendations.recommendations.map((rec) => ({
        eventId: eventId,
        locationName: rec.name,
        locationType: rec.type,
        description: rec.description,
        fairnessAnalysis: rec.fairness_analysis,
        suitabilityScore: rec.suitability_score,
        rank: rec.rank,
        facilities: rec.facilities,
        distances: rec.distances
      }))

      await prisma.$transaction(async (tx) => {
        // Clear any existing recommendations first
        await tx.recommendation.deleteMany({
          where: { eventId }
        })

        for (const data of recommendationData) {
          await tx.recommendation.create({ data })
        }

        await tx.event.update({
          where: { id: eventId },
          data: {
            status: 'VOTING',
            votingStartedAt: new Date()
          }
        })
      })

      console.log(`[Manual Retry] Event ${eventId} transitioned to VOTING status with recommendations`)

      return NextResponse.json({
        success: true,
        data: {
          message: 'Recommendations generated successfully',
          status: 'VOTING'
        }
      })
    } else {
      throw new Error('No recommendations generated')
    }

  } catch (error) {
    console.error('Manual retry recommendations error:', error)

    return NextResponse.json({
      success: false,
      error: 'LLM_ERROR'
    }, { status: 503 })
  }
}
