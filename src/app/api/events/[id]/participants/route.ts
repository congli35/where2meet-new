import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { joinEventSchema } from '@/lib/validations'
import { llmService } from '@/lib/llm'
import { LLMRequest } from '@/types'
import { generateUniqueNickname } from '@/lib/utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const validation = joinEventSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { nickname, address } = validation.data
    const { id: eventId } = await params

    // Check if event exists and is not expired
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        participants: true
      }
    })

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'EVENT_NOT_FOUND'
      }, { status: 404 })
    }

    // Check if event is in WAITING status (can only join during waiting)
    if (event.status !== 'WAITING') {
      return NextResponse.json({
        success: false,
        error: 'EVENT_FULL'
      }, { status: 403 })
    }

    // Check if participant count has reached the limit
    if (event.participants.length >= event.expectedParticipants) {
      return NextResponse.json({
        success: false,
        error: 'EVENT_FULL'
      }, { status: 403 })
    }

    // Get all existing nicknames for this event to check for duplicates
    const existingNicknames = event.participants.map(p => p.nickname)

    // Generate unique nickname if duplicate exists
    const originalNickname = nickname
    const assignedNickname = generateUniqueNickname(nickname, existingNicknames)
    const wasModified = originalNickname !== assignedNickname

    // Add participant with the assigned (potentially modified) nickname
    const participant = await prisma.participant.create({
      data: {
        eventId: eventId,
        nickname: assignedNickname,
        address: address,
        isCreator: false
      }
    })

    // Calculate new participant count
    const newParticipantCount = event.participants.length + 1

    // Check if we've reached the expected participant count
    if (newParticipantCount === event.expectedParticipants) {
      // Transition to READY status
      await prisma.event.update({
        where: { id: eventId },
        data: { status: 'READY' }
      })

      console.log(`[Participants] Event ${eventId} transitioned to READY status (${newParticipantCount}/${event.expectedParticipants} participants)`)

      // Get full event with all participants for LLM
      const fullEvent = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          participants: {
            orderBy: { joinedAt: 'asc' }
          }
        }
      })

      if (fullEvent && fullEvent.participants.length >= 2) {
        // Prepare LLM request
        const llmRequest: LLMRequest = {
          title: fullEvent.title,
          purpose: fullEvent.purpose || 'other',
          eventTime: fullEvent.eventTime || undefined,
          specialRequirements: fullEvent.specialRequirements || undefined,
          participants: fullEvent.participants.map(p => ({
            nickname: p.nickname,
            address: p.address
          }))
        }

        // Generate recommendations asynchronously
        Promise.resolve().then(async () => {
          try {
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

              // Persist recommendations and event status atomically
              await prisma.$transaction(async (tx) => {
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

              console.log(`[Participants] Event ${eventId} transitioned to VOTING status with recommendations`)
            }
          } catch (error) {
            console.error(`[Participants] Failed to generate recommendations for event ${eventId}:`, error)
            // Mark the error state so frontend can detect it
            await prisma.event.update({
              where: { id: eventId },
              data: {
                updatedAt: new Date() // Use updatedAt to signal error occurred
              }
            })
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        participant: {
          id: participant.id,
          nickname: participant.nickname,
          address: participant.address,
          is_creator: participant.isCreator,
          joined_at: participant.joinedAt
        },
        participant_count: newParticipantCount,
        should_generate_recommendations: newParticipantCount === event.expectedParticipants,
        nickname_modified: wasModified,
        original_nickname: wasModified ? originalNickname : undefined,
        assigned_nickname: assignedNickname
      }
    })

  } catch (error) {
    console.error('Add participant error:', error)

    return NextResponse.json({
      success: false,
      error: 'NETWORK_ERROR'
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params

    // Get all participants for the event
    const participants = await prisma.participant.findMany({
      where: {
        eventId: eventId,
        event: {
          expiresAt: {
            gt: new Date()
          }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        participants: participants.map(p => ({
          id: p.id,
          nickname: p.nickname,
          address: p.address,
          is_creator: p.isCreator,
          joined_at: p.joinedAt
        }))
      }
    })

  } catch (error) {
    console.error('Get participants error:', error)

    return NextResponse.json({
      success: false,
      error: 'NETWORK_ERROR'
    }, { status: 500 })
  }
}
