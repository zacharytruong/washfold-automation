import { describe, expect, test } from 'bun:test'
import { appsheetWebhookSchema } from '@/schemas/appsheet-webhook.schema.ts'

describe('appsheet-webhook-schema', () => {
  test('validates a correct payload', () => {
    const result = appsheetWebhookSchema.safeParse({
      order_number: 12345,
      status: 'Lưu kho / STORAGE',
      phone: '0987654321',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.order_number).toBe('12345')
      expect(result.data.status).toBe('Lưu kho / STORAGE')
      expect(result.data.phone).toBe('0987654321')
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

  test('validates Delivery status with phone', () => {
    const result = appsheetWebhookSchema.safeParse({
      order_number: '12345',
      status: 'Delivery',
      phone: '0987654321',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('Delivery')
      expect(result.data.phone).toBe('0987654321')
    }
  })

  test('accepts missing phone (optional field)', () => {
    const result = appsheetWebhookSchema.safeParse({
      order_number: '12345',
      status: 'Delivery',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.phone).toBeUndefined()
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
