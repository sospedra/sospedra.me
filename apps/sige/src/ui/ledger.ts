import type { DemoScenario } from '../scenarios/scenarios.ts'
import { must } from './must.ts'

const TIER_LEGEND: [string, string][] = [
  [
    'MATH',
    'Holds against an adversary who controls all system software and both hardware domains. Bypass requires breaking a hardness assumption.',
  ],
  [
    'CUSTODY',
    'Holds because a simulated gate refuses. Bypassable by subverting the hardware. Auditable afterwards only if the artifacts are disclosed.',
  ],
  [
    'ASSUMED',
    'Holds only under an environmental assumption the demo cannot enforce.',
  ],
]

export function renderLedger(
  root: HTMLElement,
  scenarios: DemoScenario[],
): void {
  const legend = TIER_LEGEND.map(
    ([tier, text]) =>
      `<div class="legend-row"><span class="tier tier-${tier.toLowerCase()}">${tier}</span><span>${text}</span></div>`,
  ).join('')
  const rows = scenarios
    .map(
      (s) => `
      <tr>
        <td><span class="tier tier-${must(s.tier.split(' ')[0], 'tier prefix').toLowerCase()}">${s.tier}</span></td>
        <td><a href="#/s/${s.id}">${s.title}</a></td>
        <td class="summary">${s.summary}</td>
      </tr>`,
    )
    .join('')
  root.innerHTML = `
    <header>
      <h1>sige</h1>
      <p class="tagline">Sealed identity with signature-gated escrow. Every claim carries its enforcement tier. If a claim is not MATH, this page says who you are trusting.</p>
    </header>
    <section class="legend">${legend}</section>
    <table class="ledger">
      <thead><tr><th>tier</th><th>claim</th><th>what runs</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <footer>
      <p>All cryptography runs in your browser: BLS12-381 pairings, an LHTLP time-lock puzzle with a public opening proof, a Merkle transparency log. The institutions are simulated and labeled. The spec is the source of truth.</p>
    </footer>`
}
