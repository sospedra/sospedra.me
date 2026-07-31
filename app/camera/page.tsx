import type { Metadata } from 'next'
import { CAMERA_DESC } from 'service/descriptions'
import CameraView from './camera-view'

export const metadata: Metadata = {
  title: 'Camera',
  description: CAMERA_DESC,
  alternates: { canonical: '/camera' },
}

export default function CameraPage() {
  return <CameraView />
}
