/**
 * AppSheet webhook route handler
 * Receives AppSheet status changes and syncs to POS + sends WhatsApp notifications
 *
 * Triggers:
 * - "Lưu kho / STORAGE" → Update POS to Wait for pickup (9) + WhatsApp notification
 * - "Delivery" → Update POS to Received/Delivered (3) + WhatsApp notification
 * - All other statuses → Log only (no action)
 */

import type { Context } from 'hono'
import { getConfig } from '@/config.ts'
import { appsheetWebhookSchema } from '@/schemas/appsheet-webhook.schema.ts'
import { sendStatusNotification } from '@/services/botcake.ts'
import { updateOrderStatus } from '@/services/pancake-pos.ts'
import { logEvent } from '@/utils/logger.ts'
import { getPosDeliveredCode, getPosWaitForPickupCode, shouldMarkDelivered, shouldUpdatePosStatus } from '@/utils/status-mapper.ts'
import { timingSafeEqual } from '@/utils/timing-safe-equal.ts'

export async function handleAppSheetWebhook(c: Context): Promise<Response> {
  // Verify webhook secret with timing-safe comparison
  const secret = c.req.query('secret')
  const config = getConfig()

  if (!secret || !timingSafeEqual(secret, config.webhookSecret)) {
    logEvent({
      eventType: 'appsheet:webhook:auth',
      payload: { providedSecret: '***' },
      status: 'error',
      error: 'Invalid webhook secret',
    })
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Parse JSON body safely
  let rawPayload: unknown
  try {
    rawPayload = await c.req.json()
  }
  catch {
    logEvent({
      eventType: 'appsheet:webhook:parse',
      payload: null,
      status: 'error',
      error: 'Malformed JSON body',
    })
    return c.json({ error: 'Malformed JSON body' }, 400)
  }

  // Log raw payload
  logEvent({
    eventType: 'appsheet:webhook:raw',
    payload: rawPayload,
    status: 'success',
  })

  // Validate with Zod
  const result = appsheetWebhookSchema.safeParse(rawPayload)
  if (!result.success) {
    logEvent({
      eventType: 'appsheet:webhook:validation',
      payload: rawPayload,
      status: 'error',
      error: JSON.stringify(result.error.issues),
    })
    return c.json({ error: 'Invalid payload', issues: result.error.issues }, 400)
  }

  const { order_number, status, phone } = result.data

  // Log all status changes for audit trail
  logEvent({
    eventType: 'appsheet:webhook:status_change',
    payload: { order_number, status },
    status: 'success',
  })

  // AppSheet "Lưu kho / STORAGE" → Update POS to Wait for pickup (9) + notify
  if (shouldUpdatePosStatus(status)) {
    let posUpdateSuccess = false
    try {
      const posResult = await updateOrderStatus(order_number, getPosWaitForPickupCode())
      posUpdateSuccess = posResult.success
      if (!posResult.success) {
        logEvent({
          eventType: 'appsheet:webhook:pos_update',
          payload: { order_number, posStatusCode: getPosWaitForPickupCode() },
          status: 'error',
          error: posResult.message ?? 'POS update failed',
        })
      }
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logEvent({
        eventType: 'appsheet:webhook:pos_update',
        payload: { order_number },
        status: 'error',
        error: msg,
      })
      return c.json({ error: 'Failed to update POS status' }, 500)
    }

    if (posUpdateSuccess) {
      try {
        if (phone) {
          await sendStatusNotification(phone, order_number, 'Ready for pickup')
          logEvent({
            eventType: 'appsheet:webhook:notification',
            payload: { order_number, phone: '***' },
            status: 'success',
          })
        }
        else {
          logEvent({
            eventType: 'appsheet:webhook:notification',
            payload: { order_number },
            status: 'warning',
            error: 'Phone missing from payload, skipping notification',
          })
        }
      }
      catch (error) {
        // Non-fatal — log and continue
        const msg = error instanceof Error ? error.message : String(error)
        logEvent({
          eventType: 'appsheet:webhook:notification',
          payload: { order_number },
          status: 'error',
          error: msg,
        })
      }
    }

    return c.json({ ok: true, action: posUpdateSuccess ? 'pos_updated_and_notified' : 'pos_update_failed' })
  }

  // AppSheet "Delivery" → Update POS to Received/Delivered (3) + notify
  if (shouldMarkDelivered(status)) {
    let posUpdateSuccess = false
    try {
      const posResult = await updateOrderStatus(order_number, getPosDeliveredCode())
      posUpdateSuccess = posResult.success
      if (!posResult.success) {
        logEvent({
          eventType: 'appsheet:webhook:pos_update',
          payload: { order_number, posStatusCode: getPosDeliveredCode() },
          status: 'error',
          error: posResult.message ?? 'POS update failed',
        })
      }
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logEvent({
        eventType: 'appsheet:webhook:pos_update',
        payload: { order_number },
        status: 'error',
        error: msg,
      })
      return c.json({ error: 'Failed to update POS status to Delivered' }, 500)
    }

    if (posUpdateSuccess && phone) {
      try {
        await sendStatusNotification(phone, order_number, 'Delivered')
        logEvent({
          eventType: 'appsheet:webhook:notification',
          payload: { order_number, phone: '***' },
          status: 'success',
        })
      }
      catch (error) {
        // Non-fatal — log and continue
        const msg = error instanceof Error ? error.message : String(error)
        logEvent({
          eventType: 'appsheet:webhook:notification',
          payload: { order_number },
          status: 'error',
          error: msg,
        })
      }
    }

    return c.json({ ok: true, action: posUpdateSuccess ? 'pos_delivered_and_notified' : 'pos_update_failed' })
  }

  return c.json({ ok: true, action: 'logged' })
}
