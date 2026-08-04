export const Star = () => (
  <svg
    aria-label='star'
    className='inline-block align-text-bottom fill-current'
    viewBox='0 0 14 16'
    width='14'
    height='16'
    role='img'
  >
    <path
      fillRule='evenodd'
      d='M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74L14 6z'
    />
  </svg>
)

export const IssueIcon = () => (
  <svg
    aria-hidden='true'
    className='inline-block align-text-bottom fill-current'
    viewBox='0 0 14 16'
    width='14'
    height='16'
  >
    <path
      fillRule='evenodd'
      d='M7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 011.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm1 3H6v5h2V4zm0 6H6v2h2v-2z'
    />
  </svg>
)

export const Circle = (props: { color?: string }) => (
  <span
    className='relative inline-block mr-1 bg-gray-900 rounded-full'
    style={{
      backgroundColor: props.color,
      width: 14,
      height: 14,
    }}
  />
)

export const Info = () => (
  <svg
    aria-hidden='true'
    className='inline-block mb-1 align-text-bottom fill-current'
    viewBox='0 0 14 16'
    width='14'
    height='16'
  >
    <path
      fillRule='evenodd'
      d='M6.3 5.69a.942.942 0 01-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 01-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z'
    />
  </svg>
)

export const Comments = () => (
  <svg
    aria-hidden='true'
    className='inline-block align-text-bottom fill-current'
    viewBox='0 0 14 16'
    width='16'
    height='16'
  >
    <path
      fillRule='evenodd'
      d='M14 1H2c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1h2v3.5L7.5 11H14c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1zm0 9H7l-2 2v-2H2V2h12v8z'
    />
  </svg>
)
