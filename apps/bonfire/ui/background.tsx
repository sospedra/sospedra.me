export function Background() {
  return (
    <video
      autoPlay
      className='fixed top-0 left-0 -z-10 object-cover w-full h-full bg-black pointer-events-none'
      loop
      muted
      playsInline
      poster='/cover.jpg'
      preload='auto'
    >
      <source src='/background.webm' type='video/webm' />
      <source src='/background.mp4' type='video/mp4' />
    </video>
  )
}
