import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { voteSchema, recommendationIdSchema } from '@/lib/validations'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recId: string }> }
) {
  try {
    const body = await request.json()
    const validation = voteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { nickname } = validation.data
    const { id: eventId, recId: recIdParam } = await params

    // Validate recommendation ID
    let recommendationId: number
    try {
      recommendationId = recommendationIdSchema.parse(recIdParam)
    } catch {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // Check if event exists and is in VOTING status
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
        error: 'VOTING_NOT_STARTED'
      }, { status: 403 })
    }

    // Check if voter is a participant
    const isParticipant = event.participants.some(p => p.nickname === nickname)
    if (!isParticipant) {
      return NextResponse.json({
        success: false,
        error: 'NOT_PARTICIPANT'
      }, { status: 403 })
    }

    // Check if recommendation exists for this event
    const recommendation = await prisma.recommendation.findFirst({
      where: {
        id: recommendationId,
        eventId: eventId
      }
    })

    if (!recommendation) {
      return NextResponse.json({
        success: false,
        error: 'EVENT_NOT_FOUND'
      }, { status: 404 })
    }

    // Use transaction to handle vote creation/update
    const result = await prisma.$transaction(async (tx) => {
      // Check if user already voted for any recommendation in this event
      const existingVote = await tx.vote.findFirst({
        where: {
          eventId: eventId,
          voterNickname: nickname
        }
      })

      if (existingVote) {
        // If voting for same recommendation, no change needed
        if (existingVote.recommendationId === recommendationId) {
          return { alreadyVoted: true, vote: existingVote }
        }

        // Remove old vote and create new one (change vote)
        await tx.vote.delete({
          where: { id: existingVote.id }
        })
      }

      // Create new vote
      const vote = await tx.vote.create({
        data: {
          recommendationId: recommendationId,
          eventId: eventId,
          voterNickname: nickname
        }
      })

      return { alreadyVoted: false, vote }
    })

    if (result.alreadyVoted) {
      return NextResponse.json({
        success: false,
        error: 'ALREADY_VOTED'
      }, { status: 409 })
    }

    // Get updated vote summary for this recommendation
    const votes = await prisma.vote.findMany({
      where: { recommendationId: recommendationId }
    })

    const voters = votes.map(v => v.voterNickname)
    const hasCurrentUserVoted = voters.includes(nickname)

    return NextResponse.json({
      success: true,
      data: {
        voteCount: votes.length,
        voters: voters,
        hasCurrentUserVoted: hasCurrentUserVoted
      }
    })

  } catch (error) {
    console.error('Vote casting error:', error)

    return NextResponse.json({
      success: false,
      error: 'NETWORK_ERROR'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recId: string }> }
) {
  try {
    const body = await request.json()
    const validation = voteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { nickname } = validation.data
    const { id: eventId, recId: recIdParam } = await params

    // Validate recommendation ID
    let recommendationId: number
    try {
      recommendationId = recommendationIdSchema.parse(recIdParam)
    } catch {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    // Check if event exists and is in VOTING status
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
        error: 'VOTING_NOT_STARTED'
      }, { status: 403 })
    }

    // Check if voter is a participant
    const isParticipant = event.participants.some(p => p.nickname === nickname)
    if (!isParticipant) {
      return NextResponse.json({
        success: false,
        error: 'NOT_PARTICIPANT'
      }, { status: 403 })
    }

    // Find and delete the vote
    const existingVote = await prisma.vote.findFirst({
      where: {
        recommendationId: recommendationId,
        eventId: eventId,
        voterNickname: nickname
      }
    })

    if (!existingVote) {
      return NextResponse.json({
        success: false,
        error: 'EVENT_NOT_FOUND'
      }, { status: 404 })
    }

    await prisma.vote.delete({
      where: { id: existingVote.id }
    })

    // Get updated vote summary for this recommendation
    const votes = await prisma.vote.findMany({
      where: { recommendationId: recommendationId }
    })

    const voters = votes.map(v => v.voterNickname)
    const hasCurrentUserVoted = voters.includes(nickname)

    return NextResponse.json({
      success: true,
      data: {
        voteCount: votes.length,
        voters: voters,
        hasCurrentUserVoted: hasCurrentUserVoted
      }
    })

  } catch (error) {
    console.error('Vote removal error:', error)

    return NextResponse.json({
      success: false,
      error: 'NETWORK_ERROR'
    }, { status: 500 })
  }
}