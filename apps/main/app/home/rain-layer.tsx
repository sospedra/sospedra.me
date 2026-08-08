'use client'

import { useReducedMotion } from '@react-spring/web'
import { useEffect, useRef } from 'react'
import { useStoreSelector } from 'services/external-store'
import { useTheme } from 'services/theme'
import css from './rain-layer.module.css'
import { rainStore, syncRainToWeather } from './rain-store'

type Streak = {
  x: number
  y: number
  slant: number
  length: number
  life: number
  maxLife: number
  alpha: number
}

type Splash = {
  x: number
  y: number
  life: number
  maxLife: number
  alpha: number
}

type Size = { width: number; height: number }

type ParticleOps<T> = { spawn: () => T; draw: (particle: T) => void }

const STREAKS_PER_FRAME = 600
const SPLASHES_PER_FRAME = 30
const FLOOR_BAND = 0.05
const SPLASH_GROWTH = 8
const MAX_DPR = 2

const random = (min: number, max: number) => Math.random() * (max - min) + min

// spawn ranges and the 1.5x draw offset port codepen.io/ma_suwa/pen/LYVNorV verbatim
const spawnStreak = ({ width, height }: Size): Streak => ({
  x: width * Math.random() * 2 - width / 2,
  y: height * Math.random(),
  slant: random(-15, 15),
  length: random(70, 150),
  life: 0,
  maxLife: random(1, 3),
  alpha: random(0.01, 0.2),
})

const spawnSplash = ({ width, height }: Size): Splash => ({
  x: width * Math.random(),
  y: height * (1 - FLOOR_BAND * Math.random()),
  life: 0,
  maxLife: random(4, 9),
  alpha: random(0.08, 0.3),
})

function drawStreak(ctx: CanvasRenderingContext2D, streak: Streak) {
  ctx.strokeStyle = `rgba(125, 125, 125, ${streak.alpha})`
  ctx.beginPath()
  ctx.moveTo(streak.x * 1.5, streak.y * 1.5)
  ctx.lineTo(streak.x * 1.5 + streak.slant / 2, streak.y * 1.5 + streak.length)
  ctx.stroke()
}

function drawSplash(ctx: CanvasRenderingContext2D, splash: Splash) {
  const progress = splash.life / splash.maxLife
  const radius = 2 + progress * SPLASH_GROWTH
  ctx.strokeStyle = `rgba(125, 125, 125, ${splash.alpha * (1 - progress)})`
  ctx.beginPath()
  ctx.ellipse(splash.x, splash.y, radius, radius * 0.35, 0, 0, 2 * Math.PI)
  ctx.stroke()
}

// per-frame hot path: mutate the pool in place, swap-pop expired particles
function stepPool<T extends { life: number; maxLife: number }>(
  pool: T[],
  spawnCount: number,
  ops: ParticleOps<T>,
) {
  for (let i = 0; i < spawnCount; i++) {
    pool.push(ops.spawn())
  }
  for (let i = pool.length - 1; i >= 0; i--) {
    const particle = pool[i]
    ops.draw(particle)
    particle.life++
    if (particle.life >= particle.maxLife) {
      pool[i] = pool[pool.length - 1]
      pool.pop()
    }
  }
}

export default function RainLayer() {
  const { fxMode } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const raining = useStoreSelector(rainStore, (visible) => visible)

  useEffect(() => {
    void syncRainToWeather()
  }, [])

  if (!raining || fxMode !== 'full' || prefersReducedMotion) return null
  return <RainCanvas />
}

function RainCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!wrapper || !canvas || !ctx) return

    const size: Size = { width: 0, height: 0 }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      size.width = wrapper.clientWidth
      size.height = wrapper.clientHeight
      canvas.width = size.width * dpr
      canvas.height = size.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(wrapper)

    const streaks: Streak[] = []
    const splashes: Splash[] = []
    const streakOps: ParticleOps<Streak> = {
      spawn: () => spawnStreak(size),
      draw: (streak) => drawStreak(ctx, streak),
    }
    const splashOps: ParticleOps<Splash> = {
      spawn: () => spawnSplash(size),
      draw: (splash) => drawSplash(ctx, splash),
    }

    let frameId = 0
    const frame = () => {
      frameId = requestAnimationFrame(frame)
      // the display:none clone in the other breakpoint tree idles at 0x0
      if (size.width === 0) return
      ctx.clearRect(0, 0, size.width, size.height)
      stepPool(streaks, STREAKS_PER_FRAME, streakOps)
      stepPool(splashes, SPLASHES_PER_FRAME, splashOps)
    }
    frameId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [])

  return (
    <div aria-hidden='true' className={css.rain} ref={wrapperRef}>
      <canvas ref={canvasRef} />
    </div>
  )
}
