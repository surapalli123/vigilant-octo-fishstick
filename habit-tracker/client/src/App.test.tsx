import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const mockHabits = [
  { id: 1, name: 'Morning run', frequency: 'daily', active: true },
]

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('App', () => {
  it('renders the Habit Tracker heading', () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response)
    render(<App />)
    expect(screen.getByRole('heading', { name: /habit tracker/i })).toBeInTheDocument()
  })
})

describe('Habit creation form', () => {
  it('shows a validation error when name is empty', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response)
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /add habit/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Habit name is required')
  })

  it('displays new habit in the list after successful creation', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(global, 'fetch')

    // Initial load: empty list
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    render(<App />)
    await waitFor(() => expect(screen.getByText(/no habits yet/i)).toBeInTheDocument())

    // POST /habits resolves successfully
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHabits[0],
    } as Response)

    // Re-fetch after creation returns the new habit
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHabits,
    } as Response)

    await user.type(screen.getByLabelText(/name/i), 'Morning run')
    await user.click(screen.getByRole('button', { name: /add habit/i }))

    expect(await screen.findByText('Morning run')).toBeInTheDocument()
  })
})

