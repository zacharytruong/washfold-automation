import { describe, expect, test } from 'bun:test'
import { formatPhoneToPsid, isValidPhone } from '../services/botcake.ts'

describe('botcake', () => {
  describe('formatPhoneToPsid', () => {
    test('formats phone with + prefix correctly', () => {
      expect(formatPhoneToPsid('+84384123456')).toBe('wa_84384123456')
    })

    test('formats phone without + prefix', () => {
      expect(formatPhoneToPsid('84384123456')).toBe('wa_84384123456')
    })

    test('removes spaces and dashes', () => {
      expect(formatPhoneToPsid('+84 384-123-456')).toBe('wa_84384123456')
    })

    test('handles parentheses', () => {
      expect(formatPhoneToPsid('+84(384)123456')).toBe('wa_84384123456')
    })
  })

  describe('isValidPhone', () => {
    test('returns true for valid Vietnamese phone', () => {
      expect(isValidPhone('+84384123456')).toBe(true)
      expect(isValidPhone('84384123456')).toBe(true)
    })

    test('returns true for valid US phone', () => {
      expect(isValidPhone('+14155551234')).toBe(true)
    })

    test('returns false for short phone numbers', () => {
      expect(isValidPhone('123456789')).toBe(false) // 9 digits
      expect(isValidPhone('12345')).toBe(false)
    })

    test('returns true for 10+ digit numbers', () => {
      expect(isValidPhone('1234567890')).toBe(true) // exactly 10 digits
    })
  })
})
