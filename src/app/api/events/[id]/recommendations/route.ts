import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params

    // Get existing recommendations
    const recommendations = await prisma.recommendation.findMany({
      where: {
        eventId: eventId,
        event: {
          expiresAt: {
            gt: new Date()
          }
        }
      },
      orderBy: {
        rank: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        recommendations: recommendations.map(rec => ({
          id: rec.id,
          location_name: rec.locationName,
          location_type: rec.locationType,
          description: rec.description,
          fairness_analysis: rec.fairnessAnalysis,
          suitability_score: rec.suitabilityScore,
          rank: rec.rank,
          facilities: rec.facilities,
          distances: rec.distances,
          generated_at: rec.generatedAt
        }))
      }
    })

  } catch (error) {
    console.error('Get recommendations error:', error)

    return NextResponse.json({
      success: false,
      error: 'NETWORK_ERROR'
    }, { status: 500 })
  }
}
