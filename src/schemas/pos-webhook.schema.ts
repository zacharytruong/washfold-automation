/**
 * Zod schema for POS webhook payload validation
 * Schema is flexible since actual POS payload format is not yet verified
 */

import { z } from 'zod'

export const posWebhookSchema = z.object({
  order_number: z.union([z.string(), z.number()]).transform(String),
  customer_phone: z.string().min(1),
  goi_dich_vu: z.string().min(1),
  delivery: z.string().min(1),
  so_luong_mon: z.union([z.string(), z.number()]).transform(Number).refine(n => !Number.isNaN(n), { message: 'so_luong_mon must be a valid number' }),
  do_uot: z.boolean().default(false),
  status: z.number(),
})

export type PosWebhookPayload = z.infer<typeof posWebhookSchema>
