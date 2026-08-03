import * as clack from '@clack/prompts'

export type Context = {
  arg?: string
  hidden: boolean
  rest: string[]
}

export const ALL_PAPERS = '*'

export function unwrap<T>(result: T | symbol): T {
  if (clack.isCancel(result)) {
    clack.cancel('Cancelled')
    process.exit(0)
  }
  return result as T
}

export const pickPaper = async (message: string, papers: string[]) => {
  return unwrap(
    await clack.select({
      message,
      options: [
        ...papers.map((slug) => ({ value: slug })),
        { value: ALL_PAPERS, label: 'all papers', hint: `${papers.length}` },
      ],
    }),
  )
}
