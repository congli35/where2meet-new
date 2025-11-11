'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, ArrowLeft, Clock } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { createEventSchema, type CreateEventInput } from '@/lib/validations'
import { localStorageUtils } from '@/lib/utils'

export default function CreateEventPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<CreateEventInput>({
    title: '',
    creatorNickname: '',
    creatorAddress: '',
    purpose: 'dining',
    eventTime: '',
    specialRequirements: '',
    expectedParticipants: 5
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof CreateEventInput, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Your device does not support location sharing.')
      return
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      })

      const { latitude, longitude } = position.coords

      // For now, just show coordinates. In production, you'd reverse geocode this
      const address = `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      setFormData(prev => ({ ...prev, creatorAddress: address }))
      toast.success('Location captured.')

    } catch (error) {
      console.error('Geolocation error:', error)
      toast.error('We could not get your location. Please enter it manually.')
    }
  }

  const validateForm = () => {
    const result = createEventSchema.safeParse(formData)
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      console.log('Validation errors:', result.error.issues) // Debug log
      result.error.issues.forEach(error => {
        const path = error.path[0] as string
        newErrors[path] = error.message
        console.log(`Field ${path}: ${error.message}`) // Debug log
      })
      setErrors(newErrors)
      return false
    }
    setErrors({})
    console.log('Validation passed!', formData) // Debug log
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please review your information.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to create event')
      }

      const result = await response.json()

      if (result.success) {
        // Save to localStorage
        localStorageUtils.addEvent(result.data.event_id, formData.creatorNickname)

        toast.success('Event created successfully!')
        router.push(`/event/${result.data.event_id}`)
      } else {
        throw new Error(result.error || 'Failed to create event')
      }

    } catch (error) {
      console.error('Create event error:', error)
      toast.error('Failed to create the event. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-2xl">

        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button variant="ghost" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Where2Meet
          </h1>
        </div>

        {/* Create Event Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Create an event</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Event Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Event name *
                </Label>
                <Input
                  id="title"
                  placeholder="Friday dinner plans"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title}</p>
                )}
              </div>

              {/* Creator Nickname */}
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-sm font-medium">
                  Your nickname *
                </Label>
                <Input
                  id="nickname"
                  placeholder="Alice"
                  value={formData.creatorNickname}
                  onChange={(e) => handleInputChange('creatorNickname', e.target.value)}
                  className={errors.creatorNickname ? 'border-red-500' : ''}
                />
                {errors.creatorNickname && (
                  <p className="text-sm text-red-500">{errors.creatorNickname}</p>
                )}
              </div>

              {/* Creator Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">
                  Your starting address *
                </Label>
                <div className="space-y-2">
                  <Input
                    id="address"
                    placeholder="123 Main St, Seattle"
                    value={formData.creatorAddress}
                    onChange={(e) => handleInputChange('creatorAddress', e.target.value)}
                    className={errors.creatorAddress ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUseCurrentLocation}
                    className="w-full"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    📍 Use my current location
                  </Button>
                </div>
                {errors.creatorAddress && (
                  <p className="text-sm text-red-500">{errors.creatorAddress}</p>
                )}
              </div>

              {/* Event Time (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="eventTime" className="text-sm font-medium">
                  Meeting time (optional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="eventTime"
                    type="datetime-local"
                    value={formData.eventTime}
                    onChange={(e) => handleInputChange('eventTime', e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex items-center text-gray-500">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Purpose *
                </Label>
                <Select
                  value={formData.purpose}
                  onValueChange={(value) => handleInputChange('purpose', value)}
                >
                  <SelectTrigger className={errors.purpose ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Choose a purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dining">🍽️ Group meal</SelectItem>
                    <SelectItem value="coffee">☕ Coffee chat</SelectItem>
                    <SelectItem value="meeting">💼 Meeting</SelectItem>
                    <SelectItem value="other">🎯 Something else</SelectItem>
                  </SelectContent>
                </Select>
                {errors.purpose && (
                  <p className="text-sm text-red-500">{errors.purpose}</p>
                )}
              </div>

              {/* Expected Participants */}
              <div className="space-y-2">
                <Label htmlFor="expectedParticipants" className="text-sm font-medium">
                  Expected participants *
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="expectedParticipants"
                    type="number"
                    min="2"
                    max="50"
                    value={formData.expectedParticipants}
                    onChange={(e) => handleInputChange('expectedParticipants', parseInt(e.target.value) || 2)}
                    className={`w-32 ${errors.expectedParticipants ? 'border-red-500' : ''}`}
                  />
                  <span className="text-sm text-gray-600">people (including you)</span>
                </div>
                <p className="text-xs text-gray-500">
                  When you hit this number we will automatically generate recommendations and open voting.
                </p>
                {errors.expectedParticipants && (
                  <p className="text-sm text-red-500">{errors.expectedParticipants}</p>
                )}
              </div>

              {/* Special Requirements (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="requirements" className="text-sm font-medium">
                  Special requests (optional)
                </Label>
                <Textarea
                  id="requirements"
                  placeholder="Need parking, indoor seating..."
                  value={formData.specialRequirements}
                  onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                  className="min-h-[80px]"
                />
                {errors.specialRequirements && (
                  <p className="text-sm text-red-500">{errors.specialRequirements}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create event and share'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>We will generate a unique link you can share with friends after creation.</p>
        </div>
      </div>
    </div>
  )
}
