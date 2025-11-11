'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Users, CheckCircle, Trophy, Target, MapPin } from "lucide-react"
import { Event, Participant, Recommendation } from '@/types'
import { openGoogleMapsRoute } from '@/lib/maps'

interface StatusBannerProps {
  event: Event
  participants: Participant[]
}

export function WaitingBanner({ event, participants }: StatusBannerProps) {
  const progress = participants.length
  const target = event.expectedParticipants

  return (
    <Card className="border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <Clock className="h-5 w-5" />
          ⏳ Waiting for participants
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">
              Joined: {progress}/{target} people
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Need {target - progress} more
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(progress / target) * 100}%` }}
            />
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            Once the group is complete we will generate recommendations and open voting automatically.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

interface ReadyBannerProps {
  error?: string | null
  canRetry?: boolean
  onRetry?: () => void
}

export function ReadyBanner({ error, canRetry = false, onRetry }: ReadyBannerProps) {
  if (error) {
    // Error state - show retry option
    return (
      <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
          <Target className="h-5 w-5" />
          ⚠️ Failed to generate recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-red-700 dark:text-red-300">
              {error}
            </p>
            <div className="flex flex-wrap gap-3">
              {canRetry && onRetry && (
                <Button
                  onClick={onRetry}
                  variant="default"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  Try again
                </Button>
              )}
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                Refresh page
              </Button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {canRetry
                ? 'If the issue persists, wait a moment or refresh the page.'
                : 'Only the event creator can regenerate recommendations. Contact them if you need help.'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Normal loading state
  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
          <Target className="h-5 w-5 animate-pulse" />
          🎯 Everyone is in, generating recommendations...
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="text-blue-700 dark:text-blue-300">
            The AI is analyzing everyone's locations to pick the fairest meeting spots. Hang tight!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

interface VotingBannerProps {
  totalVotes: number
  participantCount: number
}

export function VotingBanner({ totalVotes, participantCount }: VotingBannerProps) {
  const progress = totalVotes
  const target = participantCount
  const allVoted = progress === target

  return (
    <Card className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
          <Users className="h-5 w-5" />
          🗳️ Voting in progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">
              Vote progress: {progress}/{target} people
            </span>
            {allVoted && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Everyone has voted
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(progress / target) * 100}%` }}
            />
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            {allVoted
              ? 'All votes are in. Waiting for the organizer to confirm the final location.'
              : 'Vote for the location you like best - you can change your choice anytime.'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

interface FinalizedBannerProps {
  finalLocation?: Recommendation | null
  votingEndedAt?: Date | string | null
}

export function FinalizedBanner({ finalLocation, votingEndedAt }: FinalizedBannerProps) {
  const hasLocationDetails = Boolean(finalLocation)
  const locationName = finalLocation?.locationName || 'Final location details are unavailable'
  const destinationAddress = finalLocation?.distances?.[0]?.recommendation_address || locationName
  const formattedVotingEndedAt = votingEndedAt
    ? new Date(votingEndedAt).toLocaleString('en-US')
    : 'Time to be confirmed'
  const distances = finalLocation?.distances

  return (
    <Card className="border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
          <Trophy className="h-5 w-5" />
          🎉 Final location confirmed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
            <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100">
              📍 {locationName}
            </h3>
            {finalLocation?.locationType && (
              <p className="text-sm text-purple-700 dark:text-purple-300">
                {finalLocation.locationType}
              </p>
            )}
            {finalLocation?.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                {finalLocation.description}
              </p>
            )}
            {!hasLocationDetails && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                Full details are not available right now. Please try again later or contact the organizer.
              </p>
            )}
          </div>

          {distances && distances.length > 0 && (
            <div className="rounded-lg border border-dashed border-purple-200 dark:border-purple-700 bg-white/80 dark:bg-gray-900/40 p-4 space-y-3">
              <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                🚗 Suggested routes
              </p>
              <div className="space-y-3">
                {distances.map((distance, idx) => {
                  const participantAddress = distance.participant_address
                  const finalDestination = distance.recommendation_address || destinationAddress
                  const transportInfo = [distance.transport, distance.time].filter(Boolean).join(' | ')
                  const canOpenRoute = Boolean(participantAddress && finalDestination)

                  return (
                    <div
                      key={idx}
                      className="flex flex-col gap-3 rounded-md bg-purple-50 dark:bg-purple-900/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="text-sm text-purple-900 dark:text-purple-100 space-y-1">
                        <p>
                          • {distance.participant}: {distance.estimate}
                          {transportInfo && <> ({transportInfo})</>}
                        </p>
                        {participantAddress && (
                          <p className="text-xs text-purple-700 dark:text-purple-200">
                            From: {participantAddress}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canOpenRoute}
                        onClick={() => {
                          if (canOpenRoute && participantAddress && finalDestination) {
                            openGoogleMapsRoute(participantAddress, finalDestination)
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

          <p className="text-sm text-gray-600 dark:text-gray-300">
            Confirmed on {formattedVotingEndedAt}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
