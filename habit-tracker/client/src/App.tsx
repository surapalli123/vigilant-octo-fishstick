import { useState, useEffect, type FormEvent } from 'react'

interface Habit {
  id: number
  name: string
  frequency: string
  active: boolean
  completedToday: boolean
}

const API_BASE = '/api'

function App() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loadError, setLoadError] = useState('')
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily')
  const [nameError, setNameError] = useState('')
  const [submitError, setSubmitError] = useState('')

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

  useEffect(() => {
    void fetchHabits()
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
      }
    } catch {
      // silently ignore network errors on mark-done
    }
  }

  return (
    <div className="app">
      <h1>Habit Tracker</h1>

      <section aria-label="Create habit">
        <h2>Add a New Habit</h2>
        <form onSubmit={(e) => { void handleSubmit(e) }} noValidate>
          <div>
            <label htmlFor="habit-name">Name</label>
            <input
              id="habit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning run"
            />
            {nameError && <span role="alert">{nameError}</span>}
          </div>
          <div>
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
              <li key={habit.id}>
                <strong>{habit.name}</strong> — {habit.frequency}
                {!habit.active && ' (inactive)'}
                {habit.completedToday ? (
                  <span> ✓ Done today</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => { void handleMarkDone(habit.id) }}
                  >
                    Mark done
                  </button>
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
