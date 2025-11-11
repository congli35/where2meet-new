import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import QRCode from 'qrcode'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params

    // Verify event exists and is not expired
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        expiresAt: {
          gt: new Date()
        }
      },
      select: {
        shortCode: true,
        title: true
      }
    })

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'EVENT_NOT_FOUND'
      }, { status: 404 })
    }

    // Get the host URL from request
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'dataurl' // 'dataurl' or 'svg'

    // Create the URL that users will scan
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const shareUrl = `${protocol}://${host}/event/code/${event.shortCode}`

    let qrCodeData: string

    if (format === 'svg') {
      // Generate SVG QR code
      qrCodeData = await QRCode.toString(shareUrl, {
        type: 'svg',
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })

      return new Response(qrCodeData, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600'
        }
      })
    } else {
      // Generate data URL (base64 PNG)
      qrCodeData = await QRCode.toDataURL(shareUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          qr_code: qrCodeData,
          share_url: shareUrl,
          event_title: event.title,
          short_code: event.shortCode
        }
      })
    }

  } catch (error) {
    console.error('QR code generation error:', error)

    return NextResponse.json({
      success: false,
      error: 'NETWORK_ERROR'
    }, { status: 500 })
  }
}