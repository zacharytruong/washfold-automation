/**
 * Zod schema for Pancake POS webhook payload validation
 * Validates essential fields; uses loose for the full payload
 */

import { z } from 'zod'

// Nested object schemas

const pancakeUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  email: z.string().nullable(),
  fb_id: z.string().nullable(),
  phone_number: z.string().nullable(),
}).loose()

const shippingAddressSchema = z.object({
  address: z.string().nullable(),
  full_address: z.string().nullable(),
  full_name: z.string().nullable(),
  phone_number: z.string().nullable(),
  commune_name: z.string().nullable(),
  province_name: z.string().nullable(),
  province_id: z.string().nullable(),
  country_code: z.string().nullable(),
}).loose()

const pageSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
})

const customerSchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  name: z.string(),
  phone_numbers: z.array(z.string()),
  emails: z.array(z.string()),
  order_count: z.number(),
  current_debts: z.number(),
}).loose()

const orderItemSchema = z.object({
  id: z.number(),
  product_id: z.string(),
  variation_id: z.string(),
  quantity: z.number(),
  discount_each_product: z.number(),
  total_discount: z.number(),
}).loose()

const statusHistoryEntrySchema = z.object({
  status: z.number(),
  old_status: z.number().nullable(),
  updated_at: z.string(),
  editor_id: z.string().nullable(),
  name: z.string().nullable(),
}).loose()

const botcakeInfoSchema = z.object({
  order_id: z.string(),
  request_id: z.string(),
})

// Main Pancake POS webhook payload schema

export const posWebhookSchema = z.object({
  // Order identifiers
  id: z.string(),
  type: z.string(),
  event_type: z.string(),
  system_id: z.number(),

  // Status
  status: z.number(),
  status_name: z.string(),

  // Pricing
  total_price: z.number(),
  total_discount: z.number(),
  shipping_fee: z.number(),
  cod: z.number(),
  order_currency: z.string(),

  // Customer & billing
  bill_full_name: z.string(),
  bill_phone_number: z.string(),
  customer: customerSchema,
  shipping_address: shippingAddressSchema,

  // Items
  items: z.array(orderItemSchema),
  items_length: z.number(),
  total_quantity: z.number(),

  // Page / account
  page: pageSchema,
  page_id: z.string(),
  shop_id: z.number(),
  account: z.string(),
  account_name: z.string(),

  // Source
  order_sources: z.string(),
  order_sources_name: z.string(),
  conversation_id: z.string(),

  // Timestamps
  inserted_at: z.string(),
  updated_at: z.string(),

  // History
  status_history: z.array(statusHistoryEntrySchema),

  // Integrations
  botcake_info: botcakeInfoSchema,
  order_link: z.string(),

  // Assignments (nullable)
  assigning_seller: pancakeUserSchema.nullable(),
  assigning_seller_id: z.string().nullable(),
  last_editor: pancakeUserSchema.nullable(),
}).loose()

export type PosWebhookPayload = z.infer<typeof posWebhookSchema>
