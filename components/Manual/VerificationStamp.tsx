'use client'

import { useEffect, useRef, useState } from 'react'
import { useSystem } from 'service/system'
import css from './verification-stamp.module.css'

export default function VerificationStamp() {
  const stampRef = useRef<HTMLDivElement>(null)
  const [verified, setVerified] = useState(false)
  const { discover } = useSystem()

  useEffect(() => {
    const stamp = stampRef.current
    if (!stamp) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setVerified(true)
        discover('manual')
        observer.disconnect()
      },
      { threshold: 0.75 },
    )
    observer.observe(stamp)
    return () => observer.disconnect()
  }, [discover])

  return (
    <div ref={stampRef} className={css.stamp} data-verified={verified}>
      <span>RS-19911201-11</span>
      <strong>VERIFIED</strong>
      <small>OPERATOR MAY PROCEED ▼</small>
    </div>
  )
}
