import React from 'react'

const Icon: React.FC<{
  name: string
  className?: string
}> = ({ name, className = '' }) => {
  return (
    <img
      role='icon'
      src={`/icons/${name}`}
      className={`min-w-6 h-6 inline-flex ${className}`}
    />
  )
}

export default Icon
