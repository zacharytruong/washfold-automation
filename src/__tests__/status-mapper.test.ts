import { describe, expect, test } from 'bun:test'
import {
  APPSHEET_STATUSES,
  getAllPosStatusCodes,
  getPosDeliveredCode,
  getPosStatusName,
  getPosWaitForPickupCode,
  POS_STATUSES,
  shouldCancelAppSheetEntry,
  shouldCreateAppSheetEntry,
  shouldMarkDelivered,
  shouldUpdatePosStatus,
} from '@/utils/status-mapper.ts'

describe('status-mapper', () => {
  describe('shouldCreateAppSheetEntry', () => {
    test('returns true for New (0)', () => {
      expect(shouldCreateAppSheetEntry(POS_STATUSES.NEW)).toBe(true)
    })

    test('returns false for other statuses', () => {
      expect(shouldCreateAppSheetEntry(POS_STATUSES.CONFIRMED)).toBe(false)
      expect(shouldCreateAppSheetEntry(POS_STATUSES.SHIPPED)).toBe(false)
      expect(shouldCreateAppSheetEntry(POS_STATUSES.RECEIVED)).toBe(false)
    })
  })

  describe('shouldCancelAppSheetEntry', () => {
    test('returns true for Cancelled (4)', () => {
      expect(shouldCancelAppSheetEntry(POS_STATUSES.CANCELLED)).toBe(true)
    })

    test('returns false for other statuses', () => {
      expect(shouldCancelAppSheetEntry(POS_STATUSES.NEW)).toBe(false)
      expect(shouldCancelAppSheetEntry(POS_STATUSES.CONFIRMED)).toBe(false)
      expect(shouldCancelAppSheetEntry(POS_STATUSES.SHIPPED)).toBe(false)
    })
  })

  describe('shouldMarkDelivered', () => {
    test('returns true for Delivery status', () => {
      expect(shouldMarkDelivered(APPSHEET_STATUSES.DELIVERY)).toBe(true)
    })

    test('returns false for other statuses', () => {
      expect(shouldMarkDelivered(APPSHEET_STATUSES.STORAGE_READY)).toBe(false)
      expect(shouldMarkDelivered(APPSHEET_STATUSES.ARRIVED)).toBe(false)
      expect(shouldMarkDelivered(APPSHEET_STATUSES.DELIVERED)).toBe(false)
    })
  })

  describe('shouldUpdatePosStatus', () => {
    test('returns true for Storage / Ready', () => {
      expect(shouldUpdatePosStatus(APPSHEET_STATUSES.STORAGE_READY)).toBe(true)
    })

    test('returns false for other AppSheet statuses', () => {
      expect(shouldUpdatePosStatus(APPSHEET_STATUSES.ARRIVED)).toBe(false)
      expect(shouldUpdatePosStatus(APPSHEET_STATUSES.DELIVERED)).toBe(false)
      expect(shouldUpdatePosStatus('Invalid')).toBe(false)
    })
  })

  describe('getPosWaitForPickupCode', () => {
    test('returns WAITING status code (9)', () => {
      expect(getPosWaitForPickupCode()).toBe(9)
    })
  })

  describe('getPosDeliveredCode', () => {
    test('returns RECEIVED status code (3)', () => {
      expect(getPosDeliveredCode()).toBe(3)
    })
  })

  describe('APPSHEET_STATUSES', () => {
    test('has correct workflow statuses', () => {
      expect(APPSHEET_STATUSES.ARRIVED).toBe('Arrived')
      expect(APPSHEET_STATUSES.STORAGE_READY).toBe('Lưu kho / STORAGE')
      expect(APPSHEET_STATUSES.DELIVERY).toBe('Delivery')
      expect(APPSHEET_STATUSES.DELIVERED).toBe('Delivered')
    })
  })

  describe('getAllPosStatusCodes', () => {
    test('returns all POS status codes', () => {
      const codes = getAllPosStatusCodes()
      expect(codes).toContain(POS_STATUSES.NEW)       // 0
      expect(codes).toContain(POS_STATUSES.CONFIRMED)  // 1
      expect(codes).toContain(POS_STATUSES.SHIPPED)    // 2
      expect(codes).toContain(POS_STATUSES.RECEIVED)   // 3
      expect(codes).toContain(POS_STATUSES.WAITING)    // 9
    })
  })

  describe('getPosStatusName', () => {
    test('returns correct status names', () => {
      expect(getPosStatusName(0)).toBe('NEW')
      expect(getPosStatusName(1)).toBe('CONFIRMED')
      expect(getPosStatusName(2)).toBe('SHIPPED')
      expect(getPosStatusName(3)).toBe('RECEIVED')
    })

    test('returns UNKNOWN_code for unknown codes', () => {
      expect(getPosStatusName(999)).toBe('UNKNOWN_999')
    })
  })
})
