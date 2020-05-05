import React from 'react'
import { parseISO, format } from 'date-fns'

const Time: React.FC<{ time: string }> = (props) => {
  const date = parseISO(props.time)
  return <time dateTime={props.time}>{format(date, 'LLLL	d, yyyy')}</time>
}

export default Time
