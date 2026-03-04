/**
 * TypeScript types for Pancake POS order webhook payload
 * Derived from raw webhook data sent by Pancake POS system
 */

// Reusable sub-types

export interface PancakeUser {
  avatar_url: string | null
  email: string | null
  fb_id: string | null
  id: string
  name: string
  phone_number: string | null
}

export interface PancakeShippingAddress {
  address: string | null
  commnue_name: string | null
  commune_code_sicepat: string | null
  commune_id: string | null
  commune_name: string | null
  country_code: string | null
  district_id: string | null
  district_name: string | null
  full_address: string | null
  full_name: string | null
  marketplace_address: string | null
  new_commune_id: string | null
  new_full_address: string | null
  new_province_id: string | null
  phone_number: string | null
  post_code: string | null
  province_id: string | null
  province_name: string | null
  render_type: string | null
}

export interface PancakePage {
  id: string
  name: string
  username: string
}

export interface PancakeCustomerAddress {
  [key: string]: unknown
}

export interface PancakeCustomer {
  fb_id: string | null
  returned_order_count: number
  name: string
  conversation_link: string | null
  assigned_user_id: string | null
  username: string | null
  is_discount_by_level: boolean
  count_referrals: number
  emails: string[]
  tags: string[]
  used_reward_point: number
  id: string
  order_sources: string[]
  phone_numbers: string[]
  is_block: boolean
  reward_point: number
  purchased_amount: number
  gender: string | null
  referral_code: string | null
  creator_id: string | null
  inserted_at: string
  shop_id: number
  last_order_at: string | null
  is_adjust_debts: boolean | null
  shop_customer_addresses: PancakeCustomerAddress[]
  order_count: number
  notes: string[]
  currency: string
  date_of_birth: string | null
  level: string | null
  list_voucher: unknown[]
  user_block_id: string | null
  succeed_order_count: number
  current_debts: number
  active_levera_pay: boolean
  customer_id: string
  updated_at: string
  conversation_tags: string | null
  total_amount_referred: number | null
}

export interface PancakeStatusHistoryEntry {
  avatar_url: string | null
  editor: PancakeUser | null
  editor_fb: string | null
  editor_id: string | null
  name: string | null
  old_status: number | null
  status: number
  updated_at: string
}

export interface PancakeWarehouseInfo {
  address: string | null
  affiliate_id: string | null
  commune_id: string | null
  custom_id: string | null
  district_id: string | null
  ffm_id: string | null
  full_address: string | null
  has_snappy_service: boolean
  name: string
  phone_number: string | null
  postcode: string | null
  province_id: string | null
  settings: unknown | null
}

export interface PancakeBotcakeInfo {
  order_id: string
  request_id: string
}

export interface PancakeHistoryEntry {
  editor_id: string | null
  updated_at: string
  [key: string]: unknown
}

export interface PancakePrepaidByPoint {
  money: number
  point: number
}

export interface PancakeOrderItemVariationInfo {
  [key: string]: unknown
}

export interface PancakeOrderItem {
  added_to_cart_quantity: number
  components: unknown | null
  composite_item_id: string | null
  discount_each_product: number
  exchange_count: number
  id: number
  is_bonus_product: boolean
  is_composite: boolean
  is_discount_percent: boolean
  is_wholesale: boolean
  measure_group_id: number
  note: string | null
  note_product: string
  one_time_product: boolean
  product_id: string
  quantity: number
  return_quantity: number
  returned_count: number
  returning_quantity: number
  same_price_discount: number
  total_discount: number
  variation_id: string
  variation_info: PancakeOrderItemVariationInfo
}

// Main order payload type

export interface PancakeOrderPayload {
  // Order identifiers
  id: string
  type: string
  system_id: number
  event_type: string

  // Status
  status: number
  status_name: string
  sub_status: number | null

  // Pricing
  total_price: number
  total_price_after_sub_discount: number
  total_discount: number
  order_currency: string
  shipping_fee: number
  surcharge: number
  tax: number
  cod: number
  money_to_collect: number
  fee_marketplace: number
  partner_fee: number
  return_fee: number | null

  // Payment
  cash: number
  transfer_money: number
  prepaid: number
  charged_by_momo: number
  charged_by_card: number
  charged_by_qrpay: number
  exchange_payment: number
  exchange_value: number
  bank_payments: Record<string, unknown>
  payment_purchase_histories: unknown[]
  prepaid_by_point: PancakePrepaidByPoint
  buyer_total_amount: number | null
  customer_pay_fee: boolean
  levera_point: number

  // Customer / billing info
  bill_full_name: string
  bill_phone_number: string
  bill_email: string | null
  customer: PancakeCustomer
  customer_referral_code: string | null

  // Shipping
  shipping_address: PancakeShippingAddress
  tracking_link: string | null
  estimate_delivery_date: string | null
  is_free_shipping: boolean
  received_at_shop: boolean

  // Items
  items: PancakeOrderItem[]
  items_length: number
  total_quantity: number
  activated_combo_products: unknown[]

  // Page / account
  page: PancakePage
  page_id: string
  account: string
  account_name: string
  shop_id: number

  // Source / marketing
  order_sources: string
  order_sources_name: string
  conversation_id: string
  ad_id: string | null
  ads_source: string | null
  p_utm_source: string | null
  p_utm_medium: string | null
  p_utm_campaign: string | null
  p_utm_content: string | null
  p_utm_term: string | null
  p_utm_id: string | null
  pke_mkter: string | null
  marketer: unknown | null
  is_livestream: boolean
  is_live_shopping: boolean
  post_id: string | null
  link: string | null
  marketplace_id: string | null

  // Assignments
  assigning_seller: PancakeUser | null
  assigning_seller_id: string | null
  assigning_care: PancakeUser | null
  assigning_care_id: string | null
  time_assign_seller: string | null
  time_assign_care: string | null
  last_editor: PancakeUser | null
  creator: PancakeUser | null

  // Notes
  note: string | null
  note_image: string | null
  note_print: string | null

  // Warehouse
  warehouse_id: string | null
  warehouse_info: PancakeWarehouseInfo

  // History / status tracking
  status_history: PancakeStatusHistoryEntry[]
  histories: PancakeHistoryEntry[]

  // Tags / metadata
  tags: string[]
  customer_needs: unknown[]

  // Timestamps
  inserted_at: string
  updated_at: string

  // External integrations
  botcake_info: PancakeBotcakeInfo
  order_link: string

  // Returns / exchanges
  is_exchange_order: boolean
  returned_reason: string | null
  returned_reason_name: string | null

  // Other
  additional_info: { service_partner: string | null }
  advanced_platform_fee: Record<string, unknown>
  activated_promotion_advances: unknown[]
  time_send_partner: string | null
  partner: unknown | null
  is_smc: boolean

  // Computed by Pancake (used internally)
  [key: string]: unknown
}
