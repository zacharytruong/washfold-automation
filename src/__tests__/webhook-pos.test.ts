import { describe, expect, test } from 'bun:test'
import { posWebhookSchema } from '@/schemas/pos-webhook.schema.ts'

/** Minimal valid Pancake POS payload for testing */
function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    id: '99991',
    type: 'orders',
    event_type: 'update',
    system_id: 91,
    status: 0,
    status_name: 'new',
    total_price: 194400,
    total_discount: 0,
    shipping_fee: 0,
    cod: 194400,
    order_currency: 'VND',
    bill_full_name: 'Mỹ Nhuỵ',
    bill_phone_number: '4406661955',
    customer: {
      id: '693ace3e-84dd-4949-84ec-2c51ab6a5352',
      customer_id: '78eaa4e6-034d-4d21-8eb7-af9f3808564b',
      name: 'Zach T',
      phone_numbers: ['0987654321', '4406661955'],
      emails: [],
      order_count: 7,
      current_debts: 194400,
    },
    shipping_address: {
      address: '21 Bùi Viện',
      full_address: '21 Bùi Viện, Phường An Khánh, Hồ Chí Minh',
      full_name: 'Mỹ Nhuỵ',
      phone_number: '4406661955',
      commune_name: 'Phường An Khánh',
      province_name: 'Hồ Chí Minh',
      province_id: '84_VN129',
      country_code: '84',
    },
    items: [
      {
        id: 11245888233,
        product_id: '6a51b9fa-b873-4288-bfd7-f7632b1ebcff',
        variation_id: '6942e57e-cd69-4cee-80aa-45374eaa0e8a',
        quantity: 1,
        discount_each_product: 0,
        total_discount: 0,
      },
    ],
    items_length: 1,
    total_quantity: 1,
    page: {
      id: 'waba_293221153866535',
      name: 'WASH&FOLD',
      username: 'waba_84888824477',
    },
    page_id: 'waba_293221153866535',
    shop_id: 1635934121,
    account: 'waba_293221153866535',
    account_name: 'WASH&FOLD',
    order_sources: '-10',
    order_sources_name: 'Whatsapp',
    conversation_id: 'waba_293221153866535_14406661944',
    inserted_at: '2026-03-02T13:49:02.815244',
    updated_at: '2026-03-02T14:00:25.424875',
    status_history: [
      {
        status: 0,
        old_status: null,
        updated_at: '2026-03-02T13:49:02',
        editor_id: null,
        name: null,
      },
    ],
    botcake_info: {
      order_id: '938ME7GUI',
      request_id: '7ESQG29M9',
    },
    order_link: 'https://pos.pages.fm/shop/1635934121/order?order_id=90085038186240',
    assigning_seller: {
      id: '70ca0265-383c-4166-8ceb-08d58db1a6f7',
      name: 'WF Bookings',
      avatar_url: null,
      email: 'bookings@washfold.info',
      fb_id: null,
      phone_number: null,
    },
    assigning_seller_id: '70ca0265-383c-4166-8ceb-08d58db1a6f7',
    last_editor: {
      id: '70ca0265-383c-4166-8ceb-08d58db1a6f7',
      name: 'WF Bookings',
      avatar_url: null,
      email: 'bookings@washfold.info',
      fb_id: null,
      phone_number: null,
    },
    ...overrides,
  }
}

describe('pos-webhook-schema', () => {
  test('validates a correct payload', () => {
    const result = posWebhookSchema.safeParse(makePayload())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('99991')
      expect(result.data.status).toBe(0)
      expect(result.data.status_name).toBe('new')
      expect(result.data.total_price).toBe(194400)
    }
  })

  test('parses customer data correctly', () => {
    const result = posWebhookSchema.safeParse(makePayload())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.customer.name).toBe('Zach T')
      expect(result.data.customer.phone_numbers).toEqual(['0987654321', '4406661955'])
      expect(result.data.customer.order_count).toBe(7)
    }
  })

  test('parses items correctly', () => {
    const result = posWebhookSchema.safeParse(makePayload())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toHaveLength(1)
      expect(result.data.items[0]!.quantity).toBe(1)
      expect(result.data.items[0]!.product_id).toBe('6a51b9fa-b873-4288-bfd7-f7632b1ebcff')
    }
  })

  test('allows extra fields via passthrough', () => {
    const result = posWebhookSchema.safeParse(makePayload({ extra_field: 'test' }))
    expect(result.success).toBe(true)
  })

  test('accepts null assigning_seller', () => {
    const result = posWebhookSchema.safeParse(makePayload({
      assigning_seller: null,
      assigning_seller_id: null,
    }))
    expect(result.success).toBe(true)
  })

  test('validates status 0 (New)', () => {
    const result = posWebhookSchema.safeParse(makePayload({ status: 0, status_name: 'new' }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe(0)
    }
  })

  test('rejects missing required fields', () => {
    const result = posWebhookSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('rejects non-number status', () => {
    const result = posWebhookSchema.safeParse(makePayload({ status: 'confirmed' }))
    expect(result.success).toBe(false)
  })

  test('rejects missing items array', () => {
    const { items, ...noItems } = makePayload()
    const result = posWebhookSchema.safeParse(noItems)
    expect(result.success).toBe(false)
  })
})
