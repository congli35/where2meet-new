'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Heart, Users, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface VotingButtonProps {
  recommendationId: number
  eventId: string
  voteCount: number
  voters: string[]
  hasVoted: boolean
  userNickname: string | null
  disabled?: boolean
  onVoteChange: () => void
}

export function VotingButton({
  recommendationId,
  eventId,
  voteCount,
  voters,
  hasVoted,
  userNickname,
  disabled = false,
  onVoteChange
}: VotingButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleVote = async () => {
    if (!userNickname || disabled) return

    setIsLoading(true)

    try {
      const method = hasVoted ? 'DELETE' : 'POST'
      const response = await fetch(`/api/events/${eventId}/recommendations/${recommendationId}/vote`, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nickname: userNickname })
      })

      const result = await response.json()

      if (result.success) {
        onVoteChange()
        toast.success(hasVoted ? 'Vote removed.' : 'Vote submitted!')
      } else {
        if (result.error === 'ALREADY_VOTED') {
          toast.error('You already voted for a different recommendation.')
        } else {
          toast.error('The action could not be completed. Please try again.')
        }
      }
    } catch (error) {
      console.error('Vote error:', error)
      toast.error('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const VoterTooltip = () => {
    if (voters.length === 0) return null

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-sm text-gray-600 cursor-help">
              <Users className="h-3 w-3" />
              <span>{voteCount}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p className="font-medium mb-1">Votes:</p>
              <p className="text-sm">
                {voters.join(', ')}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Only show voting button if user has joined the event
  if (!userNickname) return null

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleVote}
        disabled={isLoading || disabled}
        variant={hasVoted ? "default" : "outline"}
        size="sm"
        className={cn(
          "flex items-center gap-2 transition-all",
          hasVoted && "bg-red-500 hover:bg-red-600 text-white"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart
            className={cn(
              "h-4 w-4 transition-all",
              hasVoted && "fill-current"
            )}
          />
        )}
        {hasVoted ? 'Voted' : 'Vote'}
      </Button>

      {voteCount > 0 && <VoterTooltip />}

      {/* Winner badge for highest voted recommendation */}
      {voteCount > 0 && (
        <div className="flex items-center gap-1 text-sm">
          <span className="text-gray-500">
            {voteCount} votes
          </span>
        </div>
      )}
    </div>
  )
}

interface WinnerBadgeProps {
  isWinner: boolean
  voteCount: number
}

export function WinnerBadge({ isWinner, voteCount }: WinnerBadgeProps) {
  if (!isWinner || voteCount === 0) return null

  return (
    <div className="inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full text-sm font-medium">
      🎯 Crowd favorite
    </div>
  )
}
