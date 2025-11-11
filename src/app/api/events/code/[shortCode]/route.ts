import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params
    const normalizedCode = shortCode.toUpperCase()

    // Find event by short code
    const event = await prisma.event.findUnique({
      where: {
        shortCode: normalizedCode,
        expiresAt: {
          gt: new Date() // Only return non-expired events
        }
      },
      select: {
        id: true,
        title: true,
        shortCode: true
      }
    })

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'EVENT_NOT_FOUND'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        event_id: event.id,
        title: event.title,
        short_code: event.shortCode
      }
    })

  } catch (error) {
    console.error('Find event by code error:', error)

    return NextResponse.json({
      success: false,
      error: 'NETWORK_ERROR'
    }, { status: 500 })
  }
}