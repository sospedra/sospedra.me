'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useStoreSelector } from 'services/external-store'
import { useTheme } from 'services/theme'
import styles from './cims.module.css'
import { type CimsStore, createCimsStore } from './cims-store.ts'
import { Compass } from './compass.tsx'
import { type CimsEngine, createCimsEngine } from './engine.ts'
import { StageLabels } from './stage-labels.tsx'
import type { StageRefs } from './stage-projection.ts'
import { TelemetryHud } from './telemetry-hud.tsx'
import { type TerrainData, terrainSchema } from './terrain-schema.ts'
import { type TourNames, titleMain } from './tour-copy.ts'
import { TourPanel } from './tour-panel.tsx'

const TERRAIN_URL = '/cims/terrain.json'

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: TerrainData }

const elementRef = () => ({ current: null })

const createStageRefs = (cityCount: number, destCount: number): StageRefs => ({
  peaks: [elementRef(), elementRef()],
  cities: Array.from({ length: cityCount }, elementRef),
  dests: Array.from({ length: destCount }, elementRef),
  sun: elementRef(),
  moon: elementRef(),
  alt: elementRef(),
  spd: elementRef(),
  hdg: elementRef(),
  compass: elementRef(),
  needle: elementRef(),
})

const fetchTerrain = async (signal: AbortSignal): Promise<TerrainData> => {
  const response = await fetch(TERRAIN_URL, { signal })
  if (!response.ok) throw new Error(`terrain fetch ${response.status}`)
  return terrainSchema.parse(await response.json())
}

type SceneStatus = {
  store: CimsStore
  names: TourNames
}

const SceneTitle = ({ store, names }: SceneStatus) => {
  const text = useStoreSelector(store, (snap) =>
    snap.ready ? titleMain(snap, names) : 'CIMS',
  )
  return <span>{text}</span>
}

const ArrivalStatus = ({ store, names }: SceneStatus) => {
  const announcement = useStoreSelector(store, (snap) =>
    snap.ready && !snap.enRoute ? titleMain(snap, names) : '',
  )
  return (
    <div role='status' className={styles.srOnly}>
      {announcement}
    </div>
  )
}

export default function CimsView() {
  const { fxMode } = useTheme()
  const quiet = fxMode === 'quiet'
  const quietRef = useRef(quiet)
  useEffect(() => {
    quietRef.current = quiet
  }, [quiet])

  const [store] = useState(createCimsStore)
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [engine, setEngine] = useState<CimsEngine | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (load.status !== 'loading') return
    const controller = new AbortController()
    fetchTerrain(controller.signal)
      .then((data) => setLoad({ status: 'ready', data }))
      .catch(() => {
        if (!controller.signal.aborted) setLoad({ status: 'error' })
      })
    return () => controller.abort()
  }, [load.status])

  // ref identity must survive re-renders: the engine writes into these objects
  const stageRefs = useMemo(
    () =>
      load.status === 'ready'
        ? createStageRefs(load.data.cities.length, load.data.mountains.length)
        : createStageRefs(0, 0),
    [load],
  )

  useEffect(() => {
    if (load.status !== 'ready') return
    const canvas = canvasRef.current
    if (!canvas) return
    const instance = createCimsEngine({
      canvas,
      data: load.data,
      store,
      quiet: () => quietRef.current,
      refs: stageRefs,
    })
    setEngine(instance)
    return () => {
      setEngine(null)
      instance.dispose()
    }
  }, [load, store, stageRefs])

  const names: TourNames = useMemo(
    () =>
      load.status === 'ready'
        ? { mountains: load.data.mountains, cities: load.data.cities }
        : { mountains: [], cities: [] },
    [load],
  )

  return (
    <div className={styles.stage}>
      {/* biome-ignore lint/a11y/noInteractiveElementToNoninteractiveRole: the scene owns arrow, plus, and minus keys, and application is the ARIA role for that contract */}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role='application'
        tabIndex={0}
        aria-label='CIMS terrain console. A flight tour over the Catalan peaks. With the scene focused, arrow keys orbit and plus or minus zooms. Elsewhere, left and right arrows step the tour and space pauses it.'
      />
      <div className={styles.cornerTl} />
      <div className={styles.cornerTr} />
      <div className={styles.cornerBl} />
      <div className={styles.cornerBr} />
      <TelemetryHud
        store={store}
        mountainCount={
          load.status === 'ready' ? load.data.mountains.length : null
        }
        altRef={stageRefs.alt}
        spdRef={stageRefs.spd}
        hdgRef={stageRefs.hdg}
      />
      <div className={styles.title}>
        <SceneTitle store={store} names={names} />{' '}
        <span className={styles.cursor}>&nbsp;</span>
        <small>srtm 30 m · © osm contributors</small>
      </div>
      <Compass
        rootRef={stageRefs.compass}
        needleRef={stageRefs.needle}
        onFaceNorth={() => {
          engine?.playClick()
          engine?.faceNorth()
        }}
      />
      {load.status === 'ready' && (
        <StageLabels
          store={store}
          names={names}
          refs={stageRefs}
          engine={engine}
        />
      )}
      {load.status === 'ready' && (
        <TourPanel store={store} names={names} engine={engine} quiet={quiet} />
      )}
      {load.status === 'loading' && (
        <div className={styles.notice}>ACQUIRING TERRAIN</div>
      )}
      {load.status === 'error' && (
        <div className={styles.notice}>
          TERRAIN LINK ERROR
          <div>
            <button
              type='button'
              className={styles.retry}
              onClick={() => setLoad({ status: 'loading' })}
            >
              retry
            </button>
          </div>
        </div>
      )}
      <ArrivalStatus store={store} names={names} />
    </div>
  )
}
