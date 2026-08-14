import type { Metadata } from 'next'
import { routeViewport } from 'services/chrome'
import CameraView from './camera-view'

export const metadata: Metadata = {
  title: 'Camera',
  description:
    'A private midnight photo booth that turns your camera feed into an instant picture.',
  alternates: { canonical: '/camera' },
}

export const viewport = routeViewport('/camera')

export default function CameraPage() {
  return <CameraView />
}
