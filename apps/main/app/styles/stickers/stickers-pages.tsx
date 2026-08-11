import type React from 'react'
import type { Spot } from './board'
import {
  SLAP_POOL,
  STICKER_FACE,
  STICKER_LABEL,
  type StickerKind,
} from './sticker-art'
import css from './stickers.module.css'

const CropMarks = () => (
  <>
    <span className={`${css.mark} ${css.markTl}`} aria-hidden='true' />
    <span className={`${css.mark} ${css.markTr}`} aria-hidden='true' />
    <span className={`${css.mark} ${css.markBl}`} aria-hidden='true' />
    <span className={`${css.mark} ${css.markBr}`} aria-hidden='true' />
  </>
)

const COVER_STICKERS: { kind: StickerKind; cls: string }[] = [
  { kind: 'burst', cls: css.coverStickA },
  { kind: 'smiley', cls: css.coverStickB },
  { kind: 'bolt', cls: css.coverStickC },
  { kind: 'cherry', cls: css.coverStickD },
  { kind: 'ok', cls: css.coverStickE },
]

export const CoverPlate = () => (
  <>
    <CropMarks />
    <div className={css.coverStrip}>
      <span>FREE · TAKE ONE</span>
      <span className={css.coverStripWide}>PRINTED ON A WALL</span>
      <span className={css.coverStripWide}>LAMPPOST DISTRICT EDITION</span>
      <span>EST. 2026</span>
    </div>
    <header className={css.masthead}>
      <p className={css.mastThe}>THE</p>
      <h1 className={css.mastName}>
        <span className={css.mastLineA}>ADHESIVE</span>
        <span className={css.mastLineB}>TIMES</span>
      </h1>
      <p className={css.mastDek}>the only paper you read standing up</p>
    </header>
    <span className={css.issueChip}>No. 44</span>
    {COVER_STICKERS.map((sticker) => (
      <span
        key={sticker.kind}
        className={`${css.coverStick} ${sticker.cls}`}
        aria-hidden='true'
      >
        {STICKER_FACE[sticker.kind]}
      </span>
    ))}
    <span className={`${css.tapePiece} ${css.coverTapeA}`} aria-hidden='true' />
    <span className={`${css.tapePiece} ${css.coverTapeB}`} aria-hidden='true' />
    <span className={`${css.doodle} ${css.coverDoodleA}`} aria-hidden='true'>
      stick with us ♥
    </span>
    <span className={`${css.doodle} ${css.coverDoodleB}`} aria-hidden='true'>
      44 issues of pure glue ↑
    </span>
    <ul className={css.coverIndex}>
      <li>
        <b>2</b> THE BOARD — twelve stickers, zero supervision
      </li>
      <li>
        <b>3</b> THE OP-ED — it sticks, therefore it is
      </li>
      <li>
        <b>4</b> CLASSIFIEDS — lost bolts, found clouds
      </li>
    </ul>
    <div className={css.coverFoot}>
      <span className={css.barsStrip} aria-hidden='true' />
      <span className={css.coverPrice}>
        PRICE: ONE STICKER, TRADED FAIR · NO REFUNDS · NO IRONING
      </span>
    </div>
  </>
)

type PointerHandler = (event: React.PointerEvent<HTMLDivElement>) => void

type BoardPlateProps = {
  stickers: Record<string, Spot>
  styleFor: (id: string, spot: Spot) => React.CSSProperties
  onGrab: PointerHandler
  onMove: PointerHandler
  onDrop: PointerHandler
  onSlap: () => void
}

export const BoardPlate = ({
  stickers,
  styleFor,
  onGrab,
  onMove,
  onDrop,
  onSlap,
}: BoardPlateProps) => (
  <section
    className={css.board}
    aria-label='Sticker board. Every sticker can be dragged.'
  >
    <div className={css.tapeCorner} aria-hidden='true' />
    <span className={`${css.doodle} ${css.doodlePeel}`} aria-hidden='true'>
      drag us anywhere ↯
    </span>
    <span className={`${css.doodle} ${css.doodleClub}`} aria-hidden='true'>
      est. 2026 — no refunds
    </span>
    <div className={css.tapeMarquee} aria-hidden='true'>
      <div className={css.tapeTrack}>
        <span className={css.tapeText}>
          STICK IT ✶ PEEL IT ✶ SLAP IT ✶ TRADE IT ✶ NEVER EVER IRON IT ✶&nbsp;
        </span>
        <span className={css.tapeText}>
          STICK IT ✶ PEEL IT ✶ SLAP IT ✶ TRADE IT ✶ NEVER EVER IRON IT ✶&nbsp;
        </span>
      </div>
    </div>
    {Object.entries(stickers).map(([id, spot]) => (
      <div
        key={id}
        role='img'
        aria-label={STICKER_LABEL[spot.kind]}
        data-id={id}
        data-kind={spot.kind}
        data-fresh={spot.fresh ? 'true' : undefined}
        data-landing={spot.fresh ? spot.landing : undefined}
        className={css.sticker}
        style={styleFor(id, spot)}
        onPointerDown={onGrab}
        onPointerMove={onMove}
        onPointerUp={onDrop}
        onPointerCancel={onDrop}
      >
        <div className={css.face}>{STICKER_FACE[spot.kind]}</div>
      </div>
    ))}
    <button type='button' className={css.slapBtn} onClick={onSlap}>
      SLAP!
    </button>
  </section>
)

export const OpEdPlate = () => (
  <div className={css.oped}>
    <article className={css.opedSheet}>
      <span
        className={`${css.tapePiece} ${css.opedTapeNw}`}
        aria-hidden='true'
      />
      <span
        className={`${css.tapePiece} ${css.opedTapeNe}`}
        aria-hidden='true'
      />
      <span
        className={`${css.tapePiece} ${css.opedTapeSw}`}
        aria-hidden='true'
      />
      <span
        className={`${css.tapePiece} ${css.opedTapeSe}`}
        aria-hidden='true'
      />
      <div className={css.opedMain}>
        <p className={css.opedKicker}>OPINION · PAGE 3 · THE ADHESIVE TIMES</p>
        <h2 className={css.opedHead}>
          IT STICKS,
          <br />
          THEREFORE
          <br />
          IT IS.
        </h2>
        <p className={css.opedByline}>
          words: the club — photos: none survived
        </p>
        <div className={css.opedCols}>
          <p>
            A sticker is a publishing platform the size of a plum. No paywall,
            no algorithm, no schedule: surface, glue, and nerve. You do not
            scroll a lamppost. The lamppost scrolls you, one commute at a time,
            until the message wins by attrition.
          </p>
          <p>
            Editors reject. Curators decline. Feeds bury. The laminate accepts.
            Slap one crooked over this very column and the page objectively
            improves — that is the entire editorial policy, and the letters
            section, and the archive.
          </p>
        </div>
      </div>
      <aside className={css.letters} aria-label='Letters to the editor'>
        <p className={css.lettersHead}>LETTERS</p>
        <p className={css.lettersItem}>
          “re: no. 43 — the lamppost on fifth is full. open a second lamppost.”
          <span className={css.lettersSign}>— A CONCERNED WALL</span>
        </p>
        <p className={css.lettersItem}>
          “your barcode scanned as expired yogurt. kept it anyway.”
          <span className={css.lettersSign}>— READER OF DISTINCTION</span>
        </p>
        <p className={css.lettersRule}>
          to reply: write on a sticker, stick it to this paper.
        </p>
        <p className={css.lettersAd}>
          <b>ADVERTISEMENT</b>
          café glue — espresso, laminate, unresolved longing. open until the
          wall dries.
        </p>
      </aside>
      <span className={`${css.opedStick} ${css.opedStickA}`} aria-hidden='true'>
        {STICKER_FACE.smiley}
      </span>
      <span className={`${css.opedStick} ${css.opedStickB}`} aria-hidden='true'>
        {STICKER_FACE.ok}
      </span>
      <span className={`${css.opedStick} ${css.opedStickC}`} aria-hidden='true'>
        {STICKER_FACE.cherry}
      </span>
    </article>
    <span className={`${css.doodle} ${css.opedNote}`} aria-hidden='true'>
      slap something over my best paragraph ↑
    </span>
  </div>
)

const SHEET_BADGE = ['SINGLE', 'SHEET', 'PACK']

const CLASSIFIEDS = [
  {
    tag: 'LOST',
    copy: 'one bolt sticker, last seen on a lamppost heading north. answers to “zap”. reward: two smaller stickers.',
  },
  {
    tag: 'FOR TRADE',
    copy: 'mint GREAT FLAVOR burst, never licked. will swap for anything cherry.',
  },
  {
    tag: 'WANTED',
    copy: 'clean skateboard deck. purpose: obvious.',
  },
  {
    tag: 'FOUND',
    copy: 'one “good mood” cloud, slightly peeled. claim it at the wall before the rain does.',
  },
]

type BackPlateProps = { onPeel: (kind: StickerKind) => void }

export const BackPlate = ({ onPeel }: BackPlateProps) => (
  <div className={css.back}>
    <span className={`${css.tapePiece} ${css.backTape}`} aria-hidden='true' />
    <span className={`${css.tapePiece} ${css.backTapeB}`} aria-hidden='true' />
    <section className={css.fresh} aria-label='Fresh sticker sheet'>
      <header className={css.freshHead}>
        <h2 className={css.freshTitle}>fresh sheet</h2>
        <p className={css.freshNote}>tap one — it flies to the board on 2 ↖</p>
      </header>
      <div className={css.freshGrid}>
        {SLAP_POOL.slice(0, 6).map((kind, index) => (
          <button
            key={kind}
            type='button'
            className={css.cell}
            onClick={() => onPeel(kind)}
            aria-label={`Peel a ${STICKER_LABEL[kind]} onto the board`}
          >
            <span className={css.cellBadge}>{SHEET_BADGE[index % 3]}</span>
            <span className={css.cellFace}>{STICKER_FACE[kind]}</span>
          </button>
        ))}
      </div>
    </section>
    <section className={css.classifieds} aria-label='Classifieds'>
      <h2 className={css.classHead}>CLASSIFIEDS</h2>
      {CLASSIFIEDS.map((ad) => (
        <p key={ad.tag} className={css.classItem}>
          <b>{ad.tag}:</b> {ad.copy}
        </p>
      ))}
      <h3 className={`${css.classHead} ${css.classHeadSub}`}>
        MISSED CONNECTIONS
      </h3>
      <p className={css.classItem}>
        <b>YOU:</b> a wet wall. <b>ME:</b> insufficient glue. write back. — BOLT
      </p>
      <span className={css.backStick} aria-hidden='true'>
        {STICKER_FACE.flower}
      </span>
    </section>
    <footer className={css.colophon}>
      <p className={css.colophonLine}>
        set in bubble letters and marker · printed on whatever was flat ·
        glue-funded since issue one
      </p>
      <div className={css.colophonFoot}>
        <span className={css.barsStrip} aria-hidden='true' />
        <span className={css.backStamp}>4 / 4 · RETURN TO ANY LAMPPOST</span>
      </div>
    </footer>
    <span className={`${css.doodle} ${css.backDoodle}`} aria-hidden='true'>
      fold here. or don’t. it’s glue.
    </span>
  </div>
)
