import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const finalizeEventSchema = z.object({
  finalLocationId: z.number().int().positive(),
  creatorNickname: z.string().min(1).max(20)
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const validation = finalizeEventSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { finalLocationId, creatorNickname } = validation.data
    const { id: eventId } = await params

    // Check if event exists and get current status
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        participants: {
          where: { isCreator: true },
          select: { nickname: true }
        },
        recommendations: {
          where: { id: finalLocationId }
        }
      }
    })

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'EVENT_NOT_FOUND'
      }, { status: 404 })
    }

    if (event.status !== 'VOTING') {
      return NextResponse.json({
        success: false,
        error: 'VOTING_ENDED'
      }, { status: 403 })
    }

    // Check if requester is the event creator
    const creator = event.participants[0] // Should only be one creator
    if (!creator || creator.nickname !== creatorNickname) {
      return NextResponse.json({
        success: false,
        error: 'NOT_PARTICIPANT'
      }, { status: 403 })
    }

    // Check if the recommendation exists for this event
    if (event.recommendations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'EVENT_NOT_FOUND'
      }, { status: 404 })
    }

    // Finalize the event
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: 'FINALIZED',
        finalLocationId: finalLocationId,
        votingEndedAt: new Date()
      },
      include: {
        finalLocation: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        finalLocation: {
          id: updatedEvent.finalLocation!.id,
          locationName: updatedEvent.finalLocation!.locationName,
          locationType: updatedEvent.finalLocation!.locationType,
          description: updatedEvent.finalLocation!.description,
          fairnessAnalysis: updatedEvent.finalLocation!.fairnessAnalysis,
          suitabilityScore: updatedEvent.finalLocation!.suitabilityScore,
          rank: updatedEvent.finalLocation!.rank,
          facilities: updatedEvent.finalLocation!.facilities,
          distances: updatedEvent.finalLocation!.distances,
          generatedAt: updatedEvent.finalLocation!.generatedAt
        },
        votingEndedAt: updatedEvent.votingEndedAt!,
        status: updatedEvent.status
      }
    })

  } catch (error) {
    console.error('Finalize event error:', error)

    return NextResponse.json({
      success: false,
      error: 'NETWORK_ERROR'
    }, { status: 500 })
  }
}