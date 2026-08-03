import type { Metadata } from 'next'
import CameraView from './camera-view'

export const metadata: Metadata = {
  title: 'Camera',
  description:
    'A private midnight photo booth that turns your camera feed into an instant picture.',
  alternates: { canonical: '/camera' },
}

export default function CameraPage() {
  return <CameraView />
}
