import cn from 'clsx'
import type React from 'react'
import css from './car.module.css'
import chassis from './chassis.svg'
import reflect from './reflect.svg'
import rim from './rim.svg'
import windshield from './windshield.svg'

type SpriteCarProps = {
  disabled?: boolean
  engineOn?: boolean
  isMoving?: boolean
  onToggle?: () => void
}

const SpriteCar: React.FC<SpriteCarProps> = ({
  disabled = false,
  engineOn = true,
  isMoving = true,
  onToggle,
}) => {
  const running = engineOn || isMoving
  const carClassName = cn(css.car, {
    [css.engineOn]: running,
    [css.moving]: isMoving,
  })
  const spriteParts = (
    <>
      <img alt='' className={'opacity-0'} src={chassis.src} />
      <span className={css.exhaust} />
      <span className={css.headlight} />
      <img alt='' className={css.windshield} src={windshield.src} />
      <img alt='' className={css.reflect} src={reflect.src} />
      <img alt='' className={css.chassis} src={chassis.src} />
      <img alt='' className={css['rim-rear']} src={rim.src} />
      <img alt='' className={css['rim-front']} src={rim.src} />
    </>
  )
  const sprite = onToggle ? (
    <div aria-hidden='true' className={carClassName}>
      {spriteParts}
    </div>
  ) : (
    <div
      role='img'
      aria-label='A neon sports car driving at night'
      className={carClassName}
    >
      {spriteParts}
    </div>
  )

  return (
    <>
      <link rel='preload' as='image' href={chassis.src} />
      <link rel='preload' as='image' href={windshield.src} />
      <link rel='preload' as='image' href={rim.src} />
      <link rel='preload' as='image' href={reflect.src} />

      {onToggle ? (
        <button
          type='button'
          className={css.control}
          aria-label={
            engineOn ? 'Turn off the car engine' : 'Start the car engine'
          }
          aria-pressed={engineOn}
          disabled={disabled}
          onClick={onToggle}
        >
          {sprite}
        </button>
      ) : (
        sprite
      )}
    </>
  )
}

export default SpriteCar
