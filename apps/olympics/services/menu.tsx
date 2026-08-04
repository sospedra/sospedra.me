'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MENU = [
  { name: 'Ranking', href: '/' },
  { name: 'Understand the score', href: '/manifesto#understand', info: true },
  { name: 'Manifesto', href: '/manifesto#why' },
] as const

export const Menu = () => {
  const pathname = usePathname()

  return (
    <header className='container mx-auto flex flex-col items-center justify-center pt-4'>
      <h1 className='font-bold text-xl'>The Olympics Score</h1>
      <h2 className='pb-4 italic'>Because the normal count isn&apos;t fair</h2>
      <nav>
        <ul className='flex flex-row pb-4 text-sm'>
          {MENU.map((item) => {
            const isActive = pathname === item.href.split('#')[0]

            return (
              <li key={item.name} className='px-2'>
                <Link
                  href={item.href}
                  className={`border-b border-dashed border-transparent hover:border-purple-900 ${
                    isActive ? 'text-gray-500' : 'text-gray-800'
                  }`}
                >
                  {item.name}
                  {'info' in item && <sup>ⓘ</sup>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
