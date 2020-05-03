import React from 'react'
import { parseISO, format } from 'date-fns'

export const Time: React.FC<{ dateString: string }> = (props) => {
  const date = parseISO(props.dateString)
  return <time dateTime={props.dateString}>{format(date, 'LLLL	d, yyyy')}</time>
}
