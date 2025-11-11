'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn, dateUtils, localStorageUtils } from "@/lib/utils"
import { Participant } from "@/types"
import { Plus } from "lucide-react"

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: "What is Where2Meet?",
    answer:
      "Where2Meet is a lightweight planning space that lets your group propose meeting locations, compare times, and finalize a meetup without endless chats. Whether you're organizing work meetings, social gatherings, or community events, Where2Meet's AI instantly identifies fair spots that work for everyone.",
  },
  {
    question: "How does Where2Meet work from start to finish?",
    answer:
      "Creating a Where2Meet event is simple: First, you create an event with a title, purpose, and expected participants. Where2Meet generates a shareable link and 6-character code. Next, invite friends who join by adding their location—no sign-ups required. Once everyone joins, Where2Meet's AI analyzes all locations and instantly recommends fair meeting spots with distances, travel times, and nearby facilities. Finally, review the AI suggestions together and finalize your perfect meeting location. The entire process takes just minutes!",
  },
  {
    question: "Do guests need an account to use Where2Meet?",
    answer:
      "No accounts are required—friends can instantly join your Where2Meet event with a 6-character code or shareable link and add their location in seconds. Where2Meet handles everything else for you.",
  },
  {
    question: "Can Where2Meet handle multiple plans?",
    answer:
      "Yes. You can create unlimited Where2Meet events, revisit recent meeting plans, and duplicate the events that worked best. From weekly team meetups to group outings, Where2Meet scales with your needs.",
  },
  {
    question: "What happens to my data if I clear my browser cache?",
    answer:
      "Where2Meet uses browser localStorage for simplicity and speed—no account or server login needed. Your local participation history is stored on your device. If you clear your browser cache, disable cookies, open Where2Meet in private/incognito mode, or switch to a different browser, your event history will be lost.",
  },
]

export default function HomePage() {
  const [eventCode, setEventCode] = useState("")
  const [recentEvents] = useState<{ eventId: string; type: "created" | "joined" }[]>(() => {
    const participationHistory = localStorageUtils.getParticipationHistory()
    return participationHistory.map((entry) => ({
      eventId: entry.eventId,
      type: entry.isCreator ? "created" : "joined",
    }))
  })

  const handleJoinByCode = () => {
    if (eventCode.trim().length === 6) {
      window.location.href = `/event/code/${eventCode.toUpperCase()}`
    }
  }

  const hasRecentEvents = recentEvents.length > 0

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-16 px-4 py-12 text-slate-900 sm:px-6 lg:px-8">
        <Card className="animate-in fade-in slide-in-from-bottom-4 duration-700 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/60">
          <CardHeader className="space-y-8 text-center">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold leading-[1.2] md:text-6xl">
                Where2Meet
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                Where2Meet makes it effortless to choose the perfect place together.
              </p>
            </div>
            <div className="flex justify-center">
              <Button
                asChild
                size="lg"
                className="w-fit px-8 shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
              >
                <Link href="/create">
                  <Plus className="h-5 w-5" />
                  Create a Where2Meet
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 border-t border-slate-200/70 pt-8 text-center dark:border-slate-700">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold leading-[1.2]">Join with a code</h2>
              <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
                Enter the six-character Where2Meet code you received.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Input
                placeholder="Enter code"
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-lg tracking-[0.4em] transition-all duration-200 sm:w-48"
                aria-label="Event code"
              />
              <Button
                onClick={handleJoinByCode}
                disabled={eventCode.length !== 6}
                size="lg"
                className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Join
              </Button>
            </div>
          </CardContent>
        </Card>

        {hasRecentEvents && (
          <section id="recent" className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <Card className="rounded-2xl border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/60">
              <CardHeader className="space-y-3 text-center">
                <CardTitle className="text-3xl font-bold leading-[1.2] text-black dark:text-white">
                  Your recent Where2Meet plans
                </CardTitle>
                <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
                  Pick up where you left off and finalize the meetup.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {recentEvents.slice(0, 5).map(({ eventId, type }) => (
                    <RecentEventCard key={eventId} eventId={eventId} type={type} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* FAQ Section */}
        <section id="faq" className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 space-y-8 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-8 shadow-sm hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/60">
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              FAQ
            </p>
            <h2 className="text-3xl font-bold leading-[1.2]">Where2Meet answers</h2>
            <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
              The essentials people ask before sharing a Where2Meet plan.
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <Card
                key={faq.question}
                className="rounded-xl border border-slate-100 bg-white/60 transition-all duration-200 hover:scale-[1.01] hover:shadow-md hover:border-slate-200 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-slate-700"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-5 sm:p-6">
                  <h3 className="font-semibold leading-snug text-slate-900 dark:text-white">
                    {faq.question}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 border-t border-slate-200 pt-8 text-center text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <p aria-hidden="true">Where2Meet • No sign-up • Real-time collaboration • AI-powered suggestions</p>
        </footer>
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
    "hover:shadow-lg transition-all duration-200 cursor-pointer border rounded-xl hover:scale-[1.01]",
    isCreatorEvent
      ? "border-blue-200 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/30 hover:bg-blue-50/90 dark:hover:bg-blue-950/40"
      : "border-slate-100 bg-white/70 dark:border-slate-800 dark:bg-slate-900/30 hover:bg-white/80 dark:hover:bg-slate-900/40"
  )

  const ownershipBadgeClass = cn(
    "text-xs px-2.5 py-1 rounded-full font-medium",
    isCreatorEvent
      ? "bg-amber-100/80 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
      : "bg-emerald-100/80 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100"
  )

  const statusBadgeClass = cn(
    "text-xs px-2.5 py-1 rounded-full font-medium",
    "bg-blue-100/80 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100"
  )

  return (
    <Link href={`/event/${eventId}`} className="block">
      <Card className={cardClass}>
        <CardContent className="p-5 sm:p-6">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-white text-base leading-snug">
                {eventData.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={statusBadgeClass}>
                  {getStatusLabel(eventData.status)}
                </span>
                <span className={ownershipBadgeClass}>
                  {isCreatorEvent ? 'Created' : 'Joined'}
                </span>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Created by: <span className="font-medium text-slate-900 dark:text-slate-100">{eventData.creator}</span>
                </p>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {userNickname && (
                    <>
                      You: <span className="font-medium">{userNickname}</span> •{' '}
                    </>
                  )}
                  <span>{eventData.participants}/{expectedParticipants} participants</span>
                  {eventData.eventTime && ` • ${dateUtils.formatRelativeTime(eventData.eventTime)}`}
                </p>
                <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                  Created {dateUtils.formatRelativeTime(eventData.createdAt)}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-slate-300 dark:text-slate-600 text-xl font-light transition-transform duration-200 group-hover:translate-x-1">
              →
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
