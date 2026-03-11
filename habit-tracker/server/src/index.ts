import express from 'express'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/habits', (_req, res) => {
  // Placeholder — real implementation will query Prisma
  res.json([])
})

export { app }

// Only start the server when this file is run directly (not during tests)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
  })
}
