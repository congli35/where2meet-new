import { NextRequest, NextResponse } from 'next/server'
import { createEventSchema } from '@/lib/validations'
import { generateUniqueIds, dateUtils } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import { CreateEventResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = createEventSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        details: validationResult.error.issues
      }, { status: 400 })
    }

    const data = validationResult.data
    const { eventId, shortCode } = generateUniqueIds()

    // Create event in database
    const event = await prisma.event.create({
      data: {
        id: eventId,
        shortCode: shortCode,
        title: data.title,
        purpose: data.purpose,
        eventTime: data.eventTime ? new Date(data.eventTime) : null,
        specialRequirements: data.specialRequirements,
        expectedParticipants: data.expectedParticipants,
        status: 'WAITING',
        expiresAt: dateUtils.getExpiryDate(),
        participants: {
          create: {
            nickname: data.creatorNickname,
            address: data.creatorAddress,
            isCreator: true
          }
        }
      },
      include: {
        participants: true
      }
    })

    const response: CreateEventResponse = {
      event_id: event.id,
      short_code: event.shortCode,
      url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/event/${event.id}`
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Create event error:', error)

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      // Retry with new IDs
      try {
        const { eventId, shortCode } = generateUniqueIds()
        const data = createEventSchema.parse(await request.json())

        const event = await prisma.event.create({
          data: {
            id: eventId,
            shortCode: shortCode,
            title: data.title,
            purpose: data.purpose,
            eventTime: data.eventTime ? new Date(data.eventTime) : null,
            specialRequirements: data.specialRequirements,
            expectedParticipants: data.expectedParticipants,
            status: 'WAITING',
            expiresAt: dateUtils.getExpiryDate(),
            participants: {
              create: {
                nickname: data.creatorNickname,
                address: data.creatorAddress,
                isCreator: true
              }
            }
          }
        })

        const response: CreateEventResponse = {
          event_id: event.id,
          short_code: event.shortCode,
          url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/event/${event.id}`
        }

        return NextResponse.json({
          success: true,
          data: response
        })
      } catch (retryError) {
        console.error('Retry create event error:', retryError)
      }
    }

    return NextResponse.json({
      success: false,
      error: 'NETWORK_ERROR'
    }, { status: 500 })
  }
}