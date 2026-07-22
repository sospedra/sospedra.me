import type { Route } from 'next'

export type RouteSignal = {
  href: Route
  label: string
  sector: string
  status: string
}

export const ROUTE_SIGNALS: RouteSignal[] = [
  { href: '/', label: 'Origin', sector: '00', status: 'Signal online' },
  { href: '/papers', label: 'Archive', sector: '02', status: 'Index locked' },
  {
    href: '/about',
    label: 'Operator',
    sector: '03',
    status: 'Identity verified',
  },
  {
    href: '/bazaar',
    label: 'Night market',
    sector: '04',
    status: 'Open channel',
  },
  { href: '/manual', label: 'Manual', sector: '04.1', status: 'Read protocol' },
  {
    href: '/uses',
    label: 'Loadout',
    sector: '04.2',
    status: 'Inventory ready',
  },
  {
    href: '/serve',
    label: 'Storage',
    sector: '04.3',
    status: 'Directory mounted',
  },
  {
    href: '/rewrite',
    label: 'Relay',
    sector: '04.4',
    status: 'Routes resolved',
  },
  {
    href: '/travel',
    label: 'Flight log',
    sector: '05',
    status: 'Orbit locked',
  },
  {
    href: '/talks',
    label: 'Broadcast',
    sector: '06',
    status: 'Tape loaded',
  },
]

const PAPER_SIGNAL: RouteSignal = {
  href: '/papers',
  label: 'Paper',
  sector: '02.1',
  status: 'Transmission open',
}

// arcade pages stay out of ROUTE_SIGNALS: the system panel nav skips them
const ARCADE_SIGNALS: Record<string, RouteSignal> = {
  '/g-mines': {
    href: '/g-mines',
    label: 'Arcade',
    sector: '07',
    status: 'Field armed',
  },
  '/g-snake': {
    href: '/g-snake',
    label: 'Arcade',
    sector: '07.1',
    status: 'Battery full',
  },
}

const UNKNOWN_SIGNAL: RouteSignal = {
  href: '/',
  label: 'Unknown',
  sector: '??',
  status: 'Signal lost',
}

export const getRouteSignal = (pathname: string): RouteSignal => {
  if (pathname.startsWith('/papers/')) return PAPER_SIGNAL
  return (
    ARCADE_SIGNALS[pathname] ??
    ROUTE_SIGNALS.find(({ href }) => href === pathname) ??
    UNKNOWN_SIGNAL
  )
}
