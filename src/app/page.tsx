'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Plus } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useMemo } from "react"
import { localStorageUtils, dateUtils, cn } from "@/lib/utils"
import { Participant } from "@/types"

export default function HomePage() {
  const [eventCode, setEventCode] = useState('')
  const [recentEvents] = useState<{ eventId: string; type: 'created' | 'joined' }[]>(() => {
    const participationHistory = localStorageUtils.getParticipationHistory()
    return participationHistory.map(entry => ({
      eventId: entry.eventId,
      type: entry.isCreator ? 'created' as const : 'joined' as const
    }))
  })

  const handleJoinByCode = () => {
    if (eventCode.trim().length === 6) {
      // Redirect to event page using short code
      window.location.href = `/event/code/${eventCode.toUpperCase()}`
    }
  }

  const hasRecentEvents = recentEvents.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-2xl">

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-full p-4 shadow-lg">
              <MapPin className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            📍 Where2Meet
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Find the perfect place to meet up
          </p>

          {/* Main CTA */}
          <Link href="/create">
            <Button size="lg" className="mb-8 bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6">
              <Plus className="mr-2 h-5 w-5" />
              🎉 Create a new event
            </Button>
          </Link>
        </div>

        {/* Quick Join Section */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-lg text-gray-500 uppercase tracking-widest">Join with a code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter event code:
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="ABC123"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-lg tracking-widest uppercase"
                />
                <Button
                  onClick={handleJoinByCode}
                  disabled={eventCode.length !== 6}
                  className="px-6"
                >
                  Join
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        {hasRecentEvents && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📝 Your recent events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentEvents.slice(0, 5).map(({ eventId, type }) => (
                <RecentEventCard key={eventId} eventId={eventId} type={type} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500 dark:text-gray-400">
          <p>No sign-up • Real-time collaboration • AI-powered suggestions</p>
        </div>
      </div>
    </div>
  )
}

// Helper function to get status label
function getStatusLabel(status: string): string {
  const statusMap: { [key: string]: string } = {
    WAITING: 'Waiting',
    READY: 'Ready',
    VOTING: 'Voting',
    FINALIZED: 'Finalized',
    EXPIRED: 'Expired'
  }
  return statusMap[status] || status
}

// Component for recent event cards
interface RecentEventData {
  id: string
  title: string
  participants: number
  createdAt: Date
  eventTime: Date | null
  status: string
  creator: string
  expectedParticipants: number
}

function RecentEventCard({ eventId, type }: { eventId: string; type: 'created' | 'joined' }) {
  const [eventData, setEventData] = useState<RecentEventData | null>(null)
  const userNickname = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return localStorageUtils.getJoinedEventInfo(eventId)?.nickname || ''
  }, [eventId])

  const isCreatorEvent = type === 'created'

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        // Fetch event data from API
        const response = await fetch(`/api/events/${eventId}`)
        const result = await response.json()

          if (result.success && result.data) {
            const event = result.data.event
            const creatorParticipant = event.participants.find((p: Participant) => p.isCreator)
            setEventData({
              id: event.id,
              title: event.title,
              participants: event.participants.length,
              createdAt: new Date(event.createdAt),
              eventTime: event.eventTime ? new Date(event.eventTime) : null,
              status: event.status,
              creator: creatorParticipant?.nickname || 'Unknown creator',
              expectedParticipants: event.expectedParticipants
            })
          } else {
            // Fallback if event not found
            setEventData({
              id: eventId,
              title: 'This event has expired',
              participants: 0,
              createdAt: new Date(),
              eventTime: null,
              status: 'EXPIRED',
              creator: 'Unknown',
              expectedParticipants: 0
            })
          }
        } catch (error) {
          console.error('Failed to fetch event:', error)
          // Fallback on error
          setEventData({
            id: eventId,
            title: 'Failed to load event',
            participants: 0,
            createdAt: new Date(),
            eventTime: null,
            status: 'WAITING',
            creator: 'Unknown',
            expectedParticipants: 0
          })
        }
    }

    fetchEventData()
  }, [eventId])

  if (!eventData) return null

  const expectedParticipants = eventData.expectedParticipants || eventData.participants

  const cardClass = cn(
    "hover:shadow-md transition-shadow cursor-pointer border",
    isCreatorEvent
      ? "border-blue-200 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/30"
      : "border-gray-100 dark:border-gray-800"
  )

  const ownershipBadgeClass = cn(
    "text-xs px-2 py-0.5 rounded-full",
    isCreatorEvent
      ? "bg-yellow-200 text-yellow-900 dark:bg-yellow-900/60 dark:text-yellow-100"
      : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
  )

  return (
    <Link href={`/event/${eventId}`}>
      <Card className={cardClass}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {eventData.title}
                </h3>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {getStatusLabel(eventData.status)}
                </span>
                <span className={ownershipBadgeClass}>
                  {isCreatorEvent ? 'Created' : 'Joined'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Creator: {eventData.creator}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {userNickname && `Your nickname: ${userNickname} • `}
                {eventData.participants}/{expectedParticipants} participants
                {eventData.eventTime && ` • Event time: ${dateUtils.formatRelativeTime(eventData.eventTime)}`}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Created {dateUtils.formatRelativeTime(eventData.createdAt)}
              </p>
            </div>
            <div className="text-gray-400">
              →
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
