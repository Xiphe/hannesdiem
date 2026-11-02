import type { PoemLocation } from '@hannesdiem/content-components'

type Venue = PoemLocation['venue']

export function projectVenue({ latitude, longitude }: Venue) {
  return { x: (longitude - 10.4) * 65 + 500, y: (51.2 - latitude) * 100 + 500 }
}

export function mapLink(venue: Venue, device?: Pick<Navigator, 'userAgent' | 'platform'>) {
  const coordinates = `${venue.latitude},${venue.longitude}`
  if (/Android/i.test(device?.userAgent ?? ''))
    return `https://www.google.com/maps/search/?api=1&query=${coordinates}`
  if (/Mac|iPhone|iPad|iPod/i.test(`${device?.platform ?? ''} ${device?.userAgent ?? ''}`))
    return `https://maps.apple.com/?ll=${coordinates}&q=${encodeURIComponent(venue.name)}`
  return `https://www.openstreetmap.org/?mlat=${venue.latitude}&mlon=${venue.longitude}#map=17/${venue.latitude}/${venue.longitude}`
}
