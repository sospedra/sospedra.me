import { createGenerator, type Generator } from './generator.ts'
import { requestRandomExtract } from './request.ts'
import { semantic } from './semantic.ts'

export async function spg(): Promise<Generator> {
  const extract = await requestRandomExtract()

  return createGenerator(semantic(extract))
}
