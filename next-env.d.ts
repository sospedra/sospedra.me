/// <reference types="next" />
/// <reference types="next/types/global" />
declare module '@mdx-js/react' {
  import * as React from 'react'
  export type Components<T extends { [key: string]: any }> = {
    wrapper?: React.ComponentType<{ children: React.ReactNode } & T>
    img?: React.ComponentType<{ alt: string; src: string }>
    pre?: React.ComponentType<{ children: React.ReactNode }>
  }
  export interface MDXProviderProps<T> {
    children: React.ReactNode
    components: Components<T>
  }
  export class MDXProvider<T> extends React.Component<MDXProviderProps<T>> {}
}

declare module 'px-map-events' {
  function fn<T>(ref: T): { [key in T]: string[] }
  export default fn
}
