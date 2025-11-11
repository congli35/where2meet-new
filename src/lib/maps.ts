'use client'

export const openGoogleMapsRoute = (origin: string, destination: string) => {
  if (!origin || !destination) return
  if (typeof window === 'undefined') return

  const encodedOrigin = encodeURIComponent(origin)
  const encodedDestination = encodeURIComponent(destination)
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${encodedDestination}`

  window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')
}
