function Svg(props: { children: React.ReactNode; size: number }) {
  return (
    <svg
      aria-hidden='true'
      fill='none'
      height={props.size}
      stroke='currentColor'
      strokeLinecap='round'
      strokeWidth='1.7'
      viewBox='0 0 24 24'
      width={props.size}
    >
      {props.children}
    </svg>
  )
}

export function SlidersIcon() {
  return (
    <Svg size={18}>
      <path d='M3 6h9M17 6h4M15 3.5v5' />
      <path d='M3 12h3M11 12h10M9 9.5v5' />
      <path d='M3 18h11M19 18h2M17 15.5v5' />
    </Svg>
  )
}

export function PlayIcon() {
  return (
    <svg aria-hidden='true' height={16} viewBox='0 0 24 24' width={16}>
      <path
        d='M8.5 5.4v13.2a.6.6 0 0 0 .9.5l10.4-6.6a.6.6 0 0 0 0-1L9.4 4.9a.6.6 0 0 0-.9.5Z'
        fill='currentColor'
      />
    </svg>
  )
}

export function PauseIcon() {
  return (
    <svg aria-hidden='true' height={16} viewBox='0 0 24 24' width={16}>
      <path d='M7 5h3.4v14H7zM13.6 5H17v14h-3.4z' fill='currentColor' />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <Svg size={18}>
      <path d='M6 6l12 12M18 6L6 18' />
    </Svg>
  )
}
