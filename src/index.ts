import { Hono } from 'hono'
import { getPort, isDev, validateConfig } from './config.ts'

// Validate config at startup in production (fail fast)
if (!isDev()) {
  validateConfig()
}

const app = new Hono()

app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'washfold-automation' })
})

app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

const port = getPort()

console.log(`🚀 Server starting on port ${port}`)

export default {
  port,
  fetch: app.fetch,
}
