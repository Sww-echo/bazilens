import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { BottomTabs } from '@/components/BottomTabs'

function mount(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomTabs />
    </MemoryRouter>,
  )
}

describe('BottomTabs', () => {
  it('renders the 4 app tabs on user routes', () => {
    mount('/charts')

    expect(screen.getByText('Charts')).toBeInTheDocument()
    expect(screen.getByText('AI Reading')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()

    // Admin-only labels not shown
    expect(screen.queryByText('Tickets')).not.toBeInTheDocument()
    expect(screen.queryByText('Profile')).not.toBeInTheDocument()
  })

  it('switches to admin tabs under /admin', () => {
    mount('/admin/tickets')

    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Tickets')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()

    // App tabs not shown in admin mode
    expect(screen.queryByText('Charts')).not.toBeInTheDocument()
    expect(screen.queryByText('AI Reading')).not.toBeInTheDocument()
  })

  it('marks the active tab with the vermilion color class', () => {
    mount('/readings')

    const activeLink = screen.getByText('AI Reading').closest('a')
    expect(activeLink).not.toBeNull()
    expect(activeLink!.className).toMatch(/text-\[--color-vermilion\]/)
  })

  it('renders an admin profile link that targets /account', () => {
    mount('/admin/tickets')

    const profile = screen.getByText('Profile').closest('a')
    expect(profile).toHaveAttribute('href', '/account')
  })
})
