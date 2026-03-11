import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const mockHabits = [
  { id: 1, name: 'Morning run', frequency: 'daily', active: true, completedToday: false },
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

describe('Mark done', () => {
  it('shows a "Mark done" button for habits not completed today', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockHabits,
    } as Response)
    render(<App />)
    expect(await screen.findByRole('button', { name: /mark done/i })).toBeInTheDocument()
  })

  it('does not show "Mark done" button and shows "Done today" for habits already completed today', async () => {
    const completedHabit = { ...mockHabits[0], completedToday: true }
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [completedHabit],
    } as Response)
    render(<App />)
    expect(await screen.findByText(/done today/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark done/i })).not.toBeInTheDocument()
  })

  it('shows completed state after marking a habit as done', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(global, 'fetch')

    // Initial load: habit not completed today
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHabits,
    } as Response)

    render(<App />)
    expect(await screen.findByRole('button', { name: /mark done/i })).toBeInTheDocument()

    // POST /habits/1/complete succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, habitId: 1, date: '2024-01-01' }),
    } as Response)

    // Re-fetch returns habit as completed
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ ...mockHabits[0], completedToday: true }],
    } as Response)

    await user.click(screen.getByRole('button', { name: /mark done/i }))

    expect(await screen.findByText(/done today/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark done/i })).not.toBeInTheDocument()
  })
})

