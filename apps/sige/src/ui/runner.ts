import type { DemoScenario, DemoStep } from '../scenarios/scenarios.ts'
import { assertNever, must } from './must.ts'

type RunnerHooks = {
  onBack: () => void
}

type WorkerMessage =
  | { type: 'step'; step: DemoStep }
  | { type: 'progress'; done: number; total: number }
  | { type: 'done'; ok: boolean }
  | { type: 'error'; message: string }

export function renderRunner(
  root: HTMLElement,
  scenario: DemoScenario,
  profileId: string,
  hooks: RunnerHooks,
): () => void {
  const tierClass = must(
    scenario.tier.split(' ')[0],
    'tier prefix',
  ).toLowerCase()
  root.innerHTML = `
    <header>
      <a href="#/" class="back">← ledger</a>
      <h1>${scenario.title}</h1>
      <p><span class="tier tier-${tierClass}">${scenario.tier}</span></p>
      <p class="summary">${scenario.summary}</p>
      <ol class="instructions">${scenario.instructions.map((i) => `<li>${i}</li>`).join('')}</ol>
      <button id="run">run scenario</button>
    </header>
    <progress id="delay" max="1" value="0" hidden></progress>
    <p id="elapsed" class="elapsed"></p>
    <ol id="steps" class="steps"></ol>
    <p id="verdict" class="verdict"></p>`

  const steps = must(root.querySelector<HTMLOListElement>('#steps'), '#steps')
  const verdict = must(
    root.querySelector<HTMLParagraphElement>('#verdict'),
    '#verdict',
  )
  const progress = must(
    root.querySelector<HTMLProgressElement>('#delay'),
    '#delay',
  )
  const elapsed = must(
    root.querySelector<HTMLParagraphElement>('#elapsed'),
    '#elapsed',
  )
  const button = must(root.querySelector<HTMLButtonElement>('#run'), '#run')
  let worker: Worker | null = null
  let elapsedTimer: ReturnType<typeof setInterval> | null = null
  let elapsedSeconds = 0

  const stopElapsed = (): void => {
    if (elapsedTimer) clearInterval(elapsedTimer)
    elapsedTimer = null
    elapsed.textContent = ''
  }

  const startElapsed = (): void => {
    elapsedSeconds = 0
    elapsed.textContent = 'working… 0s'
    elapsedTimer = setInterval(() => {
      elapsedSeconds += 1
      elapsed.textContent = `working… ${elapsedSeconds}s`
    }, 1000)
  }

  const appendStep = (step: DemoStep): void => {
    const li = document.createElement('li')
    li.className = step.ok ? 'ok' : 'fail'
    li.textContent = `${step.ok ? '✓' : '✗'} ${step.label}${step.detail ? ` (${step.detail})` : ''}`
    steps.append(li)
  }

  const setVerdict = (text: string, ok: boolean): void => {
    verdict.textContent = text
    verdict.className = ok ? 'verdict ok' : 'verdict fail'
    button.disabled = false
  }

  button.addEventListener('click', () => {
    worker?.terminate()
    stopElapsed()
    steps.innerHTML = ''
    verdict.textContent = ''
    progress.hidden = true
    button.disabled = true
    startElapsed()
    worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onerror = (event) => {
      stopElapsed()
      progress.hidden = true
      setVerdict(`error: ${event.message}`, false)
    }
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data
      switch (msg.type) {
        case 'step':
          appendStep(msg.step)
          return
        case 'progress':
          progress.hidden = false
          progress.value = msg.done / msg.total
          return
        case 'done':
          stopElapsed()
          progress.hidden = true
          setVerdict(msg.ok ? 'scenario passed' : 'SCENARIO FAILED', msg.ok)
          return
        case 'error':
          stopElapsed()
          setVerdict(`error: ${msg.message}`, false)
          return
        default:
          assertNever(msg)
      }
    }
    worker.postMessage({ type: 'run', id: scenario.id, profileId })
  })

  must(
    root.querySelector<HTMLAnchorElement>('.back'),
    '.back',
  ).addEventListener('click', hooks.onBack)

  return () => {
    worker?.terminate()
    stopElapsed()
  }
}
