import * as React from 'react'
import { NextPageContext } from 'next'
import Meta from '../components/Meta'
import ListDetail from '../components/ListDetail'
import { findData } from '../utils/sample-api'
import { User } from '../interfaces'

type Props = {
  item?: User
  errors?: string
}

class InitialPropsDetail extends React.Component<Props> {
  static getInitialProps = async ({ query }: NextPageContext) => {
    try {
      const { id } = query
      const item = await findData(Array.isArray(id) ? id[0] : id)
      return { item }
    } catch (err) {
      return { errors: err.message }
    }
  }

  render() {
    const { item, errors } = this.props

    if (errors) {
      return (
        <React.Fragment>
          <Meta title={`Error | Next.js + TypeScript Example`} />
          <p>
            <span style={{ color: 'red' }}>Error:</span> {errors}
          </p>
        </React.Fragment>
      )
    }

    return (
      <React.Fragment>
        <Meta title={`${item ? item.name : 'Detail'} | Next.js + TypeScript Example`} />
        {item && <ListDetail item={item} />}
      </React.Fragment>
    )
  }
}

export default InitialPropsDetail
