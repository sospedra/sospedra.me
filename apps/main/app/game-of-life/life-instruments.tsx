import { range } from 'es-toolkit'
import css from './cockpit.module.css'

export const METER_SEGMENT_COUNT = 12
export const METER_SEGMENTS = range(METER_SEGMENT_COUNT).map((index) =>
  String(index + 1).padStart(2, '0'),
)

export const KNOB_MIN_ANGLE = -135
export const KNOB_SWEEP = 270

export const formatCount = (value: number) => value.toLocaleString('en-US')
export const padGeneration = (value: number, length = 4) =>
  String(value).padStart(length, '0')
export const meterLevel = (
  value: number,
  segments: number = METER_SEGMENT_COUNT,
) => (value <= 0 ? 0 : Math.min(segments, Math.ceil(Math.log2(value + 1))))

export const Screw = ({
  position,
}: {
  position: 'nw' | 'ne' | 'sw' | 'se'
}) => <i className={css.screw} data-position={position} aria-hidden='true' />
