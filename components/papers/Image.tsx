import React from 'react'

const Image: React.FC<{
  src: string
  alt: string
}> = (props) => {
  return (
    <picture>
      <img src={props.src} alt={props.alt} />
    </picture>
  )
}

export default Image
