import { describe, it, expect } from 'vitest';
import {
  getDateRangeFromPreset,
  getContactRecencyFilter,
  getRecordRecencyFilter,
  evaluateTemporalSuspectSignals,
  formatISODateOnly,
} from '@/lib/investigation-dates';

describe('investigation-dates', () => {
  const refDate = new Date('2026-10-20T10:00:00.000Z');

  describe('getDateRangeFromPreset', () => {
    it('returns null for all preset', () => {
      expect(getDateRangeFromPreset('all', refDate)).toBeNull();
    });

    it('returns single day range for today preset', () => {
      const range = getDateRangeFromPreset('today', refDate);
      expect(range).toEqual({
        fromDate: '2026-10-20',
        toDate: '2026-10-20',
      });
    });

    it('returns 7-day range for last_7_days', () => {
      const range = getDateRangeFromPreset('last_7_days', refDate);
      expect(range).toEqual({
        fromDate: '2026-10-13',
        toDate: '2026-10-20',
      });
    });

    it('returns 30-day range for last_30_days', () => {
      const range = getDateRangeFromPreset('last_30_days', refDate);
      expect(range).toEqual({
        fromDate: '2026-09-20',
        toDate: '2026-10-20',
      });
    });

    it('returns month-to-date for this_month', () => {
      const range = getDateRangeFromPreset('this_month', refDate);
      expect(range).toEqual({
        fromDate: '2026-10-01',
        toDate: '2026-10-20',
      });
    });

    it('returns year-to-date for this_year', () => {
      const range = getDateRangeFromPreset('this_year', refDate);
      expect(range).toEqual({
        fromDate: '2026-01-01',
        toDate: '2026-10-20',
      });
    });
  });

  describe('getContactRecencyFilter', () => {
    it('returns lt 30 days for uncontacted_30d', () => {
      const filter = getContactRecencyFilter('uncontacted_30d', refDate);
      expect(filter).not.toBeNull();
      expect(filter?.condition).toBe('lt');
      expect(formatISODateOnly(filter!.threshold)).toBe('2026-09-20');
    });

    it('returns gte 7 days for contacted_7d', () => {
      const filter = getContactRecencyFilter('contacted_7d', refDate);
      expect(filter).not.toBeNull();
      expect(filter?.condition).toBe('gte');
      expect(formatISODateOnly(filter!.threshold)).toBe('2026-10-13');
    });
  });

  describe('getRecordRecencyFilter', () => {
    it('returns 1 year ago threshold', () => {
      const filter = getRecordRecencyFilter('record_within_1y', refDate);
      expect(filter).not.toBeNull();
      expect(formatISODateOnly(filter!)).toBe('2025-10-20');
    });
  });

  describe('evaluateTemporalSuspectSignals', () => {
    it('detects incarceration during event date', () => {
      const eventDate = '2026-05-10T12:00:00Z';
      const evalResult = evaluateTemporalSuspectSignals(eventDate, {
        lastContact: null,
        criminalRecords: [
          {
            charge: 'Trộm cắp',
            incidentDate: '2025-01-01',
            verdictDate: '2025-06-01',
            sentenceDetail: '2 năm tù giam',
            recordType: 'CONVICTION',
          },
        ],
      });

      expect(evalResult.isIncarcerated).toBe(true);
      expect(evalResult.scorePenalty).toBeGreaterThanOrEqual(80);
      expect(evalResult.reasons[0]).toContain('Đang chấp hành án');
    });

    it('detects recent conviction prior to event', () => {
      const eventDate = '2026-05-10T12:00:00Z';
      const evalResult = evaluateTemporalSuspectSignals(eventDate, {
        lastContact: null,
        criminalRecords: [
          {
            charge: 'Cướp giật',
            incidentDate: '2025-11-01',
            verdictDate: '2025-12-01',
            sentenceDetail: 'Phạt tù treo 6 tháng',
            recordType: 'CONVICTION',
          },
        ],
      });

      expect(evalResult.recentConvictionMatch).toBe(true);
      expect(evalResult.scoreBonus).toBe(25);
    });

    it('detects alibi or ruled out verification status', () => {
      const eventDate = '2026-05-10T12:00:00Z';
      const evalResult = evaluateTemporalSuspectSignals(eventDate, {
        lastContact: null,
        criminalRecords: [],
        alibisOrRuledOut: [
          {
            verificationStatus: 'RULED_OUT',
            alibi: 'Có camera an ninh xác nhận đang ở bệnh viện',
          },
        ],
      });

      expect(evalResult.hasAlibi).toBe(true);
      expect(evalResult.scorePenalty).toBe(60);
    });

    it('detects journal activity within 24h of event', () => {
      const eventDate = '2026-05-10T12:00:00Z';
      const evalResult = evaluateTemporalSuspectSignals(eventDate, {
        lastContact: null,
        criminalRecords: [],
        journalEntries: [
          {
            date: '2026-05-10T18:00:00Z',
            title: 'Trinh sát phát hiện đối tượng tại quán nước gần hiện trường',
          },
        ],
      });

      expect(evalResult.journalActivityNearby).toBe(true);
      expect(evalResult.scoreBonus).toBe(20);
    });
  });
});

