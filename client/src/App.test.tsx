import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the Habit Tracker heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /habit tracker/i })).toBeInTheDocument()
  })
})
