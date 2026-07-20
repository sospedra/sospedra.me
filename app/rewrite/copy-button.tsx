'use client'

export default function CopyButton(props: {
  source: string
  className?: string
}) {
  return (
    <button
      type='button'
      className={props.className}
      onClick={() => {
        navigator.clipboard.writeText(`https://sospedra.me${props.source}`)
      }}
    >
      {props.source}
    </button>
  )
}
