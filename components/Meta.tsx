import * as React from 'react'
import Head from 'next/head'

type Props = {
  title?: string
}

const Meta: React.FunctionComponent<Props> = ({
  title = 'This is the default title',
}) => (
  <Head>
    <title>{title}</title>
    <meta charSet="utf-8" />
    <meta name="viewport" content="initial-scale=1.0, width=device-width" />
  </Head>
)

export default Meta
