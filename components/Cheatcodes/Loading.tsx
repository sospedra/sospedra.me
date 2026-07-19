import Icon from 'components/Icon'
import css from './loading.module.css'

const Loading = () => {
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center ${css.loading}`}
    >
      <Icon name='hourglass.svg' className='w-6' />
    </div>
  )
}

export default Loading
