import React from 'react'

const dict = {
  '🔥': 'hot',
  '▼': 'downwards triangle',
}

const Emoji: React.FC<{ is: keyof typeof dict; className?: string }> = (
  props,
) => {
  return (
    <span role='img' aria-label={dict[props.is]} className={props.className}>
      {props.is}
    </span>
  )
}

export default Emoji
