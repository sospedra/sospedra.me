import type { Metadata } from 'next'
import CimsView from './cims-view.tsx'

export const metadata: Metadata = {
  title: 'Cims',
  description:
    'A terrain console over the Catalan peaks. Twelve mountains at 30 m resolution, real sun and moon, contour flights on a phosphor scope.',
  alternates: { canonical: '/cims' },
}

export default function CimsPage() {
  return <CimsView />
}
