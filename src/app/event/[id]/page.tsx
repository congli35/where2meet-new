'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MapPin, Calendar, Share2, Copy, UserPlus, RefreshCw, Trophy, ChevronDown, Clock, CheckCircle, Target } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Event, Participant, Recommendation, VoteSummary } from '@/types'
import { localStorageUtils, dateUtils } from '@/lib/utils'
import { openGoogleMapsRoute } from '@/lib/maps'
import { JoinEventDialog } from '@/components/JoinEventDialog'
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
  const [shareUrl, setShareUrl] = useState('')
  const [isParticipantListOpen, setParticipantListOpen] = useState(false)
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/event/${eventId}`)
    }
  }, [eventId])

  useEffect(() => {
    if (participants.length > 0 && participants.length <= 4) {
      setParticipantListOpen(true)
    }
  }, [participants.length])

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
    const url = shareUrl || (typeof window !== 'undefined' ? `${window.location.origin}/event/${eventId}` : '')
    if (!url) return
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
    const url = shareUrl || (typeof window !== 'undefined' ? `${window.location.origin}/event/${eventId}` : '')
    if (!url) {
      handleCopyLink()
      return
    }
    const shareData = {
      title: event?.title || 'Where2Meet event',
      text: `${event?.title}: find the perfect place for everyone to meet`,
      url
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

  const totalVotes = votes.reduce((sum, v) => sum + v.voteCount, 0)
  const shareDisplayUrl = shareUrl || `where2meet.com/event/${eventId}`

  const getVoteDataForRecommendation = (recommendationId: number): RecommendationVoteData => {
    const summary = votes.find(v => v.recommendationId === recommendationId)
    if (!summary) {
      return {
        voteCount: 0,
        voters: [],
        hasCurrentUserVoted: false
      }
    }
    return summary
  }

  const renderStatusSummary = () => {
    const baseClasses = 'rounded-2xl border px-4 py-3 text-sm shadow-sm'
    switch (event.status) {
      case 'WAITING': {
        const joined = participants.length
        const target = event.expectedParticipants || 1
        const remaining = Math.max(target - joined, 0)
        const percent = Math.min((joined / target) * 100, 100)
        return (
          <div className={`${baseClasses} border-yellow-200 bg-yellow-50/80 dark:bg-yellow-900/20`}>
            <div className="flex items-center gap-2 font-semibold text-yellow-900 dark:text-yellow-100">
              <Clock className="h-4 w-4" />
              Waiting for participants
            </div>
            <p className="mt-2 text-gray-700 dark:text-gray-200">
              Joined {joined}/{target}. {remaining > 0 ? `Need ${remaining} more to start.` : 'Everyone is here!'}
            </p>
            <div className="mt-3 h-2 rounded-full bg-yellow-100 dark:bg-yellow-800/40">
              <div className="h-2 rounded-full bg-yellow-500 transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )
      }
      case 'READY': {
        if (recommendationError) {
          return (
            <div className={`${baseClasses} border-red-200 bg-red-50/80 dark:bg-red-900/20`}>
              <div className="flex items-center gap-2 font-semibold text-red-800 dark:text-red-100">
                <Target className="h-4 w-4" />
                Failed to generate recommendations
              </div>
              <p className="mt-2 text-gray-700 dark:text-gray-200">
                {recommendationError}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {isCreator && (
                  <Button size="sm" onClick={handleRetryRecommendations}>
                    Try again
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={fetchEventData}>
                  Refresh
                </Button>
              </div>
            </div>
          )
        }
        return (
          <div className={`${baseClasses} border-blue-200 bg-blue-50/80 dark:bg-blue-900/20`}>
            <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Generating recommendations
            </div>
            <p className="mt-2 text-gray-700 dark:text-gray-200">
              We&apos;re analyzing everyone&apos;s locations to suggest the fairest spots. Hang tight!
            </p>
          </div>
        )
      }
      case 'VOTING': {
        const participantCount = participants.length || 1
        const percent = Math.min((totalVotes / participantCount) * 100, 100)
        const allVoted = participantCount > 0 && totalVotes >= participantCount
        return (
          <div className={`${baseClasses} border-green-200 bg-green-50/80 dark:bg-green-900/20`}>
            <div className="flex items-center gap-2 font-semibold text-green-900 dark:text-green-100">
              <Users className="h-4 w-4" />
              Voting in progress
            </div>
            <p className="mt-2 text-gray-700 dark:text-gray-200">
              {totalVotes}/{participantCount} participants have voted{allVoted ? '. Waiting for the organizer to finalize.' : '. Pick your favorite spot!'}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-green-100 dark:bg-green-800/40">
                <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${percent}%` }} />
              </div>
              {allVoted && (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-200">
                  <CheckCircle className="h-4 w-4" />
                  All votes in
                </span>
              )}
            </div>
          </div>
        )
      }
      case 'FINALIZED': {
        const endedAt = event.votingEndedAt ? new Date(event.votingEndedAt).toLocaleString('en-US') : null
        const finalRecommendation =
          recommendations.find(rec => rec.id === event.finalLocationId) ||
          event.finalLocation ||
          recommendations[0]

        if (!finalRecommendation) {
          return (
            <div className={`${baseClasses} border-purple-200 bg-purple-50/80 dark:bg-purple-900/20`}>
              <div className="flex flex-wrap items-center gap-2 font-semibold text-purple-900 dark:text-purple-100">
                <Trophy className="h-4 w-4" />
                <span>Final location confirmed</span>
                {endedAt && (
                  <span className="text-xs font-normal text-purple-700 dark:text-purple-200">
                    Confirmed on {endedAt}
                  </span>
                )}
              </div>
              <p className="mt-2 text-gray-700 dark:text-gray-200">
                Final location selected
              </p>
            </div>
          )
        }

        const voteData = getVoteDataForRecommendation(finalRecommendation.id)

        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 font-semibold text-purple-900 dark:text-purple-100">
              <Trophy className="h-4 w-4" />
              <span>Final location confirmed</span>
              {endedAt && (
                <span className="text-xs font-normal text-purple-700 dark:text-purple-200">
                  Confirmed on {endedAt}
                </span>
              )}
            </div>
            <RecommendationCard
              recommendation={finalRecommendation}
              voteData={voteData}
              isWinner
              showVotingButton={false}
              eventId={eventId}
              userNickname={userNickname}
              onVoteChange={handleVoteChange}
              highlight
            />
          </div>
        )
      }
      default:
        return null
    }
  }

  return (
    <div>
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">

        <Card className="bg-white/95 text-gray-900 shadow-2xl dark:bg-gray-900/90 dark:text-gray-100">
          <CardHeader className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div> 
                <CardTitle className="text-3xl">
                  {event.title}
                </CardTitle>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <p className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    Hosted by {participants.find(p => p.isCreator)?.nickname}
                  </p>
                  {event.eventTime && (
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      {new Date(event.eventTime).toLocaleString('en-US')}
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    {purposeMap[event.purpose as keyof typeof purposeMap] || 'Other'}
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:w-auto lg:flex-col lg:items-end">
                {userNickname && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-green-100/80 px-4 py-2 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-100">
                    <Users className="h-4 w-4" />
                    <span className="font-bold">{userNickname}</span>
                    <span className="text-xs font-semibold tracking-wide">
                      {isCreator ? 'You are Organizer' : 'You are Participant'}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
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
                </div>
              </div>
            </div>

            {renderStatusSummary()}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100">
                {shareDisplayUrl}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCopyLink} variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy link
                </Button>
                <Button onClick={handleShare} variant="secondary" disabled={!shareUrl}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span>
                Event code:{' '}
                <span className="font-semibold tracking-wider text-gray-900 dark:text-gray-100">
                  {event.shortCode}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Participants */}
        <Card className="bg-white/95 shadow-xl dark:bg-gray-900/90">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Users className="h-5 w-5" />
                Participants
              </CardTitle>
              <p className="text-sm text-gray-500">
                Joined {participants.length}/{event.expectedParticipants}{' '}
                {participants.length < event.expectedParticipants && `· Need ${event.expectedParticipants - participants.length} more`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setParticipantListOpen(prev => !prev)}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-300"
            >
              {isParticipantListOpen ? 'Hide details' : 'View details'}
              <ChevronDown
                className={`ml-1 h-4 w-4 transition-transform ${isParticipantListOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          </CardHeader>
          {isParticipantListOpen && (
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-3 md:grid-cols-2">
                {participants.map(participant => (
                  <div
                    key={participant.id}
                    className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">
                        {participant.nickname}
                        {participant.isCreator && (
                          <span className="ml-2 text-xs font-medium text-blue-600 dark:text-blue-300">
                            Organizer
                          </span>
                        )}
                      </p>
                      <span className="text-xs text-gray-500">
                        {dateUtils.formatRelativeTime(new Date(participant.joinedAt))}
                      </span>
                    </div>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">
                      {participant.address}
                    </p>
                  </div>
                ))}
              </div>

              {participants.length < event.expectedParticipants && (
                <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                  Waiting for more participants... Recommendations will generate automatically once everyone joins.
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Recommendations Section */}
        {(event.status === 'VOTING' || event.status === 'FINALIZED') && recommendations.length > 0 && (
          <Card className="bg-white/95 text-gray-900 shadow-2xl dark:bg-gray-900/90 dark:text-gray-100">
            <CardHeader className="space-y-2">
              <h2 className="text-2xl font-semibold">
                {event.status === 'VOTING' ? '🗳️ Vote for the final spot' : 'Recommended locations'}
              </h2>
              {event.status === 'VOTING' && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Choose your favorite location. You can change your vote anytime.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendations.map(rec => {
                const voteData = getVoteDataForRecommendation(rec.id)
                const maxVotes = Math.max(...votes.map(v => v.voteCount), 0)
                const isWinner = voteData.voteCount > 0 && voteData.voteCount === maxVotes
                return (
                  <RecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    voteData={voteData}
                    isWinner={isWinner}
                    showVotingButton={event.status === 'VOTING' && Boolean(userNickname)}
                    eventId={eventId}
                    userNickname={userNickname}
                    onVoteChange={handleVoteChange}
                  />
                )
              })}
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

interface RecommendationVoteData {
  voteCount: number
  voters: string[]
  hasCurrentUserVoted: boolean
}

interface RecommendationCardProps {
  recommendation: Recommendation
  voteData: RecommendationVoteData
  isWinner: boolean
  showVotingButton?: boolean
  eventId?: string
  userNickname?: string | null
  onVoteChange?: () => void
  highlight?: boolean
}

function RecommendationCard({
  recommendation,
  voteData,
  isWinner,
  showVotingButton = false,
  eventId,
  userNickname,
  onVoteChange,
  highlight = false
}: RecommendationCardProps) {
  const shouldShowVotingButton = Boolean(showVotingButton && userNickname && eventId && onVoteChange)

  return (
    <div
      className={`rounded-3xl border bg-white/95 text-gray-900 shadow-lg transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:bg-gray-900/90 dark:text-gray-100 ${
        highlight ? 'ring-2 ring-violet-200 dark:ring-violet-500/40' : ''
      }`}
    >
      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div>
            <p className="text-lg font-semibold flex flex-wrap items-center gap-5">
              {recommendation.locationName}
              {isWinner && <WinnerBadge isWinner voteCount={voteData.voteCount} />}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {recommendation.locationType} · Suitability ⭐ {recommendation.suitabilityScore}/10
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {voteData.voteCount} votes
          </span>
          {shouldShowVotingButton && userNickname && eventId && onVoteChange && (
            <VotingButton
              recommendationId={recommendation.id}
              eventId={eventId}
              voteCount={voteData.voteCount}
              voters={voteData.voters}
              hasVoted={voteData.hasCurrentUserVoted}
              userNickname={userNickname}
              onVoteChange={onVoteChange}
            />
          )}
        </div>
      </div>
      <div className="border-t border-gray-100 px-4 py-4 text-sm dark:border-gray-800">
        <p className="text-gray-700 dark:text-gray-200">💬 {recommendation.description}</p>

        {recommendation.fairnessAnalysis && (
          <div className="mt-4 rounded-2xl bg-blue-50/80 p-3 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100">
            📊 {recommendation.fairnessAnalysis}
          </div>
        )}

        {recommendation.distances && recommendation.distances.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Distances for each participant
            </p>
            <div className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-dashed border-gray-200 dark:divide-gray-800 dark:border-gray-700">
              {recommendation.distances.map((distance, idx) => {
                const participantAddress = distance.participant_address
                const destinationAddress = distance.recommendation_address || recommendation.locationName
                const transportInfo = [distance.transport, distance.time].filter(Boolean).join(' · ')
                const canOpenRoute = Boolean(participantAddress && destinationAddress)

                return (
                  <div
                    key={`${distance.participant}-${idx}`}
                    className="flex flex-col gap-3 px-3 py-3 text-sm text-gray-700 dark:text-gray-200 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{distance.participant}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        From: {participantAddress || 'Address unavailable'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                      <span>
                        {distance.estimate}
                        {transportInfo && ` (${transportInfo})`}
                      </span>
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
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {recommendation.facilities && recommendation.facilities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {recommendation.facilities.map((facility, idx) => (
              <span
                key={idx}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {facility}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
