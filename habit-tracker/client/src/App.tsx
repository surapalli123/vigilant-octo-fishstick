import { useState, useEffect, type FormEvent } from 'react'

interface Habit {
  id: number
  name: string
  frequency: string
  active: boolean
  completedToday: boolean
  streak?: number
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
      }
    } catch {
      // silently ignore network errors on archive
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
                {editingHabit?.id === habit.id ? (
                  <form onSubmit={(e) => { void handleEditSubmit(e) }} noValidate aria-label="Edit habit form">
                    <div>
                      <label htmlFor={`edit-name-${habit.id}`}>Habit Name</label>
                      <input
                        id={`edit-name-${habit.id}`}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      {editNameError && <span role="alert">{editNameError}</span>}
                    </div>
                    <div>
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
                    <strong>{habit.name}</strong> — {habit.frequency}
                    <span aria-label={`${habit.streak ?? 0} ${(habit.streak ?? 0) === 1 ? 'day' : 'days'} streak`}> 🔥 {habit.streak ?? 0} {(habit.streak ?? 0) === 1 ? 'day' : 'days'} streak</span>
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
                    <button
                      type="button"
                      onClick={() => startEdit(habit)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleArchive(habit.id) }}
                    >
                      Archive
                    </button>
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
