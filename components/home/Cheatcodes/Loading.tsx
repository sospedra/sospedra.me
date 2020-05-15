import React from 'react'

const Loading = () => {
  return (
    <>
      <div className='fixed inset-0 flex items-center justify-center'>
        <img src={require('./hourglass.svg?svg')} className='w-6' />
      </div>
      <style jsx>{`
        div {
          filter: drop-shadow(2px 4px 6px black) brightness(1.5);
          background: rgba(0, 0, 0, 0.3);
        }
        img {
          animation: rotate 2s linear infinite;
        }
        @keyframes rotate {
          0% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(180deg);
          }
          75% {
            transform: rotate(180deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  )
}

export default Loading
