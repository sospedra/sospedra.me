import { buildScenarios } from '../scenarios/scenarios.ts'
import { GENERIC, PROFILES } from '../world/profile.ts'

type RunMessage = {
  type: 'run'
  id: string
  profileId: string
}

self.onmessage = async (event: MessageEvent<RunMessage>) => {
  const { id, profileId } = event.data
  try {
    const profile = PROFILES[profileId] ?? GENERIC
    const scenario = buildScenarios(profile).find((s) => s.id === id)
    if (!scenario) {
      self.postMessage({ type: 'error', message: `unknown scenario: ${id}` })
      return
    }
    const ok = await scenario.run(
      (step) => self.postMessage({ type: 'step', step }),
      (done, total) => self.postMessage({ type: 'progress', done, total }),
    )
    self.postMessage({ type: 'done', ok })
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err) })
  }
}
