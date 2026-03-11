import { useState, useEffect, type FormEvent } from 'react'

interface Habit {
  id: number
  name: string
  frequency: string
  active: boolean
  completedToday: boolean
  streak?: number
}

interface Analytics {
  weeklyCompletionPct: number
  mostConsistentHabit: string | null
  habitsCompletedThisWeek: number
}

const API_BASE = '/api'

function App() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loadError, setLoadError] = useState('')
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily')
  const [nameError, setNameError] = useState('')
  const [submitError, setSubmitError] = useState('')

  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [editName, setEditName] = useState('')
  const [editFrequency, setEditFrequency] = useState<'daily' | 'weekly'>('daily')
  const [editNameError, setEditNameError] = useState('')
  const [editSubmitError, setEditSubmitError] = useState('')

  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  const fetchHabits = async () => {
    try {
      const res = await fetch(`${API_BASE}/habits`)
      if (res.ok) {
        const data = (await res.json()) as Habit[]
        setHabits(data)
        setLoadError('')
      } else {
        setLoadError('Failed to load habits')
      }
    } catch {
      setLoadError('Failed to load habits')
    }
  }

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics`)
      if (res.ok) {
        setAnalytics((await res.json()) as Analytics)
      }
    } catch {
      // silently ignore analytics fetch errors
    }
  }

  useEffect(() => {
    const load = async () => {
      await fetchHabits()
      await fetchAnalytics()
    }
    void load()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setNameError('')
    setSubmitError('')

    if (!name.trim()) {
      setNameError('Habit name is required')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/habits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), frequency }),
      })

      if (res.ok) {
        setName('')
        setFrequency('daily')
        await fetchHabits()
        await fetchAnalytics()
      } else {
        const data = (await res.json()) as { error?: string }
        setSubmitError(data.error ?? 'Failed to create habit')
      }
    } catch {
      setSubmitError('Failed to create habit')
    }
  }

  const handleMarkDone = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/habits/${id}/complete`, { method: 'POST' })
      if (res.ok) {
        await fetchHabits()
        await fetchAnalytics()
      }
    } catch {
      // silently ignore network errors on mark-done
    }
  }

  const startEdit = (habit: Habit) => {
    setEditingHabit(habit)
    setEditName(habit.name)
    setEditFrequency(habit.frequency as 'daily' | 'weekly')
    setEditNameError('')
    setEditSubmitError('')
  }

  const cancelEdit = () => {
    setEditingHabit(null)
    setEditNameError('')
    setEditSubmitError('')
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setEditNameError('')
    setEditSubmitError('')

    if (!editName.trim()) {
      setEditNameError('Habit name is required')
      return
    }

    if (!editingHabit) return

    try {
      const res = await fetch(`${API_BASE}/habits/${editingHabit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), frequency: editFrequency }),
      })

      if (res.ok) {
        setEditingHabit(null)
        await fetchHabits()
        await fetchAnalytics()
      } else {
        const data = (await res.json()) as { error?: string }
        setEditSubmitError(data.error ?? 'Failed to update habit')
      }
    } catch {
      setEditSubmitError('Failed to update habit')
    }
  }

  const handleArchive = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/habits/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchHabits()
        await fetchAnalytics()
      }
    } catch {
      // silently ignore network errors on archive
    }
  }

  const totalActive = habits.length
  const completedToday = habits.filter((h) => h.completedToday).length
  const completionPct = totalActive > 0 ? Math.round((completedToday / totalActive) * 100) : 0
  const longestStreak = habits.reduce((max, h) => Math.max(max, h.streak ?? 0), 0)

  return (
    <div className="app">
      <h1>Habit Tracker</h1>

      <section aria-label="Dashboard summary">
        <h2>Today's Summary</h2>
        <ul>
          <li>
            <span>Total Active Habits</span>
            <strong aria-label="Total active habits">{totalActive}</strong>
          </li>
          <li>
            <span>Completed Today</span>
            <strong aria-label="Habits completed today">{completedToday}</strong>
          </li>
          <li>
            <span>Completion</span>
            <strong aria-label="Completion percentage today">{completionPct}%</strong>
          </li>
          <li>
            <span>Longest Streak</span>
            <strong aria-label="Longest current streak">{longestStreak} {longestStreak === 1 ? 'day' : 'days'}</strong>
          </li>
        </ul>
      </section>

      <section aria-label="Weekly analytics">
        <h2>Weekly Analytics</h2>
        <ul>
          <li>
            <span>Weekly Completion</span>
            <strong aria-label="Weekly completion percentage">{analytics?.weeklyCompletionPct ?? 0}%</strong>
          </li>
          <li>
            <span>Habits Completed This Week</span>
            <strong aria-label="Habits completed this week">{analytics?.habitsCompletedThisWeek ?? 0}</strong>
          </li>
          <li>
            <span>Most Consistent Habit</span>
            <strong aria-label="Most consistent habit">{analytics?.mostConsistentHabit ?? '—'}</strong>
          </li>
        </ul>
      </section>

      <section aria-label="Create habit">
        <h2>Add a New Habit</h2>
        <form onSubmit={(e) => { void handleSubmit(e) }} noValidate>
          <div className="form-field">
            <label htmlFor="habit-name">Name</label>
            <input
              id="habit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning run"
              aria-describedby={nameError ? 'habit-name-error' : undefined}
              aria-invalid={nameError ? true : undefined}
            />
            {nameError && <span id="habit-name-error" className="field-error" role="alert">{nameError}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="habit-frequency">Frequency</label>
            <select
              id="habit-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly')}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          {submitError && <span role="alert">{submitError}</span>}
          <button type="submit">Add Habit</button>
        </form>
      </section>

      <section aria-label="Habit list">
        <h2>Your Habits</h2>
        {loadError && <p role="alert">{loadError}</p>}
        {!loadError && habits.length === 0 ? (
          <p>No habits yet. Create one above!</p>
        ) : (
          <ul>
            {habits.map((habit) => (
              <li key={habit.id} className="habit-list-item">
                {editingHabit?.id === habit.id ? (
                  <form onSubmit={(e) => { void handleEditSubmit(e) }} noValidate aria-label="Edit habit form">
                    <div className="form-field">
                      <label htmlFor={`edit-name-${habit.id}`}>Habit Name</label>
                      <input
                        id={`edit-name-${habit.id}`}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        aria-describedby={editNameError ? `edit-name-error-${habit.id}` : undefined}
                        aria-invalid={editNameError ? true : undefined}
                      />
                      {editNameError && <span id={`edit-name-error-${habit.id}`} className="field-error" role="alert">{editNameError}</span>}
                    </div>
                    <div className="form-field">
                      <label htmlFor={`edit-frequency-${habit.id}`}>Frequency</label>
                      <select
                        id={`edit-frequency-${habit.id}`}
                        value={editFrequency}
                        onChange={(e) => setEditFrequency(e.target.value as 'daily' | 'weekly')}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    {editSubmitError && <span role="alert">{editSubmitError}</span>}
                    <button type="submit">Save</button>
                    <button type="button" onClick={cancelEdit}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <span className="habit-info">
                      <strong>{habit.name}</strong> — {habit.frequency}
                      <span aria-label={`${habit.streak ?? 0} ${(habit.streak ?? 0) === 1 ? 'day' : 'days'} streak`}> 🔥 {habit.streak ?? 0} {(habit.streak ?? 0) === 1 ? 'day' : 'days'} streak</span>
                    </span>
                    <span className="habit-actions">
                      {habit.completedToday ? (
                        <span> ✓ Done today</span>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Mark done: ${habit.name}`}
                          onClick={() => { void handleMarkDone(habit.id) }}
                        >
                          Mark done
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Edit ${habit.name}`}
                        onClick={() => startEdit(habit)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label={`Archive ${habit.name}`}
                        onClick={() => { void handleArchive(habit.id) }}
                      >
                        Archive
                      </button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App
