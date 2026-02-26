/**
 * Botcake API wrapper for WhatsApp notifications
 * Uses Botcake's public API to send messages via flows
 */

import { getConfig } from '../config.ts'
import { logEvent } from '../utils/logger.ts'

const BASE_URL = 'https://botcake.io/api/public_api/v1'

export interface BotcakeResponse {
  success: boolean
  message?: string
}

/**
 * Format phone number to Botcake PSID format
 * Strips + and prefixes with wa_
 * Example: +84384123456 -> wa_84384123456
 */
export function formatPhoneToPsid(phone: string): string {
  // Remove + and any non-digit characters except the digits
  const cleanPhone = phone.replace(/\D/g, '')
  return `wa_${cleanPhone}`
}

/**
 * Validate phone number format
 * Must start with country code (e.g., 84 for Vietnam)
 */
export function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '')
  // Minimum 10 digits (country code + local number)
  return cleanPhone.length >= 10
}

/**
 * Send status notification to customer via WhatsApp
 */
export async function sendStatusNotification(
  phone: string,
  orderNumber: string,
  status: string,
  customerName?: string,
): Promise<BotcakeResponse> {
  const config = getConfig()

  if (!isValidPhone(phone)) {
    logEvent({
      eventType: 'botcake:send',
      payload: { phone, orderNumber, status },
      status: 'error',
      error: 'Invalid phone number format',
    })
    return { success: false, message: 'Invalid phone number format' }
  }

  const psid = formatPhoneToPsid(phone)
  const url = `${BASE_URL}/pages/${config.botcakePageId}/flows/send_content`

  const messageText = buildStatusMessage(orderNumber, status, customerName)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access-token': config.botcakeAccessToken,
      },
      body: JSON.stringify({
        psid,
        payload: {
          user_full_name: customerName || 'Customer',
        },
        data: {
          version: 'v2',
          content: {
            messages: [
              {
                type: 'text',
                text: messageText,
              },
            ],
          },
        },
      }),
    })

    const data = (await response.json()) as { message?: string }

    if (!response.ok) {
      const errorMessage = data.message || `HTTP ${response.status}`
      logEvent({
        eventType: 'botcake:send',
        payload: { phone, psid, orderNumber, status },
        status: 'error',
        error: errorMessage,
      })
      return { success: false, message: errorMessage }
    }

    logEvent({
      eventType: 'botcake:send',
      payload: { phone, psid, orderNumber, status },
      status: 'success',
    })

    return { success: true }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logEvent({
      eventType: 'botcake:send',
      payload: { phone, psid, orderNumber, status },
      status: 'error',
      error: errorMessage,
    })
    return { success: false, message: errorMessage }
  }
}

/**
 * Build notification message based on status
 */
function buildStatusMessage(orderNumber: string, status: string, customerName?: string): string {
  const greeting = customerName ? `Xin chào ${customerName}` : 'Xin chào quý khách'

  const statusMessages: Record<string, string> = {
    'Arrived': 'đơn hàng của bạn đã được tiếp nhận',
    'Washed': 'đơn hàng của bạn đã được giặt xong',
    'Dried': 'đơn hàng của bạn đã được sấy xong',
    'Folded': 'đơn hàng của bạn đã được gấp xong',
    'Storage / Ready': 'đơn hàng của bạn đã sẵn sàng để lấy',
    'Ready for pickup': 'đơn hàng của bạn đã sẵn sàng để lấy',
    'Delivered': 'đơn hàng của bạn đã được giao thành công',
  }

  const statusText = statusMessages[status] || `trạng thái đơn hàng: ${status}`

  return `${greeting}, ${statusText}. Mã đơn: ${orderNumber}. Cảm ơn bạn đã sử dụng dịch vụ!`
}
