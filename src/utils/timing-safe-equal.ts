/**
 * Timing-safe string comparison to prevent timing attacks on secret values
 * Uses constant-time byte-by-byte XOR comparison
 */

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  const encoder = new TextEncoder()
  const bufA = encoder.encode(a)
  const bufB = encoder.encode(b)

  let mismatch = 0
  for (let i = 0; i < bufA.length; i++) {
    // XOR accumulates differences without short-circuiting
    mismatch |= (bufA[i] as number) ^ (bufB[i] as number)
  }

  return mismatch === 0
}
