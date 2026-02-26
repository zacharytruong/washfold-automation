/**
 * Timing-safe string comparison to prevent timing attacks on secret values
 * Pads both buffers to equal length before XOR to avoid leaking length info
 */

export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const bufA = encoder.encode(a)
  const bufB = encoder.encode(b)

  // Pad to max length so comparison time doesn't leak length
  const maxLen = Math.max(bufA.length, bufB.length)
  const padA = new Uint8Array(maxLen)
  const padB = new Uint8Array(maxLen)
  padA.set(bufA)
  padB.set(bufB)

  let mismatch = 0
  for (let i = 0; i < maxLen; i++) {
    mismatch |= (padA[i] as number) ^ (padB[i] as number)
  }

  // Both content and length must match
  return mismatch === 0 && bufA.length === bufB.length
}
