import { describe, expect, test } from 'bun:test'
import {
  APPSHEET_STATUSES,
  appSheetToPos,
  getAllPosStatusCodes,
  getPosStatusName,
  isKnownAppSheetStatus,
  isKnownPosStatus,
  POS_STATUSES,
  posToAppSheet,
} from '../utils/status-mapper.ts'

describe('status-mapper', () => {
  describe('posToAppSheet', () => {
    test('converts NEW (0) to Pending', () => {
      expect(posToAppSheet(POS_STATUSES.NEW)).toBe('Pending')
    })

    test('converts CONFIRMED (3) to Processing', () => {
      expect(posToAppSheet(POS_STATUSES.CONFIRMED)).toBe('Processing')
    })

    test('converts SHIPPED (11) to Delivering', () => {
      expect(posToAppSheet(POS_STATUSES.SHIPPED)).toBe('Delivering')
    })

    test('converts RECEIVED (12) to Delivered', () => {
      expect(posToAppSheet(POS_STATUSES.RECEIVED)).toBe('Delivered')
    })

    test('returns Unknown(code) for unmapped statuses', () => {
      expect(posToAppSheet(POS_STATUSES.PACKAGING)).toBe('Unknown(8)')
      expect(posToAppSheet(POS_STATUSES.WAITING)).toBe('Unknown(9)')
      expect(posToAppSheet(POS_STATUSES.RETURNED)).toBe('Unknown(20)')
      expect(posToAppSheet(999)).toBe('Unknown(999)')
    })
  })

  describe('appSheetToPos', () => {
    test('converts Pending to NEW (0)', () => {
      expect(appSheetToPos(APPSHEET_STATUSES.PENDING)).toBe(0)
    })

    test('converts Processing to CONFIRMED (3)', () => {
      expect(appSheetToPos(APPSHEET_STATUSES.PROCESSING)).toBe(3)
    })

    test('converts Delivering to SHIPPED (11)', () => {
      expect(appSheetToPos(APPSHEET_STATUSES.DELIVERING)).toBe(11)
    })

    test('converts Delivered to RECEIVED (12)', () => {
      expect(appSheetToPos(APPSHEET_STATUSES.DELIVERED)).toBe(12)
    })

    test('returns null for unknown statuses', () => {
      expect(appSheetToPos('InvalidStatus')).toBeNull()
      expect(appSheetToPos('')).toBeNull()
    })
  })

  describe('isKnownPosStatus', () => {
    test('returns true for mapped statuses', () => {
      expect(isKnownPosStatus(0)).toBe(true)
      expect(isKnownPosStatus(3)).toBe(true)
      expect(isKnownPosStatus(11)).toBe(true)
      expect(isKnownPosStatus(12)).toBe(true)
    })

    test('returns false for unmapped statuses', () => {
      expect(isKnownPosStatus(8)).toBe(false)
      expect(isKnownPosStatus(9)).toBe(false)
      expect(isKnownPosStatus(20)).toBe(false)
    })
  })

  describe('isKnownAppSheetStatus', () => {
    test('returns true for valid statuses', () => {
      expect(isKnownAppSheetStatus('Pending')).toBe(true)
      expect(isKnownAppSheetStatus('Processing')).toBe(true)
      expect(isKnownAppSheetStatus('Delivering')).toBe(true)
      expect(isKnownAppSheetStatus('Delivered')).toBe(true)
    })

    test('returns false for invalid statuses', () => {
      expect(isKnownAppSheetStatus('Invalid')).toBe(false)
    })
  })

  describe('getAllPosStatusCodes', () => {
    test('returns all POS status codes', () => {
      const codes = getAllPosStatusCodes()
      expect(codes).toContain(0)
      expect(codes).toContain(3)
      expect(codes).toContain(8)
      expect(codes).toContain(9)
      expect(codes).toContain(11)
      expect(codes).toContain(12)
      expect(codes).toContain(20)
    })
  })

  describe('getPosStatusName', () => {
    test('returns correct status names', () => {
      expect(getPosStatusName(0)).toBe('NEW')
      expect(getPosStatusName(3)).toBe('CONFIRMED')
      expect(getPosStatusName(11)).toBe('SHIPPED')
    })

    test('returns UNKNOWN_code for unknown codes', () => {
      expect(getPosStatusName(999)).toBe('UNKNOWN_999')
    })
  })
})
