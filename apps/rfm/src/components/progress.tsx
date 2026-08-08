import { animated, useSpring } from '@react-spring/web'

export const Progress = (props: { ratio: number }) => {
  const style = useSpring({
    transform: `scaleX(${props.ratio})`,
    config: { frequency: 0.4, damping: 1 },
  })

  return (
    <div className='fixed top-0 left-0 right-0 z-50 h-1'>
      <animated.div
        className='w-full h-full origin-left bg-pink-500'
        style={style}
      />
    </div>
  )
}
