import * as p from '@clack/prompts'

export type Context = {
  arg?: string
  hidden: boolean
}

export const ALL_PAPERS = '*'

export function unwrap<T>(result: T | symbol): T {
  if (p.isCancel(result)) {
    p.cancel('Cancelled')
    process.exit(0)
  }
  return result as T
}

export const pickPaper = async (message: string, papers: string[]) => {
  return unwrap(
    await p.select({
      message,
      options: [
        ...papers.map((slug) => ({ value: slug })),
        { value: ALL_PAPERS, label: 'all papers', hint: `${papers.length}` },
      ],
    }),
  )
}
