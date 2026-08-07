import { buildScenarios } from '../scenarios/scenarios.ts'
import { GENERIC, PROFILES } from '../world/profile.ts'
import { renderLedger } from './ledger.ts'
import { must } from './must.ts'
import { renderRunner } from './runner.ts'
import './style.css'

const app = must(document.querySelector<HTMLDivElement>('#app'), '#app')
let disposeView: (() => void) | null = null

function currentProfileId(): string {
  const fromQuery = new URLSearchParams(location.search).get('profile')
  return fromQuery && PROFILES[fromQuery] ? fromQuery : GENERIC.id
}

function renderProfileSwitch(): string {
  const options = Object.values(PROFILES)
    .map(
      (p) =>
        `<option value="${p.id}" ${p.id === currentProfileId() ? 'selected' : ''}>${p.title}</option>`,
    )
    .join('')
  return `<label class="profile-switch">authority profile <select id="profile">${options}</select></label>`
}

function route(): void {
  disposeView?.()
  disposeView = null
  const profileId = currentProfileId()
  const scenarios = buildScenarios(PROFILES[profileId] ?? GENERIC)
  const match = location.hash.match(/^#\/s\/([a-z-]+)$/)
  const scenario = match ? scenarios.find((s) => s.id === match[1]) : undefined
  app.innerHTML = ''
  const shell = document.createElement('div')
  shell.className = 'shell'
  app.append(shell)
  if (scenario) {
    disposeView = renderRunner(shell, scenario, profileId, {
      onBack: () => {
        location.hash = '#/'
      },
    })
  } else {
    renderLedger(shell, scenarios)
  }
  const bar = document.createElement('div')
  bar.className = 'topbar'
  bar.innerHTML = renderProfileSwitch()
  shell.prepend(bar)
  must(
    bar.querySelector<HTMLSelectElement>('#profile'),
    '#profile',
  ).addEventListener('change', (e) => {
    const id = (e.target as HTMLSelectElement).value
    const url = new URL(location.href)
    url.searchParams.set('profile', id)
    location.href = url.toString()
  })
}

window.addEventListener('hashchange', route)
route()
