/**
 * Bidirectional status mapping between Pancake POS and AppSheet
 * Handles unmapped statuses via pass-through with logging capability
 */

// POS status codes from Pancake API
export const POS_STATUSES = {
  NEW: 0,
  CONFIRMED: 3,
  PACKAGING: 8,
  WAITING: 9,
  SHIPPED: 11,
  RECEIVED: 12,
  RETURNED: 20,
} as const

// AppSheet status strings
export const APPSHEET_STATUSES = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  DELIVERING: 'Delivering',
  DELIVERED: 'Delivered',
} as const

export type PosStatusCode = (typeof POS_STATUSES)[keyof typeof POS_STATUSES]
export type AppSheetStatus = (typeof APPSHEET_STATUSES)[keyof typeof APPSHEET_STATUSES]

// Mapping: POS code -> AppSheet status
const POS_TO_APPSHEET: Record<number, AppSheetStatus> = {
  [POS_STATUSES.NEW]: APPSHEET_STATUSES.PENDING,
  [POS_STATUSES.CONFIRMED]: APPSHEET_STATUSES.PROCESSING,
  [POS_STATUSES.SHIPPED]: APPSHEET_STATUSES.DELIVERING,
  [POS_STATUSES.RECEIVED]: APPSHEET_STATUSES.DELIVERED,
}

// Mapping: AppSheet status -> POS code
const APPSHEET_TO_POS: Record<string, PosStatusCode> = {
  [APPSHEET_STATUSES.PENDING]: POS_STATUSES.NEW,
  [APPSHEET_STATUSES.PROCESSING]: POS_STATUSES.CONFIRMED,
  [APPSHEET_STATUSES.DELIVERING]: POS_STATUSES.SHIPPED,
  [APPSHEET_STATUSES.DELIVERED]: POS_STATUSES.RECEIVED,
}

/**
 * Convert POS status code to AppSheet status string
 * Returns original code as string if unmapped (pass-through)
 */
export function posToAppSheet(posCode: number): string {
  const mapped = POS_TO_APPSHEET[posCode]
  if (mapped) {
    return mapped
  }
  // Pass-through unmapped statuses as string representation
  return `Unknown(${posCode})`
}

/**
 * Convert AppSheet status to POS code
 * Returns null if status string is not recognized
 */
export function appSheetToPos(appSheetStatus: string): PosStatusCode | null {
  const mapped = APPSHEET_TO_POS[appSheetStatus]
  return mapped ?? null
}

/**
 * Check if a POS status code has a known AppSheet mapping
 */
export function isKnownPosStatus(posCode: number): boolean {
  return posCode in POS_TO_APPSHEET
}

/**
 * Check if an AppSheet status has a known POS mapping
 */
export function isKnownAppSheetStatus(status: string): boolean {
  return status in APPSHEET_TO_POS
}

/**
 * Get all valid POS status codes
 */
export function getAllPosStatusCodes(): number[] {
  return Object.values(POS_STATUSES)
}

/**
 * Get human-readable POS status name
 */
export function getPosStatusName(posCode: number): string {
  const entry = Object.entries(POS_STATUSES).find(([, code]) => code === posCode)
  return entry ? entry[0] : `UNKNOWN_${posCode}`
}
