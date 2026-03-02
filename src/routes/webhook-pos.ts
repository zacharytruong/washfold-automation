/**
 * POS webhook route handler
 * Receives Pancake POS order events and syncs to Google Sheets
 *
 * Triggers:
 * - Confirmed (3) → Create AppSheet entry with "Arrived" status
 * - Shipped (11) / Delivered (12) → Update AppSheet entry to "Delivered"
 */

import type { Context } from 'hono'
import { getConfig } from '@/config.ts'
import { posWebhookSchema } from '@/schemas/pos-webhook.schema.ts'
import { appendRow, findRowByOrderNumber, updateStatus } from '@/services/google-sheets.ts'
import { logEvent } from '@/utils/logger.ts'
import { APPSHEET_STATUSES, shouldCreateAppSheetEntry, shouldMarkAppSheetDelivered } from '@/utils/status-mapper.ts'
import { timingSafeEqual } from '@/utils/timing-safe-equal.ts'

export async function handlePosWebhook(c: Context): Promise<Response> {
  // Verify webhook secret (same auth pattern as AppSheet webhook)
  const secret = c.req.query('secret')
  const config = getConfig()

  if (!secret || !timingSafeEqual(secret, config.webhookSecret)) {
    logEvent({
      eventType: 'pos:webhook:auth',
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
      eventType: 'pos:webhook:parse',
      payload: null,
      status: 'error',
      error: 'Malformed JSON body',
    })
    return c.json({ error: 'Malformed JSON body' }, 400)
  }

  // Log raw payload before validation (schema not verified yet)
  logEvent({
    eventType: 'pos:webhook:raw',
    payload: rawPayload,
    status: 'success',
  })

  // Validate with Zod
  const result = posWebhookSchema.safeParse(rawPayload)
  if (!result.success) {
    logEvent({
      eventType: 'pos:webhook:validation',
      payload: rawPayload,
      status: 'error',
      error: JSON.stringify(result.error.issues),
    })
    return c.json({ error: 'Invalid payload', issues: result.error.issues }, 400)
  }

  const data = result.data

  // POS Confirmed (3) → Create AppSheet entry with "Arrived" status
  if (shouldCreateAppSheetEntry(data.status)) {
    try {
      // Check for existing order to prevent duplicates on POS retry
      const existing = await findRowByOrderNumber(data.order_number)
      if (existing) {
        logEvent({
          eventType: 'pos:webhook:created',
          payload: { orderNumber: data.order_number },
          status: 'warning',
          error: 'Order already exists in AppSheet, skipping duplicate',
        })
        return c.json({ ok: true, action: 'duplicate_skipped' })
      }

      await appendRow({
        orderNumber: data.order_number,
        goiDichVu: data.goi_dich_vu,
        delivery: data.delivery,
        soLuongMon: data.so_luong_mon,
        doUot: data.do_uot,
        customerPhone: data.customer_phone,
        status: APPSHEET_STATUSES.ARRIVED,
      })

      logEvent({
        eventType: 'pos:webhook:created',
        payload: { orderNumber: data.order_number, status: APPSHEET_STATUSES.ARRIVED },
        status: 'success',
      })
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logEvent({
        eventType: 'pos:webhook:created',
        payload: { orderNumber: data.order_number },
        status: 'error',
        error: msg,
      })
      return c.json({ error: 'Failed to create AppSheet entry' }, 500)
    }
  }

  // POS Shipped (11) or Delivered (12) → Update AppSheet to "Delivered"
  if (shouldMarkAppSheetDelivered(data.status)) {
    try {
      const existing = await findRowByOrderNumber(data.order_number)
      if (existing) {
        await updateStatus(data.order_number, APPSHEET_STATUSES.DELIVERED)
        logEvent({
          eventType: 'pos:webhook:delivered',
          payload: { orderNumber: data.order_number },
          status: 'success',
        })
      }
      else {
        logEvent({
          eventType: 'pos:webhook:delivered',
          payload: { orderNumber: data.order_number },
          status: 'warning',
          error: 'Order not found in AppSheet',
        })
      }
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logEvent({
        eventType: 'pos:webhook:delivered',
        payload: { orderNumber: data.order_number },
        status: 'error',
        error: msg,
      })
      return c.json({ error: 'Failed to update AppSheet status' }, 500)
    }
  }

  return c.json({ ok: true })
}
