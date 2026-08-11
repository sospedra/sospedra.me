'use client'

import { useSyncExternalStore } from 'react'
import { useStoreSelector } from 'services/external-store'
import css from './bazaar.module.css'
import { stageSimStore } from './decor-store'

/* the editor dock reserves this strip; the letterbox pads around it */
export const DOCK_W = 324

export type StageBox = {
  el: HTMLElement | null
  left: number
  top: number
  width: number
  height: number
  scale: number
}

/** the stage in viewport terms: fixed children position in its layout
    space, so client coords convert through left/top and the sim scale */
export const stageBox = (): StageBox => {
  const el = document.querySelector<HTMLElement>('[data-bazaar-stage]')
  if (!el) {
    return {
      el,
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      scale: 1,
    }
  }
  const rect = el.getBoundingClientRect()
  const scale = el.offsetWidth > 0 ? rect.width / el.offsetWidth : 1
  return {
    el,
    left: rect.left,
    top: rect.top,
    width: el.offsetWidth,
    height: el.offsetHeight,
    scale,
  }
}

export type SceneBox = {
  left: number
  top: number
  width: number
  scale: number
  scrollTop: number
  scrollLeft: number
}

/** the scroll content in its own layout space: absolute children of the
    scene ride the scroll, so a content-space anchor stays glued to its
    stall without a scroll listener */
export const sceneBox = (): SceneBox => {
  const el = document.querySelector<HTMLElement>('[data-bazaar-scene]')
  if (!el) {
    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      scale: 1,
      scrollTop: 0,
      scrollLeft: 0,
    }
  }
  const rect = el.getBoundingClientRect()
  const scale = el.offsetWidth > 0 ? rect.width / el.offsetWidth : 1
  return {
    left: rect.left,
    top: rect.top,
    width: el.offsetWidth,
    scale,
    scrollTop: el.scrollTop,
    scrollLeft: el.scrollLeft,
  }
}

const subscribeResize = (listener: () => void) => {
  window.addEventListener('resize', listener)
  return () => window.removeEventListener('resize', listener)
}

const serverWidth = () => 0

/* simulated stages wider than the room render at layout size and zoom out:
   container queries see the simulated width, the eye sees it scaled */
const simStyle = (sim: number, room: number): React.CSSProperties => {
  const scale = Math.min(1, room / sim)
  if (scale === 1) return { width: sim }
  return {
    width: sim,
    height: `calc(100svh / ${scale})`,
    transform: `scale(${scale})`,
  }
}

/** the scene's viewport: letterboxed past 3840px, size-simulable while editing */
export default function Stage(props: {
  editing: boolean
  children: React.ReactNode
}) {
  const { editing, children } = props
  const sim = useStoreSelector(stageSimStore, (value) => value)
  const viewport = useSyncExternalStore(
    subscribeResize,
    () => window.innerWidth,
    serverWidth,
  )
  const room = viewport - (editing ? DOCK_W : 0)
  const style = sim && viewport > 0 ? simStyle(sim, room) : undefined
  return (
    <div className={css.letterbox} data-editing={editing || undefined}>
      <div
        className={css.stage}
        data-bazaar-stage
        data-bazaar-editing={editing || undefined}
        style={style}
      >
        {children}
      </div>
    </div>
  )
}
