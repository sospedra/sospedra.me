import Typography from 'typography'
import Kirkham from 'typography-theme-kirkham'

Kirkham.overrideThemeStyles = () => ({
  a: {
    color: 'var(--textLink)',
  },
  hr: {
    background: 'var(--hr)',
  },
  'p code': {
    fontSize: '1rem',
  },
  'li code': {
    fontSize: '1rem',
  },
  blockquote: {
    color: 'inherit',
    borderLeftColor: 'inherit',
    opacity: '0.8',
  },
})

delete Kirkham.googleFonts

export const initStyle = () => {
  new Typography(Kirkham).injectStyles()
}
