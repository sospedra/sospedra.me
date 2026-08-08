import type { Metadata } from 'next'
import { GoBack, LinkBack } from 'services/link'
import Shell from 'services/shell'
import css from './manual.module.css'
import ManualCommissioning from './manual-commissioning'
import ManualCover from './manual-cover'
import ManualProcedures from './manual-procedures'
import VerificationStamp from './verification-stamp'

export const metadata: Metadata = {
  title: 'Manual of instructions',
  description:
    'How to work with Rubén Sospedra. A manual of instructions: what I value, how I look at problems, where my blind spots are, and how to earn my trust.',
  alternates: { canonical: '/manual' },
}

export default function ManualPage() {
  return (
    <Shell className={css.frame}>
      <nav className={css.manualNav} aria-label='Manual controls'>
        <GoBack>
          <LinkBack>Back</LinkBack>
        </GoBack>
        <p>SECTOR 04.1 / RS-19911201-11 / READ PROTOCOL / [ ] FLIP SHEETS</p>
      </nav>

      {/* react 19 hoists resource links, next/head dies with the app router */}
      <link rel='preload' as='image' href='/sospedra.png' />

      <ManualCover />
      <ManualCommissioning />
      <ManualProcedures />
      <VerificationStamp />
    </Shell>
  )
}
