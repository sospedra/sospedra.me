import cn from 'clsx'
import type React from 'react'
import discCss from './disc.module.css'
import print from './disc-print.module.css'
import type { Disc, DiscLook } from './discs'

const shortYear = (disc: Disc) => `'${String(disc.pressed).slice(2)}`

function Serial({ disc }: { disc: Disc }) {
  return (
    <span className={print.serial}>
      {`w.o.# ${disc.id}-${disc.pressed} · disc mfg (a)`}
    </span>
  )
}

function CompactDiscMark({ line }: { line: string }) {
  return (
    <span className={print.cdMark}>
      <span className={print.cdMarkTop}>compact</span>
      <span className={print.cdMarkDisc}>disc</span>
      <span className={print.cdMarkTop}>{line}</span>
    </span>
  )
}

function SpecBoxes({ speed }: { speed: string }) {
  return (
    <span className={print.specs}>
      <span className={print.specBox}>700 mb</span>
      <span className={print.specBox}>{speed}</span>
      <span className={print.specBox}>80 min</span>
    </span>
  )
}

function WritingLines({ disc, ink }: { disc: Disc; ink: 'dark' | 'light' }) {
  return (
    <span className={cn(print.lines, ink === 'light' && print.linesLight)}>
      <span className={print.line}>
        <span className={print.handwriting}>{disc.title}</span>
      </span>
      <span className={print.line}>
        <span className={print.handwritingSmall}>{disc.note}</span>
      </span>
      <span className={print.line}>
        <span className={print.handwritingSmall}>{shortYear(disc)}</span>
      </span>
    </span>
  )
}

// verbatim-style blank cd-r: brand row, dye tint, spec boxes, sharpie
function BurnFace({ disc }: { disc: Disc }) {
  return (
    <>
      <span className={print.brand}>sospedra.me</span>
      <span className={print.jpBand}>このディスクはCD-Rです</span>
      <span className={print.formatMark}>cd-r</span>
      <CompactDiscMark line='recordable' />
      <SpecBoxes speed='52x' />
      <WritingLines disc={disc} ink='dark' />
      <Serial disc={disc} />
    </>
  )
}

// magazine cover disc: big printed title over paper
function LabelFace({ disc }: { disc: Disc }) {
  return (
    <>
      <span className={print.magTitle}>{disc.title}</span>
      <span className={print.magHighlight}>{disc.note}</span>
      <span className={print.magIndex}>
        <span>{`volume ${String(disc.pressed).slice(2)}`}</span>
        <span>{disc.stack.toLowerCase()}</span>
      </span>
      <span className={print.magPublisher}>
        {`sospedra.me © ${disc.pressed} · not for resale`}
      </span>
      <Serial disc={disc} />
    </>
  )
}

// pressed retail cd-rom: quiet serif print on tinted metal
function PressFace({ disc }: { disc: Disc }) {
  return (
    <>
      <span className={print.pressTitle}>
        {disc.title}
        <span className={print.pressSub}>{`pressed ${disc.pressed}`}</span>
      </span>
      <span className={print.pressBody}>{disc.oneLiner}</span>
      <CompactDiscMark line='data storage' />
      <span className={print.pressFoot}>made in the browser</span>
      <Serial disc={disc} />
    </>
  )
}

// colored verbatim cd-rw: white print on a saturated body
function RwFace({ disc }: { disc: Disc }) {
  return (
    <>
      <span className={cn(print.brand, print.brandLight)}>sospedra.me</span>
      <span className={cn(print.formatMark, print.formatMarkLight)}>cd-rw</span>
      <SpecBoxes speed='12x' />
      <WritingLines disc={disc} ink='light' />
      <Serial disc={disc} />
    </>
  )
}

// home burn with a masking-tape label and sharpie
function TapeFace({ disc }: { disc: Disc }) {
  return (
    <>
      <span className={print.tapeStrip}>
        <span className={print.tapeName}>{disc.title}</span>
      </span>
      <span className={print.tapeNote}>
        {`${disc.note} ${shortYear(disc)}`}
      </span>
      <span className={cn(print.formatMark, print.formatMarkFaint)}>cd-r</span>
      <SpecBoxes speed='52x' />
      <Serial disc={disc} />
    </>
  )
}

const LOOK_FACE = {
  burn: BurnFace,
  label: LabelFace,
  press: PressFace,
  rw: RwFace,
  tape: TapeFace,
} satisfies Record<DiscLook, React.FC<{ disc: Disc }>>

export function DiscArt({ disc }: { disc: Disc }) {
  const Face = LOOK_FACE[disc.look]
  return (
    <span className={discCss.cd}>
      <span
        className={cn(discCss.cdFace, discCss.cdFront)}
        data-look={disc.look}
      >
        <Face disc={disc} />
      </span>
      <span className={cn(discCss.cdFace, discCss.cdBack)} />
    </span>
  )
}
