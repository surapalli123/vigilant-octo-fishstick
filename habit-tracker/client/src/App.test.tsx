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

describe('Dashboard summary', () => {
  it('shows zero summary metrics when there are no habits', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response)
    render(<App />)
    expect(await screen.findByRole('heading', { name: /today's summary/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Total active habits')).toHaveTextContent('0')
    expect(screen.getByLabelText('Habits completed today')).toHaveTextContent('0')
    expect(screen.getByLabelText('Completion percentage today')).toHaveTextContent('0%')
    expect(screen.getByLabelText('Longest current streak')).toHaveTextContent('0 days')
  })

  it('shows correct summary metrics with habits', async () => {
    const habits = [
      { id: 1, name: 'Run', frequency: 'daily', active: true, completedToday: true, streak: 5 },
      { id: 2, name: 'Read', frequency: 'daily', active: true, completedToday: false, streak: 3 },
      { id: 3, name: 'Meditate', frequency: 'daily', active: true, completedToday: true, streak: 7 },
    ]
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => habits,
    } as Response)
    render(<App />)
    expect(await screen.findByLabelText('Total active habits')).toHaveTextContent('3')
    expect(screen.getByLabelText('Habits completed today')).toHaveTextContent('2')
    expect(screen.getByLabelText('Completion percentage today')).toHaveTextContent('67%')
    expect(screen.getByLabelText('Longest current streak')).toHaveTextContent('7 days')
  })

  it('shows singular "day" when longest streak is 1', async () => {
    const habits = [
      { id: 1, name: 'Run', frequency: 'daily', active: true, completedToday: true, streak: 1 },
    ]
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => habits,
    } as Response)
    render(<App />)
    expect(await screen.findByLabelText('Longest current streak')).toHaveTextContent('1 day')
  })

  it('shows 100% completion when all habits are done today', async () => {
    const habits = [
      { id: 1, name: 'Run', frequency: 'daily', active: true, completedToday: true, streak: 2 },
      { id: 2, name: 'Read', frequency: 'daily', active: true, completedToday: true, streak: 4 },
    ]
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => habits,
    } as Response)
    render(<App />)
    expect(await screen.findByLabelText('Completion percentage today')).toHaveTextContent('100%')
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

describe('Weekly analytics', () => {
  it('renders the weekly analytics section with values from the API', async () => {
    const fetchMock = vi.spyOn(global, 'fetch')

    // Initial habits fetch
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHabits,
    } as Response)

    // Analytics fetch
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        weeklyCompletionPct: 75,
        habitsCompletedThisWeek: 3,
        mostConsistentHabit: 'Morning run',
      }),
    } as Response)

    render(<App />)

    expect(await screen.findByRole('heading', { name: /weekly analytics/i })).toBeInTheDocument()
    expect(await screen.findByLabelText('Weekly completion percentage')).toHaveTextContent('75%')
    expect(screen.getByLabelText('Habits completed this week')).toHaveTextContent('3')
    expect(screen.getByLabelText('Most consistent habit')).toHaveTextContent('Morning run')
  })

  it('shows a dash when there is no most consistent habit', async () => {
    const fetchMock = vi.spyOn(global, 'fetch')

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        weeklyCompletionPct: 0,
        habitsCompletedThisWeek: 0,
        mostConsistentHabit: null,
      }),
    } as Response)

    render(<App />)

    expect(await screen.findByLabelText('Most consistent habit')).toHaveTextContent('—')
  })

  it('shows 0% and 0 habits when analytics data is unavailable', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response)

    render(<App />)

    expect(await screen.findByRole('heading', { name: /weekly analytics/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Weekly completion percentage')).toHaveTextContent('0%')
    expect(screen.getByLabelText('Habits completed this week')).toHaveTextContent('0')
    expect(screen.getByLabelText('Most consistent habit')).toHaveTextContent('—')
  })
})

describe('Export data', () => {
  beforeEach(() => {
    // jsdom doesn't implement URL.createObjectURL/revokeObjectURL
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', { writable: true, configurable: true, value: vi.fn(() => 'blob:mock') })
      Object.defineProperty(URL, 'revokeObjectURL', { writable: true, configurable: true, value: vi.fn() })
    }
  })

  it('renders Export JSON and Export CSV buttons', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response)
    render(<App />)
    expect(await screen.findByRole('button', { name: /export json/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument()
  })

  it('triggers a download when Export JSON is clicked', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(global, 'fetch')

    // Initial load
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)
    // Analytics load
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ weeklyCompletionPct: 0, habitsCompletedThisWeek: 0, mostConsistentHabit: null }),
    } as Response)

    render(<App />)
    const exportBtn = await screen.findByRole('button', { name: /export json/i })

    const mockBlob = new Blob(['{"habits":[],"completions":[]}'], { type: 'application/json' })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    } as unknown as Response)

    const clickMock = vi.fn()
    const mockAnchor = { href: '', download: '', click: clickMock }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(mockAnchor as unknown as HTMLAnchorElement)

    await user.click(exportBtn)

    await waitFor(() => expect(clickMock).toHaveBeenCalled())
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('format=json'))
  })

  it('triggers a download when Export CSV is clicked', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(global, 'fetch')

    // Initial load
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)
    // Analytics load
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ weeklyCompletionPct: 0, habitsCompletedThisWeek: 0, mostConsistentHabit: null }),
    } as Response)

    render(<App />)
    const exportBtn = await screen.findByRole('button', { name: /export csv/i })

    const mockBlob = new Blob(['id,name,frequency,active,completionDate'], { type: 'text/csv' })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    } as unknown as Response)

    const clickMock = vi.fn()
    const mockAnchor = { href: '', download: '', click: clickMock }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(mockAnchor as unknown as HTMLAnchorElement)

    await user.click(exportBtn)

    await waitFor(() => expect(clickMock).toHaveBeenCalled())
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('format=csv'))
  })
})

describe('Accessibility', () => {
  it('action buttons have descriptive aria-labels identifying the habit', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockHabits,
    } as Response)
    render(<App />)
    expect(await screen.findByRole('button', { name: /mark done: morning run/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit morning run/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /archive morning run/i })).toBeInTheDocument()
  })

  it('name input is marked aria-invalid and linked to error via aria-describedby when validation fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response)
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /add habit/i }))
    const input = screen.getByLabelText(/name/i)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const errorId = input.getAttribute('aria-describedby')
    expect(errorId).toBeTruthy()
    expect(document.getElementById(errorId!)).toHaveTextContent('Habit name is required')
  })

  it('edit name input is marked aria-invalid when edit validation fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockHabits,
    } as Response)
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /edit morning run/i }))
    const nameInput = screen.getByDisplayValue('Morning run')
    await user.clear(nameInput)
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')
  })

  it('habit list items have the habit-list-item class for mobile layout', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockHabits,
    } as Response)
    render(<App />)
    await screen.findByText('Morning run')
    const listItems = screen.getAllByRole('listitem')
    const habitItem = listItems.find((el) => el.classList.contains('habit-list-item'))
    expect(habitItem).toBeDefined()
  })
})

