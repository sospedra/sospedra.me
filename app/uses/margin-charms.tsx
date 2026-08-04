import cn from 'clsx'
import fx from './fx-quiet.module.css'
import css from './margin-charms.module.css'
import label from './margin-stickers.module.css'

export function Charms() {
  return (
    <>
      <span
        className={cn(label.sticker, label.stickerStamp, fx.sticker)}
        aria-hidden='true'
        lang='ja'
      >
        麺
      </span>
      <span className={cn(css.charm, css.omamori, fx.charm)} aria-hidden='true'>
        <i className={css.charmCord} />
        <b className={css.omamoriBody} lang='ja'>
          開運
        </b>
      </span>
      <span
        className={cn(label.sticker, label.stickerPill, fx.sticker)}
        aria-hidden='true'
      />
      <span
        className={cn(label.sticker, label.daruma, fx.sticker)}
        aria-hidden='true'
      >
        <i className={label.darumaFace} />
      </span>
      <span
        className={cn(label.sticker, label.ofuda, fx.sticker)}
        aria-hidden='true'
        lang='ja'
      >
        深夜営業
      </span>
      <span
        className={cn(label.sticker, label.bowlSticker, fx.sticker)}
        aria-hidden='true'
      >
        <svg
          viewBox='0 0 100 96'
          aria-hidden='true'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path
            className={label.bowlSteam}
            d='M34 20 Q28 12 34 4 M50 22 Q44 12 50 2 M66 20 Q60 12 66 4'
          />
          <path d='M58 10 L86 38 M70 6 L92 30' />
          <path d='M8 44 Q50 34 92 44' />
          <path d='M12 46 Q16 84 50 87 Q84 84 88 46' />
          <path d='M24 40 Q30 28 36 40 Q42 28 48 40' />
        </svg>
      </span>
      <span className={cn(css.charm, css.fuurin, fx.charm)} aria-hidden='true'>
        <i className={css.charmCord} />
        <b className={css.fuurinBell} />
        <i className={cn(css.fuurinStrip, fx.fuurinStrip)} lang='ja'>
          涼
        </i>
      </span>
      <span
        className={cn(label.sticker, label.stickerBurst, fx.sticker)}
        aria-hidden='true'
      >
        <b className={label.burstInner} lang='ja'>
          うまい!
        </b>
      </span>
      <span className={cn(css.charm, css.ema, fx.charm)} aria-hidden='true'>
        <i className={css.charmCord} />
        <b className={css.emaBoard} lang='ja'>
          麺
        </b>
      </span>
    </>
  )
}
