import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EventDetailResponse, DistanceInfo } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params

    // Fetch event with participants and recommendations
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        expiresAt: {
          gt: new Date() // Only return non-expired events
        }
      },
      include: {
        participants: {
          orderBy: {
            joinedAt: 'asc'
          }
        },
        recommendations: {
          orderBy: {
            rank: 'asc'
          }
        },
        finalLocation: true
      }
    })

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'EVENT_NOT_FOUND'
      }, { status: 404 })
    }

    const formatRecommendation = (rec: (typeof event.recommendations)[number]) => ({
      ...rec,
      locationName: rec.locationName ?? undefined,
      locationType: rec.locationType ?? undefined,
      description: rec.description ?? undefined,
      fairnessAnalysis: rec.fairnessAnalysis ?? undefined,
      suitabilityScore: rec.suitabilityScore ? Number(rec.suitabilityScore) : undefined,
      distances: (rec.distances as DistanceInfo[] | null) ?? undefined,
      facilities: rec.facilities as string[] | undefined
    })

    // Convert Decimal to number for suitability scores and handle null/undefined
    const recommendations = event.recommendations.map(formatRecommendation)
    const finalLocation = event.finalLocation ? formatRecommendation(event.finalLocation) : undefined

    const response: EventDetailResponse = {
      event: {
        id: event.id,
        shortCode: event.shortCode,
        title: event.title,
        purpose: (event.purpose as 'dining' | 'coffee' | 'meeting' | 'other') ?? undefined,
        eventTime: event.eventTime ?? undefined,
        specialRequirements: event.specialRequirements ?? undefined,
        status: event.status as 'WAITING' | 'READY' | 'VOTING' | 'FINALIZED' | 'EXPIRED',
        expectedParticipants: event.expectedParticipants,
        votingStartedAt: event.votingStartedAt ?? undefined,
        votingEndedAt: event.votingEndedAt ?? undefined,
        finalLocationId: event.finalLocationId ?? undefined,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        expiresAt: event.expiresAt,
        participants: event.participants,
        recommendations: recommendations,
        finalLocation
      },
      participants: event.participants,
      recommendations: recommendations
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Fetch event error:', error)

    return NextResponse.json({
      success: false,
      error: 'NETWORK_ERROR'
    }, { status: 500 })
  }
}
