import Shell from 'components/Shell'
import type { Metadata } from 'next'
import corpus from '../../../data/geo/generated/countries.json'
import css from './shapes.module.css'

export const metadata: Metadata = {
  title: 'Meridian shape audit',
  robots: { index: false, follow: false },
}

const TIERS = [1, 2, 3, 4] as const

const TIER_NAMES: Record<(typeof TIERS)[number], string> = {
  1: 'Tier 1 · unmistakable',
  2: 'Tier 2 · household',
  3: 'Tier 3 · vague geography',
  4: 'Tier 4 · quiz-only',
}

interface AuditCountry {
  code: string
  name: string
  shapeUrl: string
  tier: (typeof TIERS)[number]
}

const auditCountries = (): AuditCountry[] =>
  corpus.countries
    .filter(
      (country) =>
        country.status === 'active' &&
        country.eligibility.shape &&
        country.assets.shapeUrl,
    )
    .map((country) => ({
      code: country.code,
      name: country.names.en,
      shapeUrl: country.assets.shapeUrl as string,
      tier: Math.min(
        4,
        Math.max(1, country.difficulty.shape ?? 4),
      ) as (typeof TIERS)[number],
    }))
    .toSorted((left, right) => left.name.localeCompare(right.name))

export default function ShapeAuditPage() {
  const countries = auditCountries()

  return (
    <Shell className={css.page}>
      <header className={css.header}>
        <h1>Meridian shape audit</h1>
        <p>
          Every playable silhouette with its editorial difficulty tier. Source
          of truth: <code>data/geo/editorial/country-difficulty.json</code>.
          Temporary page, not linked or indexed.
        </p>
      </header>
      {TIERS.map((tier) => {
        const members = countries.filter((country) => country.tier === tier)
        return (
          <section key={tier} className={css.tier} data-tier={tier}>
            <h2>
              {TIER_NAMES[tier]}
              <span>{members.length}</span>
            </h2>
            <ul className={css.grid}>
              {members.map((country) => (
                <li key={country.code} className={css.card}>
                  <img
                    src={country.shapeUrl}
                    alt={`Silhouette of ${country.name}`}
                    loading='lazy'
                    width='1000'
                    height='700'
                  />
                  <strong>{country.name}</strong>
                  <span>
                    {country.code} · T{country.tier}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </Shell>
  )
}
