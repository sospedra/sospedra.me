'use client'

import type React from 'react'
import { useEffect, useState } from 'react'
import { useInterval } from 'service/easteregg/interval'
import { useTheme } from 'service/theme'
import css from './role.module.css'

const kanjis = 'ルーベンソスペドラ僕と戦うルーベンソスペドラ僕と戦う'

const Glitch: React.FC<{ char: string; i: number }> = (props) => {
  const kanji = kanjis[props.i]
  const style = kanji ? { transform: 'rotate(90deg)' } : {}
  return (
    <span className='inline-block' style={style}>
      {kanji || props.char}
    </span>
  )
}

const Role: React.FC = () => {
  const [i, setIteration] = useState(0)
  const { fxMode } = useTheme()
  useInterval(
    () => setIteration((iteration) => iteration + 1),
    fxMode === 'full' && i < kanjis.length - 1 ? 100 : null,
  )

  useEffect(() => {
    if (fxMode === 'quiet') setIteration(kanjis.length)
  }, [fxMode])

  return (
    <h2
      className={css.header2}
      aria-label='JavaScript hacker, full-stack engineer'
    >
      <span aria-hidden='true'>
        ｊａｖ
        <Glitch char='ａ' i={i} />
        <Glitch char='ｓ' i={i + 11} />
        ｃ
        <Glitch char='ｒ' i={i + 5} />
        ｉｐt
        <span className='inline-block w-6' />
        ｈａ
        <Glitch char='ｃ' i={i + 6} />
        ｋ
        <Glitch char='ｅ' i={i + 10} />
        <Glitch char='ｒ' i={i} />
        <br />
        ｆｕ
        <Glitch char='ｌ' i={i + 9} />
        ｌ- ｓｔ
        <Glitch char='ａ' i={i + 18} />
        ｃｋ
        <span className='inline-block w-6' />ｅ
        <Glitch char='ｎ' i={i} />
        ｇｉ
        <Glitch char='ｎ' i={i + 6} />
        <Glitch char='ｅ' i={i + 13} />
        <Glitch char='ｅ' i={i + 20} />
        <Glitch char='ｒ' i={i + 4} />
      </span>
    </h2>
  )
}

export default Role
