'use client'

import type React from 'react'
import { ECLIPSE_COUNTRIES } from './eclipse-countries.ts'
import chrome from './figure.module.css'
import {
  forceIpLocation,
  pickCountry,
  useEclipseLocation,
} from './location-store.ts'

const MY_LOCATION = 'my-location'

/**
 * The shared area control: every widget reads the same picked spot. The IP
 * answer arrives async, so "my location" re-requests it on demand.
 */
const AreaPicker: React.FC = () => {
  const location = useEclipseLocation()
  const value = location.source === 'picked' ? location.country : MY_LOCATION

  const onChange = (code: string) => {
    if (code === MY_LOCATION) {
      forceIpLocation()
      return
    }
    pickCountry(code)
  }

  return (
    <label className={chrome.pickerLabel}>
      area
      <select
        className={chrome.picker}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value={MY_LOCATION}>
          {location.source === 'default'
            ? 'my location · locating'
            : `my location${location.label ? ` · ${location.label}` : ''}`}
        </option>
        {ECLIPSE_COUNTRIES.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.name}
            {entry.band ? ' · band' : ' · partial'}
          </option>
        ))}
      </select>
    </label>
  )
}

export default AreaPicker
