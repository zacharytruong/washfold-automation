/**
 * Pancake POS API wrapper for order status updates
 * API docs: https://pos.pages.fm/api/v1
 */

import { getConfig } from '../config.ts'
import { logEvent } from '../utils/logger.ts'

const BASE_URL = 'https://pos.pages.fm/api/v1'

export interface PosOrderUpdateResponse {
  success: boolean
  message?: string
}

/**
 * Update order status in Pancake POS
 */
export async function updateOrderStatus(
  orderId: string,
  statusCode: number,
): Promise<PosOrderUpdateResponse> {
  const config = getConfig()
  const url = `${BASE_URL}/shops/${config.pancakeShopId}/orders/${orderId}`

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.pancakeApiKey}`,
      },
      body: JSON.stringify({ status: statusCode }),
    })

    const data = (await response.json()) as { message?: string }

    if (!response.ok) {
      const errorMessage = data.message || `HTTP ${response.status}`
      logEvent({
        eventType: 'pos:update',
        payload: { orderId, statusCode, response: data },
        status: 'error',
        error: errorMessage,
      })
      return { success: false, message: errorMessage }
    }

    logEvent({
      eventType: 'pos:update',
      payload: { orderId, statusCode },
      status: 'success',
    })

    return { success: true }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logEvent({
      eventType: 'pos:update',
      payload: { orderId, statusCode },
      status: 'error',
      error: errorMessage,
    })
    return { success: false, message: errorMessage }
  }
}

/**
 * Get order details from Pancake POS
 */
export async function getOrder(orderId: string): Promise<unknown | null> {
  const config = getConfig()
  const url = `${BASE_URL}/shops/${config.pancakeShopId}/orders/${orderId}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.pancakeApiKey}`,
      },
    })

    if (!response.ok) {
      logEvent({
        eventType: 'pos:get',
        payload: { orderId },
        status: 'error',
        error: `HTTP ${response.status}`,
      })
      return null
    }

    const data = await response.json()

    logEvent({
      eventType: 'pos:get',
      payload: { orderId },
      status: 'success',
    })

    return data
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logEvent({
      eventType: 'pos:get',
      payload: { orderId },
      status: 'error',
      error: errorMessage,
    })
    return null
  }
}
