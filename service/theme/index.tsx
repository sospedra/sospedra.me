import React, { useState, createContext } from 'react'

export type Theme = 'light' | 'dark'

const context = createContext<{
  setTheme: (theme: Theme) => void
}>({ setTheme: () => {} })

const fromStorage = () => {
  let theme = 'dark'

  try {
    theme = localStorage.getItem('theme') || theme
  } catch (ex) {}

  return theme as Theme
}

export const ThemeProvider: React.FC<{}> = (props) => {
  const [theme, setThemeMemory] = useState<Theme>(fromStorage())
  const setTheme = (theme: Theme) => {
    setThemeMemory(theme)
    try {
      localStorage.setItem('theme', theme)
    } catch (ex) {}
  }

  return (
    <context.Provider value={{ setTheme }}>
      <div className={`theme ${theme}`}>{props.children}</div>
      <style jsx>{`
        .theme {
          --cyan: #6df7ea;
          --violet: #49257c;
          --pink: #d9478c;
          --blue: #46628c;
          --yellow: #f1f9ce;
          --magenta: #800d79;
          --black: #0e141b;
        }

        .theme.light {
          --bg-start: white;
          --bg-yellow: var(--yellow);
          --header: var(--cyan);
          --textNormal: #222;
          --textTitle: #222;
          --textLink: var(--pink);
          --hr: hsla(0, 0%, 0%, 0.2);
          --inlineCode-bg: rgba(255, 229, 100, 0.2);
          --inlineCode-text: #1a1a1a;
          --form-shadow: 0 2px 15px 0 rgba(210, 214, 220, 0.5);
        }

        .theme.dark {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          --bg-start: var(--black);
          --bg-end: var(--magenta);
          --header: #ffffff;
          --textNormal: rgba(255, 255, 255, 0.88);
          --textTitle: #ffffff;
          --textLink: var(--cyan);
          --hr: hsla(0, 0%, 100%, 0.2);
          --inlineCode-bg: rgba(115, 124, 153, 0.2);
          --inlineCode-text: #e6e6e6;
          --form-shadow: 0 2px 15px 0 rgba(26, 26, 27, 0.637);
        }
      `}</style>
    </context.Provider>
  )
}
