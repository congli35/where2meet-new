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
    const baseClasses = 'rounded-2xl border px-5 py-4 text-sm shadow-sm backdrop-blur-sm transition-all duration-300'
    switch (event.status) {
      case 'WAITING': {
        const joined = participants.length
        const target = event.expectedParticipants || 1
        const remaining = Math.max(target - joined, 0)
        const percent = Math.min((joined / target) * 100, 100)
        return (
          <div className={`${baseClasses} border-amber-200 bg-gradient-to-r from-amber-50/90 to-yellow-50/90 ring-1 ring-amber-200/50 dark:from-amber-900/20 dark:to-yellow-900/20 dark:border-amber-700/50 dark:ring-amber-700/30`}>
            <div className="flex items-center gap-3 font-semibold text-amber-900 dark:text-amber-100">
              <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/50">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-base">Waiting for participants</span>
            </div>
            <p className="mt-3 text-gray-700 dark:text-gray-200 leading-relaxed">
              <span className="font-semibold text-amber-800 dark:text-amber-200">{joined}</span> of <span className="font-semibold text-amber-800 dark:text-amber-200">{target}</span> joined. {remaining > 0 ? `Need ${remaining} more to start.` : 'Everyone is here!'}
            </p>
            <div className="mt-4 h-2.5 rounded-full bg-amber-100/50 overflow-hidden dark:bg-amber-800/30">
              <div className="h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-500 shadow-sm" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )
      }
      case 'READY': {
        if (recommendationError) {
          return (
            <div className={`${baseClasses} border-red-200 bg-gradient-to-r from-red-50/90 to-rose-50/90 ring-1 ring-red-200/50 dark:from-red-900/20 dark:to-rose-900/20 dark:border-red-700/50 dark:ring-red-700/30`}>
              <div className="flex items-center gap-3 font-semibold text-red-800 dark:text-red-100">
                <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/50">
                  <Target className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-base">Failed to generate recommendations</span>
              </div>
              <p className="mt-3 text-gray-700 dark:text-gray-200 leading-relaxed">
                {recommendationError}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {isCreator && (
                  <Button
                    size="sm"
                    onClick={handleRetryRecommendations}
                    className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Try again
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchEventData}
                  className="border-red-200 bg-white/80 hover:bg-white shadow-sm hover:shadow-md transition-all duration-200 dark:border-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                >
                  Refresh
                </Button>
              </div>
            </div>
          )
        }
        return (
          <div className={`${baseClasses} border-blue-200 bg-gradient-to-r from-blue-50/90 to-cyan-50/90 ring-1 ring-blue-200/50 dark:from-blue-900/20 dark:to-cyan-900/20 dark:border-blue-700/50 dark:ring-blue-700/30`}>
            <div className="flex items-center gap-3 font-semibold text-blue-900 dark:text-blue-100">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/50 animate-pulse">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-base">Generating recommendations</span>
            </div>
            <p className="mt-3 text-gray-700 dark:text-gray-200 leading-relaxed">
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
          <div className={`${baseClasses} border-emerald-200 bg-gradient-to-r from-emerald-50/90 to-teal-50/90 ring-1 ring-emerald-200/50 dark:from-emerald-900/20 dark:to-teal-900/20 dark:border-emerald-700/50 dark:ring-emerald-700/30`}>
            <div className="flex items-center gap-3 font-semibold text-emerald-900 dark:text-emerald-100">
              <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/50">
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-base">Voting in progress</span>
            </div>
            <p className="mt-3 text-gray-700 dark:text-gray-200 leading-relaxed">
              <span className="font-semibold text-emerald-800 dark:text-emerald-200">{totalVotes}</span> of <span className="font-semibold text-emerald-800 dark:text-emerald-200">{participantCount}</span> participants have voted{allVoted ? '. Waiting for the organizer to finalize.' : '. Pick your favorite spot!'}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2.5 flex-1 rounded-full bg-emerald-100/50 overflow-hidden dark:bg-emerald-800/30">
                <div className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500 shadow-sm" style={{ width: `${percent}%` }} />
              </div>
              {allVoted && (
                <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                  <CheckCircle className="h-4 w-4" />
                  Complete
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
            <div className={`${baseClasses} border-purple-200 bg-gradient-to-r from-purple-50/90 to-pink-50/90 ring-1 ring-purple-200/50 dark:from-purple-900/20 dark:to-pink-900/20 dark:border-purple-700/50 dark:ring-purple-700/30`}>
              <div className="flex flex-wrap items-center gap-3 font-semibold text-purple-900 dark:text-purple-100">
                <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/50">
                  <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-base">Final location confirmed</span>
                {endedAt && (
                  <span className="text-xs font-normal text-purple-700 dark:text-purple-200">
                    Confirmed on {endedAt}
                  </span>
                )}
              </div>
              <p className="mt-3 text-gray-700 dark:text-gray-200 leading-relaxed">
                Final location selected
              </p>
            </div>
          )
        }

        const voteData = getVoteDataForRecommendation(finalRecommendation.id)

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 font-semibold text-purple-900 dark:text-purple-100">
              <div className="rounded-full bg-gradient-to-r from-purple-100 to-pink-100 p-2 dark:from-purple-900/50 dark:to-pink-900/50 shadow-sm">
                <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-base">Final location confirmed</span>
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
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">

        <Card className="overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-xl ring-1 ring-black/5 dark:bg-gray-900/80 dark:ring-white/10">
          <div className="bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-purple-500/10">
            <CardHeader className="space-y-6 pb-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-300">
                    {event.title}
                  </CardTitle>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <div className="rounded-full bg-blue-100 p-1.5 dark:bg-blue-900/30">
                        <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span>Hosted by <span className="font-semibold text-gray-900 dark:text-gray-100">{participants.find(p => p.isCreator)?.nickname}</span></span>
                    </div>
                    {event.eventTime && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <div className="rounded-full bg-emerald-100 p-1.5 dark:bg-emerald-900/30">
                          <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span>{new Date(event.eventTime).toLocaleString('en-US')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100/80 px-3 py-1.5 text-sm font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        {purposeMap[event.purpose as keyof typeof purposeMap] || 'Other'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:w-auto lg:flex-col lg:items-end">
                  {userNickname && (
                    <div className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 text-sm font-medium shadow-sm ring-1 ring-green-200/50 dark:from-green-900/20 dark:to-emerald-900/20 dark:ring-green-700/30">
                      <div className="rounded-full bg-green-100 p-1.5 dark:bg-green-900/50">
                        <Users className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-green-800 dark:text-green-200">{userNickname}</span>
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                          {isCreator ? 'Event Organizer' : 'Participant'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {canJoin && (
                      <Button
                        variant="default"
                        onClick={() => setShowJoinDialog(true)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Join event
                      </Button>
                    )}
                    {event.status === 'VOTING' && isCreator && votes.length > 0 && (
                      <Button
                        variant="default"
                        onClick={handleFinalizeEvent}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Trophy className="h-4 w-4 mr-2" />
                        Finalize location
                      </Button>
                    )}
                    {event.status === 'READY' && (
                      <Button
                        variant="outline"
                        onClick={fetchEventData}
                        className="border-gray-200 bg-white/50 hover:bg-white/80 shadow-sm hover:shadow-md transition-all duration-200 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800/80"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {renderStatusSummary()}
            </CardHeader>
          </div>
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-2xl border border-dashed border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50/30 px-4 py-3.5 font-mono text-sm text-gray-700 shadow-inner dark:border-gray-700 dark:from-gray-800 dark:to-blue-900/20 dark:text-gray-200">
                {shareDisplayUrl}
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="border-gray-200 bg-white/80 hover:bg-white shadow-sm hover:shadow-md transition-all duration-200 dark:border-gray-700 dark:bg-gray-800/80 dark:hover:bg-gray-800"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy link
                </Button>
                <Button
                  onClick={handleShare}
                  variant="secondary"
                  disabled={!shareUrl}
                  className="bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 border-0 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 dark:from-gray-700 dark:to-gray-600 dark:text-gray-200 dark:hover:from-gray-600 dark:hover:to-gray-500"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 text-blue-700 ring-1 ring-blue-200/50 dark:from-blue-900/20 dark:to-indigo-900/20 dark:text-blue-300 dark:ring-blue-700/30">
                <span className="font-medium">Event code:</span>
                <span className="font-bold tracking-wider text-blue-800 dark:text-blue-200">
                  {event.shortCode}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participants */}
        <Card className="overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-xl ring-1 ring-black/5 dark:bg-gray-900/80 dark:ring-white/10">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-blue-600/5 via-indigo-600/5 to-purple-600/5 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-purple-500/10">
            <div>
              <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
                <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span>Participants</span>
              </CardTitle>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-semibold text-blue-600 dark:text-blue-400">{participants.length}</span> of <span className="font-semibold text-blue-600 dark:text-blue-400">{event.expectedParticipants}</span> joined
                {participants.length < event.expectedParticipants && (
                  <span className="text-gray-500 dark:text-gray-400"> · Need {event.expectedParticipants - participants.length} more</span>
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setParticipantListOpen(prev => !prev)}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800/50 transition-colors duration-200"
            >
              {isParticipantListOpen ? 'Hide details' : 'View details'}
              <ChevronDown
                className={`ml-2 h-4 w-4 transition-transform duration-200 ${isParticipantListOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          </CardHeader>
          {isParticipantListOpen && (
            <CardContent className="space-y-4 p-6">
              <div className="grid gap-3 md:grid-cols-2">
                {participants.map(participant => (
                  <div
                    key={participant.id}
                    className="group rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50/70 to-blue-50/30 p-4 text-sm shadow-sm hover:shadow-md transition-all duration-200 dark:border-gray-800 dark:from-gray-800/60 dark:to-blue-900/10"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                          <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {participant.nickname}
                          </p>
                          {participant.isCreator && (
                            <span className="inline-block mt-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              Organizer
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {dateUtils.formatRelativeTime(new Date(participant.joinedAt))}
                      </span>
                    </div>
                    <p className="mt-3 pl-11 text-sm text-gray-600 dark:text-gray-300">
                      {participant.address}
                    </p>
                  </div>
                ))}
              </div>

              {participants.length < event.expectedParticipants && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-r from-gray-50/50 to-blue-50/30 p-5 text-center shadow-inner dark:border-gray-700 dark:from-gray-800/50 dark:to-blue-900/20">
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Waiting for more participants... Recommendations will generate automatically once everyone joins.
                  </p>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Recommendations Section */}
        {(event.status === 'VOTING' || event.status === 'FINALIZED') && recommendations.length > 0 && (
          <Card className="overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-xl ring-1 ring-black/5 dark:bg-gray-900/80 dark:ring-white/10">
            <CardHeader className="space-y-3 bg-gradient-to-r from-purple-600/5 via-pink-600/5 to-rose-600/5 dark:from-purple-500/10 dark:via-pink-500/10 dark:to-rose-500/10">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                  <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent dark:from-gray-100 dark:to-gray-300">
                  {event.status === 'VOTING' ? 'Vote for the final spot' : 'Recommended locations'}
                </h2>
              </div>
              {event.status === 'VOTING' && (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-14">
                  Choose your favorite location. You can change your vote anytime.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4 p-6">
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
      className={`group rounded-3xl border bg-white/95 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-900/95 ${
        highlight
          ? 'ring-2 ring-purple-300 border-purple-200 dark:ring-purple-500/50 dark:border-purple-500/30'
          : 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'
      }`}
    >
      <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between bg-gradient-to-r from-gray-50/50 to-blue-50/30 rounded-t-3xl dark:from-gray-800/50 dark:to-blue-900/10">
        <div className="flex flex-1 items-center gap-4">
          <div className="rounded-full bg-blue-100 p-2.5 dark:bg-blue-900/30 shadow-sm">
            <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {recommendation.locationName}
              </p>
              {isWinner && <WinnerBadge isWinner voteCount={voteData.voteCount} />}
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium dark:bg-gray-800">
                {recommendation.locationType}
              </span>
              <span className="flex items-center gap-1">
                Suitability <span className="font-semibold text-yellow-600 dark:text-yellow-400">⭐ {recommendation.suitabilityScore}/10</span>
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 ring-1 ring-blue-200/50 dark:from-blue-900/20 dark:to-indigo-900/20 dark:ring-blue-700/30">
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              {voteData.voteCount} {voteData.voteCount === 1 ? 'vote' : 'votes'}
            </span>
          </div>
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
      <div className="border-t border-gray-100 px-5 py-5 text-sm space-y-4 dark:border-gray-800">
        <div className="rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-4 text-gray-800 dark:from-blue-900/20 dark:to-indigo-900/20 dark:text-gray-200">
          <p className="flex items-start gap-2 leading-relaxed">
            <span className="text-lg">💬</span>
            <span>{recommendation.description}</span>
          </p>
        </div>

        {recommendation.fairnessAnalysis && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-50/80 to-teal-50/80 p-4 text-emerald-900 dark:from-emerald-900/20 dark:to-teal-900/20 dark:text-emerald-100">
            <p className="flex items-start gap-2 leading-relaxed">
              <span className="text-lg">📊</span>
              <span>{recommendation.fairnessAnalysis}</span>
            </p>
          </div>
        )}

        {recommendation.distances && recommendation.distances.length > 0 && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <MapPin className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              Distances for each participant
            </p>
            <div className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
              {recommendation.distances.map((distance, idx) => {
                const participantAddress = distance.participant_address
                const destinationAddress = distance.recommendation_address || recommendation.locationName
                const transportInfo = [distance.transport, distance.time].filter(Boolean).join(' · ')
                const canOpenRoute = Boolean(participantAddress && destinationAddress)

                return (
                  <div
                    key={`${distance.participant}-${idx}`}
                    className="flex flex-col gap-3 px-4 py-3.5 text-sm bg-white/50 hover:bg-gray-50/80 transition-colors duration-200 dark:bg-gray-900/30 dark:hover:bg-gray-800/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{distance.participant}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        From: {participantAddress || 'Address unavailable'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                      <span className="text-gray-700 dark:text-gray-200 font-medium">
                        {distance.estimate}
                        {transportInfo && <span className="text-gray-500 dark:text-gray-400"> ({transportInfo})</span>}
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
                        className="border-blue-200 bg-white/80 hover:bg-blue-50 hover:border-blue-300 shadow-sm transition-all duration-200 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/40"
                      >
                        <MapPin className="mr-2 h-3.5 w-3.5" />
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
          <div className="flex flex-wrap gap-2">
            {recommendation.facilities.map((facility, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-gray-100 to-blue-100 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm dark:from-gray-800 dark:to-blue-900/30 dark:text-gray-200"
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
