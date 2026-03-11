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

describe('Streak display', () => {
  it('shows the current streak for a habit', async () => {
    const habitWithStreak = { ...mockHabits[0], streak: 5 }
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [habitWithStreak],
    } as Response)
    render(<App />)
    expect(await screen.findByText(/5 days streak/i)).toBeInTheDocument()
  })

  it('shows 0 day streak when habit has no streak', async () => {
    const habitWithNoStreak = { ...mockHabits[0], streak: 0 }
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [habitWithNoStreak],
    } as Response)
    render(<App />)
    expect(await screen.findByText(/0 days streak/i)).toBeInTheDocument()
  })

  it('uses singular "day" when streak is 1', async () => {
    const habitWith1Streak = { ...mockHabits[0], streak: 1 }
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [habitWith1Streak],
    } as Response)
    render(<App />)
    expect(await screen.findByText(/1 day streak/i)).toBeInTheDocument()
  })
})

describe('Edit habit', () => {
  it('shows an edit form when Edit button is clicked', async () => {
    const user = userEvent.setup()
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockHabits,
    } as Response)
    render(<App />)
    expect(await screen.findByRole('button', { name: /edit/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /edit/i }))
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('cancels the edit form when Cancel is clicked', async () => {
    const user = userEvent.setup()
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockHabits,
    } as Response)
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /edit/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('shows a validation error when edit name is empty', async () => {
    const user = userEvent.setup()
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockHabits,
    } as Response)
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /edit/i }))
    const nameInput = screen.getByDisplayValue('Morning run')
    await user.clear(nameInput)
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Habit name is required')
  })

  it('updates the habit after a successful edit', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(global, 'fetch')

    // Initial load
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHabits,
    } as Response)

    render(<App />)
    await user.click(await screen.findByRole('button', { name: /edit/i }))

    const nameInput = screen.getByDisplayValue('Morning run')
    await user.clear(nameInput)
    await user.type(nameInput, 'Evening run')

    // PUT /habits/1 succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockHabits[0], name: 'Evening run' }),
    } as Response)

    // Re-fetch returns updated habit
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ ...mockHabits[0], name: 'Evening run' }],
    } as Response)

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Evening run')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
  })
})

describe('Archive habit', () => {
  it('shows an Archive button for each habit', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockHabits,
    } as Response)
    render(<App />)
    expect(await screen.findByRole('button', { name: /archive/i })).toBeInTheDocument()
  })

  it('removes the habit from the list after archiving', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(global, 'fetch')

    // Initial load
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHabits,
    } as Response)

    render(<App />)
    expect(await screen.findByText('Morning run')).toBeInTheDocument()

    // DELETE /habits/1 succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockHabits[0], active: false }),
    } as Response)

    // Re-fetch returns empty list (archived habit excluded)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    await user.click(screen.getByRole('button', { name: /archive/i }))

    expect(await screen.findByText(/no habits yet/i)).toBeInTheDocument()
    expect(screen.queryByText('Morning run')).not.toBeInTheDocument()
  })
})

