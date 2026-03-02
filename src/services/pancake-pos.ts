/**
 * Pancake POS API wrapper for order status updates
 * API docs: https://pos.pages.fm/api/v1
 */

import { getConfig } from '@/config.ts'
import { logEvent } from '@/utils/logger.ts'
import { withRetry } from '@/utils/retry.ts'

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
  return withRetry(async () => {
    const config = getConfig()
    const url = `${BASE_URL}/shops/${config.pancakeShopId}/orders/${orderId}`

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
      // Throw on server errors so retry kicks in; return failure for client errors
      if (response.status >= 500) {
        throw new Error(errorMessage)
      }
      return { success: false, message: errorMessage }
    }

    logEvent({
      eventType: 'pos:update',
      payload: { orderId, statusCode },
      status: 'success',
    })

    return { success: true }
  }, 'pos:updateOrderStatus')
}

/**
 * Get order details from Pancake POS
 */
export async function getOrder(orderId: string): Promise<unknown | null> {
  return withRetry(async () => {
    const config = getConfig()
    const url = `${BASE_URL}/shops/${config.pancakeShopId}/orders/${orderId}`

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
      if (response.status >= 500) {
        throw new Error(`HTTP ${response.status}`)
      }
      return null
    }

    const data = await response.json()

    logEvent({
      eventType: 'pos:get',
      payload: { orderId },
      status: 'success',
    })

    return data
  }, 'pos:getOrder')
}
