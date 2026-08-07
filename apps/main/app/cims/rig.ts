export type InputGesture = 'orbit' | 'pan' | 'look' | 'pinch'

export type CimsRig = {
  holdOn: boolean
  heading: number
  pitch: number
  range: number
  headingT: number
  pitchT: number
  rangeT: number
  lookYaw: number
  lookTilt: number
  lookYawT: number
  lookTiltT: number
  showT: number
  showH0: number
  showR0: number
  focusYT: number
  autoT: number
  idleT: number
  gesture: InputGesture | null
  lastInputMs: number
  lastZoomMs: number
  zoomAnchorX: number
  zoomAnchorZ: number
  zoomAnchorOk: boolean
}

export const createRig = (): CimsRig => ({
  holdOn: false,
  heading: 0,
  pitch: 0.62,
  range: 2600,
  headingT: 0,
  pitchT: 0.62,
  rangeT: 2600,
  lookYaw: 0,
  lookTilt: 0,
  lookYawT: 0,
  lookTiltT: 0,
  showT: -1,
  showH0: 0,
  showR0: 2600,
  focusYT: 0,
  autoT: 0,
  idleT: 0,
  gesture: null,
  lastInputMs: 0,
  lastZoomMs: 0,
  zoomAnchorX: 0,
  zoomAnchorZ: 0,
  zoomAnchorOk: false,
})
