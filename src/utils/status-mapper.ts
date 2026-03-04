/**
 * Status mapping between Pancake POS and AppSheet
 * Handles sync triggers: POS→AppSheet on specific events only
 * AppSheet workflow: Arrived → Washed → Dried → Folded → Storage / Ready → Delivery → Delivered
 */

// POS status codes from Pancake API
export const POS_STATUSES = {
  NEW: 0,
  CONFIRMED: 1,
  SHIPPED: 2,
  RECEIVED: 3,
  // TODO: verify CANCELLED code via Pancake API docs or test cancellation webhook
  CANCELLED: 4,
  RETURNED: 5,
  PACKAGING: 8,
  WAITING: 9,
} as const

// AppSheet workflow statuses (in order)
export const APPSHEET_STATUSES = {
  ARRIVED: 'Arrived',
  STORAGE_READY: 'Lưu kho / STORAGE',
  DELIVERY: 'Delivery',
  DELIVERED: 'Delivered',
} as const

export type PosStatusCode = (typeof POS_STATUSES)[keyof typeof POS_STATUSES]
export type AppSheetStatus = (typeof APPSHEET_STATUSES)[keyof typeof APPSHEET_STATUSES]

/**
 * Check if POS status should create a new AppSheet entry
 * POS NEW (0) triggers entry creation with "Arrived" status
 */
export function shouldCreateAppSheetEntry(posStatusCode: number): boolean {
  return posStatusCode === POS_STATUSES.NEW
}

/**
 * Check if POS status should cancel the AppSheet entry
 * POS CANCELLED (4) triggers marking the row as "Cancelled"
 * NOTE: verify CANCELLED code — may differ in production
 */
export function shouldCancelAppSheetEntry(posStatusCode: number): boolean {
  return posStatusCode === POS_STATUSES.CANCELLED
}

/**
 * Check if AppSheet status should trigger POS update to "Delivered"
 * "Delivery" status triggers POS update to RECEIVED (3)
 */
export function shouldMarkDelivered(appSheetStatus: string): boolean {
  return appSheetStatus === APPSHEET_STATUSES.DELIVERY
}

/**
 * Get the POS status code for "Delivered / Received"
 */
export function getPosDeliveredCode(): number {
  return POS_STATUSES.RECEIVED // code 3
}

/**
 * Check if AppSheet status should trigger POS update + WhatsApp notification
 * Only "Storage / Ready" triggers POS update to Wait for pickup (9)
 */
export function shouldUpdatePosStatus(appSheetStatus: string): boolean {
  return appSheetStatus === APPSHEET_STATUSES.STORAGE_READY
}

/**
 * Get the POS status code for "Wait for pickup"
 */
export function getPosWaitForPickupCode(): number {
  return POS_STATUSES.WAITING
}

/**
 * Get human-readable POS status name
 */
export function getPosStatusName(posCode: number): string {
  const entry = Object.entries(POS_STATUSES).find(([, code]) => code === posCode)
  return entry ? entry[0] : `UNKNOWN_${posCode}`
}

/**
 * Get all valid POS status codes
 */
export function getAllPosStatusCodes(): number[] {
  return Object.values(POS_STATUSES)
}
