import type { CSSProperties } from 'react'
import { EQ_FREQUENCIES, formatFrequency } from './equalizer'
import css from './music.module.css'
import type { DragPanelProps } from './types'

type EqualizerPanelProps = {
  balance: number
  bands: readonly number[]
  dragProps: DragPanelProps
  onBalanceChange: (balance: number) => void
  onBandChange: (index: number, value: number) => void
  onClose: () => void
  processingEnabled: boolean
}

const levelStyle = (value: number): CSSProperties =>
  ({
    '--eq-level': `${((value + 12) / 24) * 100}%`,
  }) as CSSProperties

export default function EqualizerPanel({
  balance,
  bands,
  dragProps,
  onBalanceChange,
  onBandChange,
  onClose,
  processingEnabled,
}: EqualizerPanelProps) {
  return (
    <section
      id='winamp-equalizer-panel'
      className={`${css.panel} ${css.equalizerPanel}`}
      data-calibration-id='P02'
      data-calibration-label='Equalizer panel'
      data-calibration-kind='panel'
      {...dragProps}
    >
      <img
        className={css.skin}
        src='/images/music/equalizer.png'
        width='1696'
        height='927'
        alt=''
        draggable={false}
      />

      <p className={css.srOnly} aria-live='polite'>
        {processingEnabled
          ? 'Equalizer processing is active for the local audio file.'
          : 'Equalizer settings are stored, but SoundCloud playback is unchanged. Load a local file to hear them.'}
      </p>

      <fieldset className={css.frequencyControls} data-no-drag>
        <legend className={css.srOnly}>Ten-band equalizer</legend>
        {EQ_FREQUENCIES.map((frequency, index) => {
          const value = bands[index] ?? 0
          return (
            <label
              key={frequency}
              className={css.frequencyControl}
              data-calibration-id={`H${String(index + 9).padStart(2, '0')}`}
              data-calibration-label={`${formatFrequency(frequency)} EQ band`}
              data-calibration-kind='control'
              style={levelStyle(value)}
            >
              <span className={css.frequencyFill} aria-hidden='true' />
              <span className={css.frequencyKnob} aria-hidden='true' />
              <input
                type='range'
                min='-12'
                max='12'
                step='1'
                value={value}
                aria-label={`${formatFrequency(frequency)} equalizer gain`}
                aria-valuetext={`${value > 0 ? '+' : ''}${value} decibels`}
                onChange={(event) =>
                  onBandChange(index, Number(event.target.value))
                }
              />
              <output className={css.srOnly}>
                {value > 0 ? '+' : ''}
                {value} decibels
              </output>
            </label>
          )
        })}
      </fieldset>

      <label
        className={css.balanceControl}
        data-calibration-id='H19'
        data-calibration-label='Balance'
        data-calibration-kind='control'
        data-no-drag
        style={
          {
            '--balance-level': `${((balance + 1) / 2) * 100}%`,
          } as CSSProperties
        }
      >
        <span className={css.srOnly}>Stereo balance</span>
        <i aria-hidden='true' />
        <input
          type='range'
          min='-1'
          max='1'
          step='0.01'
          value={balance}
          aria-valuetext={
            balance === 0
              ? 'Centered'
              : balance < 0
                ? `${Math.round(Math.abs(balance) * 100)} percent left`
                : `${Math.round(balance * 100)} percent right`
          }
          onChange={(event) => onBalanceChange(Number(event.target.value))}
        />
        <output className={css.srOnly}>
          {balance === 0
            ? 'Centered'
            : balance < 0
              ? `${Math.round(Math.abs(balance) * 100)} percent left`
              : `${Math.round(balance * 100)} percent right`}
        </output>
      </label>

      <button
        type='button'
        className={`${css.hotspot} ${css.equalizerCloseHotspot}`}
        data-calibration-id='H23'
        data-calibration-label='Close equalizer'
        data-calibration-kind='control'
        aria-label='Close equalizer'
        onClick={onClose}
      />
    </section>
  )
}
