import React from 'react'
import { MDXProvider } from '@mdx-js/react'
import { Paper as PaperT } from '../files'
import Paper from '../Paper'
import Image from '../Image'

let metadata: PaperT | object = {}

export const Markdown: React.FC<{}> = (props) => {
  return (
    <MDXProvider<{ meta: PaperT }>
      components={{
        wrapper: ({ meta, children }) => {
          metadata = meta
          return <Paper {...meta}>{children}</Paper>
        },
        img: ({ src, alt }) => (
          <Image src={src} alt={alt} meta={metadata as PaperT} />
        ),
        pre: ({ children }) => {
          return <pre>{children}</pre>
        },
      }}
    >
      {props.children}
    </MDXProvider>
  )
}
