'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2 } from 'lucide-react'
import { joinEventSchema, type JoinEventInput } from '@/lib/validations'
import { localStorageUtils } from '@/lib/utils'
import { toast } from 'sonner'

interface JoinEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  onSuccess: () => void
}

export function JoinEventDialog({ open, onOpenChange, eventId, onSuccess }: JoinEventDialogProps) {
  const [formData, setFormData] = useState<JoinEventInput>({
    nickname: '',
    address: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  const handleInputChange = (field: keyof JoinEventInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Your browser does not support location sharing.')
      return
    }

    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        setFormData(prev => ({ ...prev, address: locationString }))
        setIsGettingLocation(false)
        toast.success('Location captured.')
      },
      (error) => {
        console.error('Geolocation error:', error)
        setIsGettingLocation(false)

        let errorMessage = 'We could not get your location. Please enter your address manually.'
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location permission was denied. Please enter your address manually.'
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information is unavailable. Please enter your address manually.'
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Location request timed out. Please enter your address manually.'
        }

        toast.error(errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const validateForm = (): boolean => {
    const result = joinEventSchema.safeParse(formData)
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      result.error.issues.forEach(error => {
        const path = error.path[0] as string
        newErrors[path] = error.message
      })
      setErrors(newErrors)
      return false
    }
    setErrors({})
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please review your information.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/events/${eventId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to join the event.')
      }

      // Check if nickname was modified
      const assignedNickname = data.data.assigned_nickname || formData.nickname
      const nicknameModified = data.data.nickname_modified || false

      if (nicknameModified) {
        toast.success(`That nickname was taken. We assigned you: ${assignedNickname}`, {
          duration: 5000
        })
      } else {
        toast.success('You have joined the event!')
      }

      // Mark event as joined in localStorage with the ASSIGNED nickname
      localStorageUtils.markEventJoined(eventId, assignedNickname)

      // Reset form and close dialog
      setFormData({ nickname: '', address: '' })
      setErrors({})
      onOpenChange(false)
      onSuccess()

    } catch (error) {
      console.error('Join event error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to join the event. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join this event</DialogTitle>
          <DialogDescription>
            Share your nickname and address so we can tailor the meeting suggestions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nickname">
              Nickname <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nickname"
              placeholder="Enter a nickname (max 20 characters)"
              value={formData.nickname}
              onChange={(e) => handleInputChange('nickname', e.target.value)}
              disabled={isSubmitting}
            />
            {errors.nickname && (
              <p className="text-sm text-destructive">{errors.nickname}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">
              Address <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="address"
                placeholder="Enter an address or use your current location"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                disabled={isSubmitting || isGettingLocation}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGetCurrentLocation}
                disabled={isSubmitting || isGettingLocation}
              >
                {isGettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Provide a detailed address (for example: 123 Main St, Seattle) or tap the pin to use your current location.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || isGettingLocation}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              'Join event'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
