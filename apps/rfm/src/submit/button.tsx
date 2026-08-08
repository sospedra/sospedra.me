export const Button = (props: {
  disabled?: boolean
  href?: string
  form?: string
  loading?: boolean
  onClick?: () => void
  children: string
}) => {
  return props.href ? (
    <a
      className='inline-block w-64 px-4 py-2 text-white transition-[background-color,scale] duration-150 ease-out bg-pink-600 rounded shadow-lg hover:bg-pink-700 active:scale-[0.97]'
      href={props.href}
      id='submit'
      onClick={props.onClick}
    >
      {props.children}
    </a>
  ) : (
    <div
      className={`gradient shadow-lg transition-[background-color,scale] duration-150 ease-out ${
        props.disabled
          ? 'bg-gray-500 cursor-not-allowed'
          : 'bg-pink-600 cursor-pointer hover:bg-pink-700 active:scale-[0.97]'
      } ${props.loading ? 'bg-pink-700 cursor-wait loading' : ''}`}
    >
      <input
        disabled={props.disabled || props.loading}
        id='submit'
        type='submit'
        form={props.form}
        value={props.children}
        className={`w-64 px-4 py-2 text-white transition-[background-color] duration-150 ease-out ${
          props.disabled
            ? 'cursor-not-allowed bg-gray-500'
            : 'cursor-pointer bg-pink-600 hover:bg-pink-700'
        } ${props.loading ? 'cursor-wait' : ''}`}
      />
    </div>
  )
}
