import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VoteSummary } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const { searchParams } = new URL(request.url)
    const currentUserNickname = searchParams.get('nickname')

    // Check if event exists and get basic info
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        participants: {
          select: { nickname: true }
        },
        recommendations: {
          include: {
            votes: true
          },
          orderBy: { rank: 'asc' }
        }
      }
    })

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'EVENT_NOT_FOUND'
      }, { status: 404 })
    }

    // Build vote summary for each recommendation
    const recommendations: VoteSummary[] = event.recommendations.map(rec => {
      const voters = rec.votes.map(vote => vote.voterNickname)
      const hasCurrentUserVoted = currentUserNickname ? voters.includes(currentUserNickname) : false

      return {
        recommendationId: rec.id,
        locationName: rec.locationName || 'Unknown Location',
        voteCount: rec.votes.length,
        voters: voters,
        hasCurrentUserVoted: hasCurrentUserVoted
      }
    })

    // Calculate total votes across all recommendations
    const totalVotes = recommendations.reduce((sum, rec) => sum + rec.voteCount, 0)

    return NextResponse.json({
      success: true,
      data: {
        recommendations: recommendations,
        totalVotes: totalVotes,
        participantCount: event.participants.length
      }
    })

  } catch (error) {
    console.error('Get votes summary error:', error)

    return NextResponse.json({
      success: false,
      error: 'NETWORK_ERROR'
    }, { status: 500 })
  }
}