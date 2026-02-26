import { describe, expect, test } from 'bun:test'
import { posWebhookSchema } from '../schemas/pos-webhook.schema.ts'

describe('pos-webhook-schema', () => {
  const validPayload = {
    order_number: 12345,
    customer_phone: '+84384123456',
    goi_dich_vu: '5kg',
    delivery: 'Same-day Delivery',
    so_luong_mon: 3,
    do_uot: false,
    status: 3,
  }

  test('validates a correct payload', () => {
    const result = posWebhookSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.order_number).toBe('12345')
      expect(result.data.status).toBe(3)
      expect(result.data.do_uot).toBe(false)
    }
  })

  test('coerces order_number from number to string', () => {
    const result = posWebhookSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.order_number).toBe('12345')
    }
  })

  test('accepts string order_number', () => {
    const result = posWebhookSchema.safeParse({ ...validPayload, order_number: 'ORD-123' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.order_number).toBe('ORD-123')
    }
  })

  test('defaults do_uot to false when missing', () => {
    const { do_uot: _, ...withoutDoUot } = validPayload
    const result = posWebhookSchema.safeParse(withoutDoUot)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.do_uot).toBe(false)
    }
  })

  test('rejects missing required fields', () => {
    const result = posWebhookSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('rejects missing customer_phone', () => {
    const { customer_phone: _, ...withoutPhone } = validPayload
    const result = posWebhookSchema.safeParse(withoutPhone)
    expect(result.success).toBe(false)
  })

  test('rejects non-number status', () => {
    const result = posWebhookSchema.safeParse({ ...validPayload, status: 'confirmed' })
    expect(result.success).toBe(false)
  })
})
