import * as p from '@clack/prompts'
import { isImage, isMdx, listPapers, transformPaper } from '../papers.mts'
import { ALL_PAPERS, type Context, pickPaper } from '../prompts.mts'
import reading from '../reading.mts'
import resize from '../resize.mts'

type Sync = {
  label: string
  match: (file: string) => boolean
  apply: (file: string) => Promise<unknown>
}

const syncCommand = ({ label, match, apply }: Sync) => {
  return async ({ arg }: Context) => {
    const papers = await listPapers()
    if (papers.length === 0) throw Error('There are no papers yet')
    if (arg && !papers.includes(arg)) {
      throw Error(`No paper named '${arg}' in repo/papers`)
    }

    const target = arg ?? (await pickPaper(`${label} for which paper?`, papers))
    const queue = target === ALL_PAPERS ? papers : [target]

    const spin = p.spinner()
    spin.start(label)
    let count = 0
    for (const paper of queue) {
      spin.message(`${label}: ${paper}`)
      count += await transformPaper(paper, match, apply)
    }
    spin.stop(`${label}: ${count} files in ${queue.length} papers`)

    return `Updated ${count} files`
  }
}

export const readingCommand = syncCommand({
  label: 'Reading time',
  match: isMdx,
  apply: reading,
})

export const resizeCommand = syncCommand({
  label: 'Resize images',
  match: isImage,
  apply: resize,
})
