/**
 * Google Sheets API wrapper for order data management
 * Manages the "Arrival" table used by AppSheet
 * Uses service account authentication
 */

import type { sheets_v4 } from 'googleapis'
import { google } from 'googleapis'
import { getConfig } from '@/config.ts'
import { logEvent } from '@/utils/logger.ts'
import { withRetry } from '@/utils/retry.ts'

export interface AppSheetOrderData {
  orderNumber: string
  goiDichVu: string
  delivery: string
  soLuongMon: number
  doUot: boolean
  customerPhone: string
  status: string
}

export interface AppSheetRowData extends AppSheetOrderData {
  rowIndex: number
}

// Column mappings for Arrival table (0-indexed)
const COLUMNS = {
  ORDER_NUMBER: 0,
  GOI_DICH_VU: 1,
  DELIVERY: 2,
  SO_LUONG_MON: 3,
  DO_UOT: 4,
  CUSTOMER_PHONE: 5,
  STATUS: 6,
} as const

const SHEET_RANGE = 'NewOrder'
let sheetsClient: sheets_v4.Sheets | null = null

/**
 * Initialize Google Sheets client with service account
 */
function getClient(): sheets_v4.Sheets {
  if (sheetsClient) {
    return sheetsClient
  }

  const config = getConfig()
  const credentials = JSON.parse(config.googleServiceAccountJson)

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  sheetsClient = google.sheets({ version: 'v4', auth })
  return sheetsClient
}

/**
 * Append a new order row to the Arrival sheet
 */
export async function appendRow(orderData: AppSheetOrderData): Promise<void> {
  return withRetry(async () => {
    const config = getConfig()
    const client = getClient()

    try {
      await client.spreadsheets.values.append({
        spreadsheetId: config.googleSheetsId,
        range: `${SHEET_RANGE}!A:G`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              orderData.orderNumber,
              orderData.goiDichVu,
              orderData.delivery,
              orderData.soLuongMon,
              orderData.doUot ? 'TRUE' : 'FALSE',
              orderData.customerPhone,
              orderData.status,
            ],
          ],
        },
      })

      logEvent({
        eventType: 'sheets:append',
        payload: { orderNumber: orderData.orderNumber },
        status: 'success',
      })
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logEvent({
        eventType: 'sheets:append',
        payload: { orderNumber: orderData.orderNumber },
        status: 'error',
        error: errorMessage,
      })
      throw error
    }
  }, 'sheets:appendRow')
}

/**
 * Internal find without retry — used by sibling functions to avoid nested retry amplification
 */
async function findRowInternal(orderNumber: string): Promise<AppSheetRowData | null> {
  const config = getConfig()
  const client = getClient()

  const response = await client.spreadsheets.values.get({
    spreadsheetId: config.googleSheetsId,
    range: `${SHEET_RANGE}!A:G`,
  })

  const rows = response.data.values

  if (!rows || rows.length === 0) {
    return null
  }

  // Skip header row (index 0), data starts at index 1
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) {
      continue
    }

    if (String(row[COLUMNS.ORDER_NUMBER]) === orderNumber) {
      return {
        rowIndex: i + 1, // 1-indexed for Sheets API
        orderNumber: String(row[COLUMNS.ORDER_NUMBER] ?? ''),
        goiDichVu: String(row[COLUMNS.GOI_DICH_VU] ?? ''),
        delivery: String(row[COLUMNS.DELIVERY] ?? ''),
        soLuongMon: Number(row[COLUMNS.SO_LUONG_MON] ?? 0),
        doUot: String(row[COLUMNS.DO_UOT]).toUpperCase() === 'TRUE',
        customerPhone: String(row[COLUMNS.CUSTOMER_PHONE] ?? ''),
        status: String(row[COLUMNS.STATUS] ?? ''),
      }
    }
  }

  return null
}

/**
 * Find a row by order number and return its data
 */
export async function findRowByOrderNumber(orderNumber: string): Promise<AppSheetRowData | null> {
  return withRetry(async () => {
    try {
      return await findRowInternal(orderNumber)
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logEvent({
        eventType: 'sheets:find',
        payload: { orderNumber },
        status: 'error',
        error: errorMessage,
      })
      throw error
    }
  }, 'sheets:findRowByOrderNumber')
}

/**
 * Update status for a specific order by order number
 */
export async function updateStatus(orderNumber: string, status: string): Promise<boolean> {
  return withRetry(async () => {
    const config = getConfig()
    const client = getClient()

    try {
      const row = await findRowInternal(orderNumber)
      if (!row) {
        logEvent({
          eventType: 'sheets:update',
          payload: { orderNumber, status },
          status: 'warning',
          error: 'Order not found',
        })
        return false
      }

      // Update only the status column (G = index 6)
      const statusColumn = String.fromCharCode(65 + COLUMNS.STATUS)
      await client.spreadsheets.values.update({
        spreadsheetId: config.googleSheetsId,
        range: `${SHEET_RANGE}!${statusColumn}${row.rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[status]],
        },
      })

      logEvent({
        eventType: 'sheets:update',
        payload: { orderNumber, status, rowIndex: row.rowIndex },
        status: 'success',
      })

      return true
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logEvent({
        eventType: 'sheets:update',
        payload: { orderNumber, status },
        status: 'error',
        error: errorMessage,
      })
      throw error
    }
  }, 'sheets:updateStatus')
}

/**
 * Get customer phone number for a specific order
 * Used for WhatsApp notifications when AppSheet triggers "Storage / Ready"
 */
export async function getCustomerPhone(orderNumber: string): Promise<string | null> {
  return withRetry(async () => {
    try {
      const row = await findRowInternal(orderNumber)
      if (!row || !row.customerPhone) {
        logEvent({
          eventType: 'sheets:getPhone',
          payload: { orderNumber },
          status: 'warning',
          error: 'Customer phone not found',
        })
        return null
      }
      return row.customerPhone
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logEvent({
        eventType: 'sheets:getPhone',
        payload: { orderNumber },
        status: 'error',
        error: errorMessage,
      })
      throw error
    }
  }, 'sheets:getCustomerPhone')
}

export async function getColumnNames(): Promise<string[]> {
  const config = getConfig()
  const client = getClient()
  const res = await client.spreadsheets.values.get({
    spreadsheetId: config.googleSheetsId,
    range: `${SHEET_RANGE}!1:1`,
  })
  console.log((res.data.values?.[0] ?? []).map(String))
  return (res.data.values?.[0] ?? []).map(String)
}
