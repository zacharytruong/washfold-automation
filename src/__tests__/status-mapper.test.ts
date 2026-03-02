import { describe, expect, test } from 'bun:test'
import {
  APPSHEET_STATUSES,
  getAllPosStatusCodes,
  getPosStatusName,
  getPosWaitForPickupCode,
  POS_STATUSES,
  shouldCreateAppSheetEntry,
  shouldMarkAppSheetDelivered,
  shouldUpdatePosStatus,
} from '@/utils/status-mapper.ts'

describe('status-mapper', () => {
  describe('shouldCreateAppSheetEntry', () => {
    test('returns true for Confirmed (3)', () => {
      expect(shouldCreateAppSheetEntry(POS_STATUSES.CONFIRMED)).toBe(true)
    })

    test('returns false for other statuses', () => {
      expect(shouldCreateAppSheetEntry(POS_STATUSES.NEW)).toBe(false)
      expect(shouldCreateAppSheetEntry(POS_STATUSES.SHIPPED)).toBe(false)
      expect(shouldCreateAppSheetEntry(POS_STATUSES.RECEIVED)).toBe(false)
      expect(shouldCreateAppSheetEntry(POS_STATUSES.PACKAGING)).toBe(false)
    })
  })

  describe('shouldMarkAppSheetDelivered', () => {
    test('returns true for Shipped (11)', () => {
      expect(shouldMarkAppSheetDelivered(POS_STATUSES.SHIPPED)).toBe(true)
    })

    test('returns true for Received (12)', () => {
      expect(shouldMarkAppSheetDelivered(POS_STATUSES.RECEIVED)).toBe(true)
    })

    test('returns false for other statuses', () => {
      expect(shouldMarkAppSheetDelivered(POS_STATUSES.NEW)).toBe(false)
      expect(shouldMarkAppSheetDelivered(POS_STATUSES.CONFIRMED)).toBe(false)
      expect(shouldMarkAppSheetDelivered(POS_STATUSES.WAITING)).toBe(false)
    })
  })

  describe('shouldUpdatePosStatus', () => {
    test('returns true for Storage / Ready', () => {
      expect(shouldUpdatePosStatus(APPSHEET_STATUSES.STORAGE_READY)).toBe(true)
    })

    test('returns false for other AppSheet statuses', () => {
      expect(shouldUpdatePosStatus(APPSHEET_STATUSES.ARRIVED)).toBe(false)
      expect(shouldUpdatePosStatus(APPSHEET_STATUSES.WASHED)).toBe(false)
      expect(shouldUpdatePosStatus(APPSHEET_STATUSES.DRIED)).toBe(false)
      expect(shouldUpdatePosStatus(APPSHEET_STATUSES.FOLDED)).toBe(false)
      expect(shouldUpdatePosStatus(APPSHEET_STATUSES.DELIVERED)).toBe(false)
      expect(shouldUpdatePosStatus('Invalid')).toBe(false)
    })
  })

  describe('getPosWaitForPickupCode', () => {
    test('returns WAITING status code (9)', () => {
      expect(getPosWaitForPickupCode()).toBe(9)
    })
  })

  describe('APPSHEET_STATUSES', () => {
    test('has correct workflow statuses', () => {
      expect(APPSHEET_STATUSES.ARRIVED).toBe('Arrived')
      expect(APPSHEET_STATUSES.WASHED).toBe('Washed')
      expect(APPSHEET_STATUSES.DRIED).toBe('Dried')
      expect(APPSHEET_STATUSES.FOLDED).toBe('Folded')
      expect(APPSHEET_STATUSES.STORAGE_READY).toBe('Storage / Ready')
      expect(APPSHEET_STATUSES.DELIVERED).toBe('Delivered')
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
