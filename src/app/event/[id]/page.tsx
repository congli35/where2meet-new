'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Users, MapPin, Calendar, Share2, Copy, UserPlus, RefreshCw, Trophy } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Event, Participant, Recommendation, VoteSummary } from '@/types'
import { localStorageUtils, dateUtils } from '@/lib/utils'
import { openGoogleMapsRoute } from '@/lib/maps'
import { JoinEventDialog } from '@/components/JoinEventDialog'
import { WaitingBanner, ReadyBanner, VotingBanner, FinalizedBanner } from '@/components/StatusBanners'
import { VotingButton, WinnerBadge } from '@/components/VotingButton'

export default function EventDetailPage() {
  const params = useParams()
  const eventId = params.id as string

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [votes, setVotes] = useState<VoteSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [userNickname, setUserNickname] = useState<string | null>(null)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const isCreator = participants.find(p => p.isCreator)?.nickname === userNickname

  const fetchVotes = useCallback(async () => {
    if (!userNickname) return

    try {
      const response = await fetch(`/api/events/${eventId}/votes?nickname=${encodeURIComponent(userNickname)}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setVotes(result.data.recommendations)
        }
      }
    } catch (error) {
      console.error('Fetch votes error:', error)
    }
  }, [eventId, userNickname])

  const fetchEventData = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('This event does not exist or has expired.')
        } else {
          setError('Failed to load the event. Please try again.')
        }
        return
      }

      const result = await response.json()

      if (result.success) {
        setEvent(result.data.event)
        setParticipants(result.data.participants)
        setRecommendations(result.data.recommendations)

        // Fetch votes if event is in voting status
        if (result.data.event.status === 'VOTING') {
          await fetchVotes()
        }
      } else {
        setError(result.error || 'Failed to load the event.')
      }
    } catch (error) {
      console.error('Fetch event error:', error)
      setError('Network error. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }, [eventId, fetchVotes])

  useEffect(() => {
    if (!eventId) return

    const initializeEventData = async () => {
      await fetchEventData()
      localStorageUtils.updateRecentView(eventId)
      // Check if user has already joined this event
      const joined = localStorageUtils.hasJoinedEvent(eventId)
      setHasJoined(joined)

      // Get user nickname if they've joined
      if (joined) {
        const joinInfo = localStorageUtils.getJoinedEventInfo(eventId)
        setUserNickname(joinInfo?.nickname || null)
      }
    }

    initializeEventData()
  }, [eventId, fetchEventData])

  // Poll for status changes and vote updates
  useEffect(() => {
    if (!event) return

    // Reset error when status changes
    if (event.status !== 'READY') {
      setRecommendationError(null)
    }

    // Different polling strategies based on status
    let pollInterval: NodeJS.Timeout

    if (event.status === 'READY') {
      // Poll more frequently when waiting for recommendations
      pollInterval = setInterval(() => {
        fetchEventData()
      }, 10000) // Every 3 seconds
    } else if (event.status === 'VOTING') {
      // Poll for vote updates
      pollInterval = setInterval(() => {
        fetchVotes()
      }, 5000) // Every 5 seconds
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [event, fetchEventData, fetchVotes])

  const handleVoteChange = () => {
    // Refresh vote data
    fetchVotes()
  }

  const handleRetryRecommendations = async () => {
    if (!isCreator || !userNickname) {
      toast.error('Only the event organizer can regenerate recommendations.')
      return
    }

    try {
      setRecommendationError(null)

      const response = await fetch(`/api/events/${eventId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          creatorNickname: userNickname
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('New recommendations generated!')
        // Refresh event data to show new status and recommendations
        await fetchEventData()
      } else {
        if (result.error === 'LLM_ERROR') {
          setRecommendationError('We could not generate new recommendations. The AI service is temporarily unavailable, please try again later.')
          toast.error('The AI service is temporarily unavailable. Please try again later.')
        } else {
          setRecommendationError('Retry failed. Please refresh the page or try again.')
          toast.error('Retry failed. Please try again.')
        }
      }
    } catch (error) {
      console.error('Retry recommendations error:', error)
      setRecommendationError('Network error. Please check your connection.')
      toast.error('Network error. Please check your connection.')
    }
  }

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/event/${eventId}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied!')
    } catch (error) {
      console.error('Clipboard API failed, falling back:', error)
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      toast.success('Link copied!')
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: event?.title || 'Where2Meet event',
      text: `${event?.title}: find the perfect place for everyone to meet`,
      url: `${window.location.origin}/event/${eventId}`
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        console.error('Share failed, falling back to copy link:', error)
        // User cancelled or error occurred
        handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
  }

  const handleJoinSuccess = () => {
    // Refresh event data to show new participant
    fetchEventData()
    // Update local state
    setHasJoined(true)
    // Get user's nickname
    const joinInfo = localStorageUtils.getJoinedEventInfo(eventId)
    setUserNickname(joinInfo?.nickname || null)
  }

  const handleFinalizeEvent = async () => {
    if (!userNickname || !event) return

    // Find the recommendation with most votes
    const winnerRecommendation = votes.reduce((max, current) =>
      current.voteCount > max.voteCount ? current : max
    )

    if (winnerRecommendation.voteCount === 0) {
      toast.error('No votes yet, so we cannot finalize a location.')
      return
    }

    try {
      const response = await fetch(`/api/events/${eventId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          finalLocationId: winnerRecommendation.recommendationId,
          creatorNickname: userNickname
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Final location confirmed!')
        fetchEventData() // Refresh to show finalized status
      } else {
        toast.error(result.error || 'Action failed. Please try again.')
      }
    } catch (error) {
      console.error('Finalize event error:', error)
      toast.error('Network error. Please try again.')
    }
  }

  const canJoin = event?.status === 'WAITING' && !hasJoined

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-red-600 mb-4">{error}</p>
            <Link href="/">
              <Button>Back to home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event) return null

  const purposeMap = {
    dining: '🍽️ Group meal',
    coffee: '☕ Coffee chat',
    meeting: '💼 Meeting',
    other: '🎯 Something else'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to home
            </Button>
          </Link>
          <div className="flex gap-2">
            {canJoin && (
              <Button variant="default" onClick={() => setShowJoinDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Join event
              </Button>
            )}
            {event.status === 'VOTING' && isCreator && votes.length > 0 && (
              <Button variant="default" onClick={handleFinalizeEvent}>
                <Trophy className="h-4 w-4 mr-2" />
                Finalize location
              </Button>
            )}
            {event.status === 'READY' && (
              <Button variant="outline" onClick={fetchEventData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {userNickname && (
          <Card className="mb-8 border border-dashed border-blue-200 dark:border-blue-900/40 bg-white/80 dark:bg-gray-800/70">
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your status</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{userNickname}</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200 px-3 py-1 text-xs font-medium">
                {isCreator ? 'Organizer' : 'Participant'}
              </span>
            </CardContent>
          </Card>
        )}

        {/* Event Info */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">
                  📍 {event.title}
                </CardTitle>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <p className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Hosted by {participants.find(p => p.isCreator)?.nickname}
                  </p>
                  {event.eventTime && (
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(event.eventTime).toLocaleString('en-US')}
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {purposeMap[event.purpose as keyof typeof purposeMap] || 'Other'}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Share Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Invite more friends:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded p-3 font-mono text-sm">
                {window.location.origin}/event/{eventId}
              </div>
              <Button onClick={handleCopyLink} variant="outline">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-center text-sm text-gray-600 dark:text-gray-300">
              Event code: <span className="font-bold text-lg tracking-wider">{event.shortCode}</span>
            </div>
          </CardContent>
        </Card>

        {/* Status Banner */}
        {(() => {
          switch (event.status) {
            case 'WAITING':
              return <WaitingBanner event={event} participants={participants} />
            case 'READY':
              return (
                <ReadyBanner
                  error={recommendationError}
                  canRetry={isCreator}
                  onRetry={isCreator ? handleRetryRecommendations : undefined}
                />
              )
            case 'VOTING':
              const totalVotes = votes.reduce((sum, v) => sum + v.voteCount, 0)
              return (
                <VotingBanner
                  totalVotes={totalVotes}
                  participantCount={participants.length}
                />
              )
            case 'FINALIZED':
              return (
                <FinalizedBanner
                  finalLocation={event.finalLocation}
                  votingEndedAt={event.votingEndedAt ? new Date(event.votingEndedAt) : undefined}
                />
              )
            default:
              return null
          }
        })()}

        {/* Participants */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Joined {participants.length}/{event.expectedParticipants} participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {participants.map(participant => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="font-medium">
                      {participant.nickname}
                      {participant.isCreator && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                          Organizer
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {participant.address}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {dateUtils.formatRelativeTime(new Date(participant.joinedAt))}
                  </div>
                </div>
              ))}

              {participants.length < event.expectedParticipants && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Waiting for more participants...</p>
                  <p className="text-sm mt-2">
                    Need {event.expectedParticipants - participants.length} more people. Recommendations will generate automatically once everyone joins.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations Section */}
        {(event.status === 'VOTING' || event.status === 'FINALIZED') && recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {event.status === 'VOTING' ? '🗳️ Vote for the final spot' : '🏆 Recommended locations'}
                {event.status === 'VOTING' && (
                  <span className="text-sm font-normal text-gray-600">
                    Vote for your favorite location
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recommendations.map((rec, index) => {
                  // Get vote data for this recommendation
                  const voteData = votes.find(v => v.recommendationId === rec.id) || {
                    voteCount: 0,
                    voters: [],
                    hasCurrentUserVoted: false
                  }

                  // Check if this is the winner (most votes)
                  const maxVotes = Math.max(...votes.map(v => v.voteCount), 0)
                  const isWinner = voteData.voteCount > 0 && voteData.voteCount === maxVotes

                  return (
                    <RecommendationCard
                      key={rec.id}
                      recommendation={rec}
                      rank={index + 1}
                      voteData={voteData}
                      isWinner={isWinner}
                      showVoting={event.status === 'VOTING'}
                      userNickname={userNickname}
                      eventId={eventId}
                      onVoteChange={handleVoteChange}
                    />
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Join Event Dialog */}
        <JoinEventDialog
          open={showJoinDialog}
          onOpenChange={setShowJoinDialog}
          eventId={eventId}
          onSuccess={handleJoinSuccess}
        />
      </div>
    </div>
  )
}

function RecommendationCard({
  recommendation,
  rank,
  voteData,
  isWinner,
  showVoting,
  userNickname,
  eventId,
  onVoteChange
}: {
  recommendation: Recommendation
  rank: number
  voteData?: { voteCount: number; voters: string[]; hasCurrentUserVoted: boolean }
  isWinner?: boolean
  showVoting?: boolean
  userNickname?: string | null
  eventId?: string
  onVoteChange?: () => void
}) {
  const rankEmojis = ['🏆', '🥈', '🥉']
  const rankEmoji = rankEmojis[rank - 1] || '📍'

  return (
    <Card className={`border-l-4 ${isWinner ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' : 'border-l-blue-500'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {rankEmoji} Recommendation #{rank}
            <span className="text-lg font-semibold">{recommendation.locationName}</span>
            {isWinner && <WinnerBadge isWinner={true} voteCount={voteData?.voteCount || 0} />}
          </div>

          {showVoting && userNickname && eventId && onVoteChange && (
            <VotingButton
              recommendationId={recommendation.id}
              eventId={eventId}
              voteCount={voteData?.voteCount || 0}
              voters={voteData?.voters || []}
              hasVoted={voteData?.hasCurrentUserVoted || false}
              userNickname={userNickname}
              onVoteChange={onVoteChange}
            />
          )}
        </div>

        <div className="text-sm text-gray-600">
          {recommendation.locationType} • Suitability: ⭐ {recommendation.suitabilityScore}/10
          {voteData && voteData.voteCount > 0 && (
            <span className="ml-2">• {voteData.voteCount} votes</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          💬 {recommendation.description}
        </p>

        {recommendation.fairnessAnalysis && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              📊 {recommendation.fairnessAnalysis}
            </p>
          </div>
        )}

        {recommendation.distances && recommendation.distances.length > 0 && (
          <div>
            <p className="font-medium mb-2">Distances for each participant:</p>
            <div className="space-y-3">
              {recommendation.distances.map((distance, idx) => {
                const participantAddress = distance.participant_address
                const destinationAddress = distance.recommendation_address || recommendation.locationName
                const transportInfo = [distance.transport, distance.time].filter(Boolean).join(' | ')
                const canOpenRoute = Boolean(participantAddress && destinationAddress)
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      <p>
                        • {distance.participant}: {distance.estimate}
                        {transportInfo && <> ({transportInfo})</>}
                      </p>
                      {participantAddress && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          From: {participantAddress}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canOpenRoute}
                      onClick={() => {
                        if (canOpenRoute && participantAddress && destinationAddress) {
                          openGoogleMapsRoute(participantAddress, destinationAddress)
                        }
                      }}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      View route
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {recommendation.facilities && recommendation.facilities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recommendation.facilities.map((facility, idx) => (
              <span
                key={idx}
                className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
              >
                {facility}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
