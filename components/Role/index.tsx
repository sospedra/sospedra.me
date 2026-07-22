import type React from 'react'
import { useState } from 'react'
import { useInterval } from 'service/easteregg/interval'
import css from './role.module.css'

const kanjis = 'ルーベンソスペドラ僕と戦うルーベンソスペドラ僕と戦う'

const Glitch: React.FC<{ char: string; i: number }> = (props) => {
  const kanji = kanjis[props.i]
  const style = kanji ? { transform: 'rotate(90deg)' } : {}
  return (
    <span className={`inline-block ${kanji ? css.kanji : ''}`} style={style}>
      {kanji ?? props.char}
    </span>
  )
}

const Role: React.FC = () => {
  const [i, setIteration] = useState(0)
  const done = i >= kanjis.length - 1

  useInterval(
    () => {
      setIteration((iteration) => iteration + 1)
    },
    done ? null : 100,
  )

  return (
    <h2 className={css.header2}>
      <button
        type='button'
        className={css.replay}
        title='Replay transmission'
        onClick={() => setIteration(0)}
      >
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
      </button>
    </h2>
  )
}

export default Role
