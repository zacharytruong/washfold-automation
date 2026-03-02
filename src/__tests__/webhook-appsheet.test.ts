import { describe, expect, test } from 'bun:test'
import { appsheetWebhookSchema } from '@/schemas/appsheet-webhook.schema.ts'

describe('appsheet-webhook-schema', () => {
  test('validates a correct payload', () => {
    const result = appsheetWebhookSchema.safeParse({
      order_number: 12345,
      status: 'Storage / Ready',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.order_number).toBe('12345')
      expect(result.data.status).toBe('Storage / Ready')
    }
  })

  test('accepts string order_number', () => {
    const result = appsheetWebhookSchema.safeParse({
      order_number: 'ORD-456',
      status: 'Arrived',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.order_number).toBe('ORD-456')
    }
  })

  test('rejects missing order_number', () => {
    const result = appsheetWebhookSchema.safeParse({ status: 'Arrived' })
    expect(result.success).toBe(false)
  })

  test('rejects missing status', () => {
    const result = appsheetWebhookSchema.safeParse({ order_number: 123 })
    expect(result.success).toBe(false)
  })

  test('rejects empty status', () => {
    const result = appsheetWebhookSchema.safeParse({ order_number: 123, status: '' })
    expect(result.success).toBe(false)
  })

  test('rejects empty payload', () => {
    const result = appsheetWebhookSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
