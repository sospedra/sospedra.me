import React from 'react'

const Icon: React.FC<{
  name: string
  className?: string
}> = ({ name, className = '' }) => {
  return (
    <img
      alt={name.split('.')[0]}
      className={`min-w-6 h-6 inline-flex ${className}`}
      role='icon'
      src={`/icons/${name}`}
    />
  )
}

export default Icon
