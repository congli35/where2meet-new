'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function EventCodePage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const shortCode = params.shortCode as string

  useEffect(() => {
    const findEvent = async () => {
      try {
        const response = await fetch(`/api/events/code/${shortCode.toUpperCase()}`)
        const result = await response.json()

        if (result.success) {
          // Redirect to the actual event page
          router.push(`/event/${result.data.event_id}`)
        } else {
          if (result.error === 'EVENT_NOT_FOUND') {
            setError('This event does not exist or has expired.')
          } else {
            setError('Network error. Please try again.')
          }
        }
      } catch (error) {
        console.error('Find event error:', error)
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (shortCode) {
      findEvent()
    }
  }, [shortCode, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Looking up the event...</h2>
          <p className="text-gray-600">Verifying event code {shortCode}</p>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h2 className="text-lg font-semibold mb-2">Event not found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-2">
            <Button
              onClick={() => router.push('/')}
              className="w-full"
            >
              Back to home
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Try again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return null
}
