import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import Providers from './providers'
import 'service/style/global.css'

const PERSON_JSON_LD = {
  '@context': 'http://schema.org',
  '@type': 'Person',
  email: 'mailto:hello@sospedra.me',
  image: 'https://sospedra.me/serve/profile.jpg',
  jobTitle: 'Software engineer',
  name: 'Rubén Sospedra',
  url: 'https://sospedra.me',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://sospedra.me'),
  title: {
    default: 'Rubén Sospedra',
    template: '%s ▼ Rubén Sospedra',
  },
  description: 'Rubén Sospedra ▼ javascript hacker',
  authors: [{ name: 'Rubén Sospedra', url: 'https://sospedra.me' }],
  manifest: '/manifest.webmanifest',
  alternates: {
    types: {
      'application/rss+xml': '/rss.xml',
    },
  },
  openGraph: {
    type: 'website',
    url: 'https://sospedra.me',
    images: ['/sospedra.png'],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@sospedra_r',
    site: '@sospedra_r',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      {
        url: '/favicon/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/favicon/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png' },
      { url: '/favicon/apple-icon-120x120.png', sizes: '120x120' },
      { url: '/favicon/apple-icon-152x152.png', sizes: '152x152' },
      { url: '/favicon/apple-icon-180x180.png', sizes: '180x180' },
    ],
  },
  other: {
    'msapplication-tap-highlight': 'no',
    'msapplication-TileColor': '#800d79',
    'msapplication-TileImage': '/favicon/ms-icon-144x144.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#800d79',
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang='en' data-scroll-behavior='smooth'>
      <body>
        <Providers>{props.children}</Providers>
        <Analytics />
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_JSON_LD) }}
        />
      </body>
    </html>
  )
}
