import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Check environment variables
    const dbUrl = process.env.DATABASE_URL
    const maskedUrl = dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'NOT_SET'

    console.log('DATABASE_URL:', maskedUrl)
    console.log('All env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE')))

    // Test database connection
    const eventCount = await prisma.event.count()

    return NextResponse.json({
      success: true,
      data: {
        message: 'API is working!',
        database_connected: true,
        event_count: eventCount,
        database_url: maskedUrl,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Health check error:', error)

    const dbUrl = process.env.DATABASE_URL
    const maskedUrl = dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'NOT_SET'

    return NextResponse.json({
      success: false,
      data: {
        message: 'Database connection failed',
        database_connected: false,
        database_url: maskedUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 })
  }
}