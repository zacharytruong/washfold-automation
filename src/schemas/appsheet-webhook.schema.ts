/**
 * Zod schema for AppSheet webhook payload validation
 * AppSheet sends order_number and current status on automation trigger
 */

import { z } from 'zod'

export const appsheetWebhookSchema = z.object({
  order_number: z.union([z.string(), z.number()]).transform(String),
  status: z.string().min(1),
  // optional — not all statuses need it; handler guards for presence before notifications
  phone: z.string().optional(),
})

export type AppSheetWebhookPayload = z.infer<typeof appsheetWebhookSchema>
