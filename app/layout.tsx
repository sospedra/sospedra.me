import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { SITE_URL } from 'service/site'
import Providers from './providers'
import 'service/style/global.css'

const wotfard = localFont({
  src: [
    { path: '../public/fonts/wotfard.woff2', weight: '400', style: 'normal' },
    {
      path: '../public/fonts/wotfard-italic.woff2',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../public/fonts/wotfard-semibold.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-wotfard',
})

const vcr = localFont({
  src: '../public/fonts/vcr.woff2',
  display: 'swap',
  preload: false,
  variable: '--font-vcr',
})

const inconsolata = localFont({
  src: '../public/fonts/inconsolata.woff2',
  display: 'swap',
  preload: false,
  variable: '--font-inconsolata',
})

const lazer84 = localFont({
  src: '../public/fonts/lazer84.woff2',
  display: 'swap',
  preload: false,
  variable: '--font-lazer84',
})

const fontVariables = [
  wotfard.variable,
  vcr.variable,
  inconsolata.variable,
  lazer84.variable,
].join(' ')

const PERSON_JSON_LD = {
  '@context': 'http://schema.org',
  '@type': 'Person',
  email: 'mailto:hello@sospedra.me',
  image: `${SITE_URL}/serve/profile.jpg`,
  jobTitle: 'Software engineer',
  name: 'Rubén Sospedra',
  url: SITE_URL,
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Rubén Sospedra',
    template: '%s ▼ Rubén Sospedra',
  },
  description: 'Rubén Sospedra ▼ javascript hacker',
  authors: [{ name: 'Rubén Sospedra', url: SITE_URL }],
  manifest: '/manifest.webmanifest',
  alternates: {
    types: {
      'application/rss+xml': '/rss.xml',
    },
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
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
  colorScheme: 'dark',
  themeColor: '#800d79',
  viewportFit: 'cover',
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang='en' data-scroll-behavior='smooth' className={fontVariables}>
      <body>
        <Providers>{props.children}</Providers>
        <Analytics />
        <script
          type='application/ld+json'
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static person json-ld
          dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON_JSON_LD) }}
        />
      </body>
    </html>
  )
}
