/**
 * Google Sheets API wrapper for order data management
 * Uses service account authentication
 */

import type { sheets_v4 } from 'googleapis'
import { google } from 'googleapis'
import { getConfig } from '../config.ts'
import { logEvent } from '../utils/logger.ts'

export interface OrderData {
  orderNumber: string
  estimatedDelivery: string
  deliveryOption: string
  status: string
  customerPhone: string
}

export interface SheetRowData extends OrderData {
  rowIndex: number
}

// Column mappings (0-indexed)
const COLUMNS = {
  ORDER_NUMBER: 0,
  ESTIMATED_DELIVERY: 1,
  DELIVERY_OPTION: 2,
  STATUS: 3,
  CUSTOMER_PHONE: 4,
} as const

const SHEET_RANGE = 'Sheet1'

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
 * Append a new order row to the sheet
 */
export async function appendRow(orderData: OrderData): Promise<void> {
  const config = getConfig()
  const client = getClient()

  try {
    await client.spreadsheets.values.append({
      spreadsheetId: config.googleSheetsId,
      range: `${SHEET_RANGE}!A:E`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            orderData.orderNumber,
            orderData.estimatedDelivery,
            orderData.deliveryOption,
            orderData.status,
            orderData.customerPhone,
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
}

/**
 * Find a row by order ID and return its data
 */
export async function findRowByOrderId(orderId: string): Promise<SheetRowData | null> {
  const config = getConfig()
  const client = getClient()

  try {
    const response = await client.spreadsheets.values.get({
      spreadsheetId: config.googleSheetsId,
      range: `${SHEET_RANGE}!A:E`,
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

      if (row[COLUMNS.ORDER_NUMBER] === orderId) {
        return {
          rowIndex: i + 1, // 1-indexed for Sheets API
          orderNumber: String(row[COLUMNS.ORDER_NUMBER] ?? ''),
          estimatedDelivery: String(row[COLUMNS.ESTIMATED_DELIVERY] ?? ''),
          deliveryOption: String(row[COLUMNS.DELIVERY_OPTION] ?? ''),
          status: String(row[COLUMNS.STATUS] ?? ''),
          customerPhone: String(row[COLUMNS.CUSTOMER_PHONE] ?? ''),
        }
      }
    }

    return null
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logEvent({
      eventType: 'sheets:find',
      payload: { orderId },
      status: 'error',
      error: errorMessage,
    })
    throw error
  }
}

/**
 * Update status for a specific order
 */
export async function updateStatus(orderId: string, status: string): Promise<boolean> {
  const config = getConfig()
  const client = getClient()

  try {
    const row = await findRowByOrderId(orderId)
    if (!row) {
      logEvent({
        eventType: 'sheets:update',
        payload: { orderId, status },
        status: 'warning',
        error: 'Order not found',
      })
      return false
    }

    // Update only the status column (D)
    const statusColumn = String.fromCharCode(65 + COLUMNS.STATUS) // 'D'
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
      payload: { orderId, status, rowIndex: row.rowIndex },
      status: 'success',
    })

    return true
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logEvent({
      eventType: 'sheets:update',
      payload: { orderId, status },
      status: 'error',
      error: errorMessage,
    })
    throw error
  }
}
