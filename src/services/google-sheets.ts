/**
 * Google Sheets API wrapper for order data management
 * Manages the "NewOrder" table used by AppSheet (3-col schema: OrderNumber, Phone, Status)
 * Uses service account authentication
 */

import type { sheets_v4 } from 'googleapis'
import { google } from 'googleapis'
import { getConfig } from '@/config.ts'
import { logEvent } from '@/utils/logger.ts'
import { withRetry } from '@/utils/retry.ts'

export interface AppSheetOrderData {
  orderNumber: string
  phone: string
  status: string
}

export interface AppSheetRowData extends AppSheetOrderData {
  rowIndex: number
}

// Column mappings for NewOrder table (0-indexed)
const COLUMNS = {
  ORDER_NUMBER: 0,
  PHONE: 1,
  STATUS: 2,
} as const

const SHEET_RANGE = 'NewOrder'
let sheetsClient: sheets_v4.Sheets | null = null
let cachedSheetId: number | null = null

/**
 * Initialize Google Sheets client with service account
 */
function getClient(): sheets_v4.Sheets {
  if (sheetsClient) {
    return sheetsClient
  }

  const config = getConfig()

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.googleServiceAccountClientEmail,
      private_key: atob(config.googleServiceAccountPrivateKeyBase64),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  sheetsClient = google.sheets({ version: 'v4', auth })
  return sheetsClient
}

/**
 * Get the numeric sheet ID for batchUpdate operations (cached after first call)
 */
async function getSheetId(spreadsheetId: string): Promise<number> {
  if (cachedSheetId !== null) {
    return cachedSheetId
  }

  const client = getClient()
  const response = await client.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties',
  })

  const sheet = response.data.sheets?.find(
    s => s.properties?.title === SHEET_RANGE,
  )

  if (sheet?.properties?.sheetId == null) {
    throw new Error(`Sheet "${SHEET_RANGE}" not found`)
  }

  cachedSheetId = sheet.properties.sheetId
  return cachedSheetId
}

/**
 * Insert a new order row at the top of the NewOrder sheet (after header row)
 * Uses insert-then-write to avoid append overwrite issues and keeps newest orders on top
 */
export async function appendRow(orderData: AppSheetOrderData): Promise<void> {
  return withRetry(async () => {
    const config = getConfig()
    const client = getClient()

    try {
      const sheetId = await getSheetId(config.googleSheetsId)

      // Insert a blank row at index 1 (right after the header row)
      await client.spreadsheets.batchUpdate({
        spreadsheetId: config.googleSheetsId,
        requestBody: {
          requests: [{
            insertDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: 1,
                endIndex: 2,
              },
              inheritFromBefore: false,
            },
          }],
        },
      })

      // Write order data into the newly inserted row 2
      await client.spreadsheets.values.update({
        spreadsheetId: config.googleSheetsId,
        range: `${SHEET_RANGE}!A2:C2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[orderData.orderNumber, orderData.phone, orderData.status]],
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
    range: `${SHEET_RANGE}!A:C`,
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
        phone: String(row[COLUMNS.PHONE] ?? ''),
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
 * Targets column C (STATUS = index 2)
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

      // Update only the status column (C = index 2)
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
