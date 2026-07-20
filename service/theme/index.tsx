import type React from 'react'

// static dark: the old localStorage initializer broke react 19 hydration
// and no ui ever wired setTheme
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = (
  props,
) => {
  return <div className='theme dark'>{props.children}</div>
}
