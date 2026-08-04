import type React from 'react'
import w98 from '../w98.module.css'

export type MenuId = 'file' | 'edit'

type MenuItemSpec = {
  label: React.ReactNode
  name: string
  kbd?: string
}

export const FILE_ITEMS: readonly MenuItemSpec[] = [
  {
    label: (
      <>
        <u>N</u>ew
      </>
    ),
    name: 'New',
  },
  {
    label: (
      <>
        <u>O</u>pen…
      </>
    ),
    name: 'Open',
    kbd: 'Ctrl+O',
  },
  {
    label: (
      <>
        Save <u>A</u>s…
      </>
    ),
    name: 'Save As',
    kbd: 'Ctrl+S',
  },
]

export const EDIT_ITEMS: readonly (MenuItemSpec | 'divider')[] = [
  {
    label: (
      <>
        <u>U</u>ndo
      </>
    ),
    name: 'Undo',
    kbd: 'Ctrl+Z',
  },
  'divider',
  {
    label: (
      <>
        Cu<u>t</u>
      </>
    ),
    name: 'Cut',
    kbd: 'Ctrl+X',
  },
  {
    label: (
      <>
        <u>C</u>opy
      </>
    ),
    name: 'Copy',
    kbd: 'Ctrl+C',
  },
  {
    label: (
      <>
        <u>P</u>aste
      </>
    ),
    name: 'Paste',
    kbd: 'Ctrl+V',
  },
  {
    label: (
      <>
        C<u>l</u>ear Selection
      </>
    ),
    name: 'Clear Selection',
    kbd: 'Del',
  },
  {
    label: (
      <>
        Select <u>A</u>ll
      </>
    ),
    name: 'Select All',
    kbd: 'Ctrl+A',
  },
]

export const PaintMenu: React.FC<{
  items: readonly (MenuItemSpec | 'divider')[]
  label: string
  disabled?: Record<string, boolean>
  act: (name: string) => void
}> = ({ items, label, disabled, act }) => (
  <div className={w98.menu} role='menu' aria-label={label}>
    {items.map((item, index) =>
      item === 'divider' ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: dividers are positional
        <hr key={index} />
      ) : (
        <button
          key={item.name}
          type='button'
          role='menuitem'
          className={w98.menuItem}
          disabled={disabled?.[item.name] ?? false}
          onClick={() => act(item.name)}
        >
          <span>{item.label}</span>
          {item.kbd && <kbd>{item.kbd}</kbd>}
        </button>
      ),
    )}
  </div>
)
