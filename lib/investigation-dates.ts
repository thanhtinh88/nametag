/**
 * Utilities for temporal filtering, investigation date presets,
 * and time-based suspect scoring / alibi analysis.
 */

export type InvestigationDatePreset =
  | 'all'
  | 'today'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'this_quarter'
  | 'this_year';

export type InvestigationDateField = 'startDate' | 'createdAt';

export type ContactRecencyPreset =
  | 'all'
  | 'uncontacted_30d'
  | 'uncontacted_90d'
  | 'contacted_7d';

export type RecordRecencyPreset =
  | 'all'
  | 'record_within_1y'
  | 'record_within_3y';

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatISODateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get date range { fromDate, toDate } strings in YYYY-MM-DD for a given preset
 */
export function getDateRangeFromPreset(
  preset: InvestigationDatePreset,
  referenceDate = new Date()
): { fromDate: string; toDate: string } | null {
  if (preset === 'all') return null;

  const to = new Date(referenceDate.getTime());
  const from = new Date(referenceDate.getTime());

  switch (preset) {
    case 'today': {
      const todayStr = formatISODateOnly(to);
      return { fromDate: todayStr, toDate: todayStr };
    }
    case 'last_7_days': {
      from.setDate(from.getDate() - 7);
      return {
        fromDate: formatISODateOnly(from),
        toDate: formatISODateOnly(to),
      };
    }
    case 'last_30_days': {
      from.setDate(from.getDate() - 30);
      return {
        fromDate: formatISODateOnly(from),
        toDate: formatISODateOnly(to),
      };
    }
    case 'this_month': {
      const firstDay = new Date(to.getFullYear(), to.getMonth(), 1);
      return {
        fromDate: formatISODateOnly(firstDay),
        toDate: formatISODateOnly(to),
      };
    }
    case 'this_quarter': {
      const currentQuarter = Math.floor(to.getMonth() / 3);
      const startQuarter = new Date(to.getFullYear(), currentQuarter * 3, 1);
      return {
        fromDate: formatISODateOnly(startQuarter),
        toDate: formatISODateOnly(to),
      };
    }
    case 'this_year': {
      const startYear = new Date(to.getFullYear(), 0, 1);
      return {
        fromDate: formatISODateOnly(startYear),
        toDate: formatISODateOnly(to),
      };
    }
    default:
      return null;
  }
}

/**
 * Returns date boundary thresholds for ContactRecencyPreset
 */
export function getContactRecencyFilter(
  preset: ContactRecencyPreset,
  referenceDate = new Date()
): { condition: 'lt' | 'gte'; threshold: Date } | null {
  if (preset === 'all') return null;

  const threshold = new Date(referenceDate.getTime());
  if (preset === 'uncontacted_30d') {
    threshold.setDate(threshold.getDate() - 30);
    return { condition: 'lt', threshold };
  }
  if (preset === 'uncontacted_90d') {
    threshold.setDate(threshold.getDate() - 90);
    return { condition: 'lt', threshold };
  }
  if (preset === 'contacted_7d') {
    threshold.setDate(threshold.getDate() - 7);
    return { condition: 'gte', threshold };
  }
  return null;
}

/**
 * Returns date boundary threshold for RecordRecencyPreset
 */
export function getRecordRecencyFilter(
  preset: RecordRecencyPreset,
  referenceDate = new Date()
): Date | null {
  if (preset === 'all') return null;

  const threshold = new Date(referenceDate.getTime());
  if (preset === 'record_within_1y') {
    threshold.setFullYear(threshold.getFullYear() - 1);
    return threshold;
  }
  if (preset === 'record_within_3y') {
    threshold.setFullYear(threshold.getFullYear() - 3);
    return threshold;
  }
  return null;
}

export interface TemporalSuspectEvaluation {
  scoreBonus: number;
  scorePenalty: number;
  reasons: string[];
  hasAlibi: boolean;
  isIncarcerated: boolean;
  recentConvictionMatch: boolean;
  disappearedPostIncident: boolean;
  journalActivityNearby: boolean;
}

export interface CandidatePersonTemporalData {
  lastContact: Date | string | null;
  criminalRecords: Array<{
    charge: string;
    incidentDate: Date | string | null;
    verdictDate: Date | string | null;
    sentenceDetail: string | null;
    recordType: string;
    isPardoned?: boolean;
  }>;
  alibisOrRuledOut?: Array<{
    verificationStatus: string;
    alibi?: string | null;
  }>;
  journalEntries?: Array<{
    date: Date | string;
    title?: string;
  }>;
}

/**
 * Evaluates temporal correlation between an event date and a suspect's history:
 * - Checks if person has an alibi or was incarcerated
 * - Checks if person has recent criminal record close to event date
 * - Checks if person disappeared / had no contact after the incident
 * - Checks journal entries recorded within +/- 24 hours of event date
 */
export function evaluateTemporalSuspectSignals(
  eventDate: Date | string | null,
  personData: CandidatePersonTemporalData
): TemporalSuspectEvaluation {
  const result: TemporalSuspectEvaluation = {
    scoreBonus: 0,
    scorePenalty: 0,
    reasons: [],
    hasAlibi: false,
    isIncarcerated: false,
    recentConvictionMatch: false,
    disappearedPostIncident: false,
    journalActivityNearby: false,
  };

  if (!eventDate) {
    return result;
  }

  const evtTime = new Date(eventDate).getTime();
  if (isNaN(evtTime)) return result;

  // 1. Alibi / Ruled out check
  if (personData.alibisOrRuledOut && personData.alibisOrRuledOut.length > 0) {
    const hasRuledOut = personData.alibisOrRuledOut.some(
      (a) => a.verificationStatus === 'RULED_OUT'
    );
    if (hasRuledOut) {
      result.hasAlibi = true;
      result.scorePenalty += 60;
      result.reasons.push('Đã xác minh chứng cứ ngoại phạm / Loại trừ');
    }
  }

  // 2. Incarceration / Sentence check around event date
  for (const record of personData.criminalRecords) {
    if (record.verdictDate && record.sentenceDetail) {
      const vDate = new Date(record.verdictDate).getTime();
      const isSuspendedOrProbation = /treo|không giam giữ|thử thách|probation|suspended/i.test(
        record.sentenceDetail
      );

      // Simple parse for years/months in sentenceDetail (VD: "3 năm tù", "24 tháng tù")
      const yearMatch = record.sentenceDetail.match(/(\d+)\s*(năm|year)/i);
      const monthMatch = record.sentenceDetail.match(/(\d+)\s*(tháng|month)/i);
      let sentenceMonths = 0;
      if (yearMatch) sentenceMonths += parseInt(yearMatch[1], 10) * 12;
      if (monthMatch) sentenceMonths += parseInt(monthMatch[1], 10);

      // Only count as physically incarcerated if NOT suspended/probation
      if (!isSuspendedOrProbation && sentenceMonths > 0 && !isNaN(vDate)) {
        const sentenceEnd = new Date(vDate);
        sentenceEnd.setMonth(sentenceEnd.getMonth() + sentenceMonths);
        // If event occurred while subject was serving sentence in prison
        if (evtTime >= vDate && evtTime <= sentenceEnd.getTime()) {
          result.isIncarcerated = true;
          result.scorePenalty += 80;
          result.reasons.push(
            `Đang chấp hành án phạt tù tại thời điểm xảy ra vụ việc (${record.sentenceDetail})`
          );
          break;
        }
      }
    }
  }

  // 3. Recent conviction / offense prior to event (within 12 months)
  if (!result.isIncarcerated) {
    const twelveMonthsMs = 365 * 24 * 60 * 60 * 1000;
    const hasRecentRecord = personData.criminalRecords.some((r) => {
      const d = r.verdictDate || r.incidentDate;
      if (!d) return false;
      const t = new Date(d).getTime();
      return t <= evtTime && evtTime - t <= twelveMonthsMs;
    });

    if (hasRecentRecord) {
      result.recentConvictionMatch = true;
      result.scoreBonus += 25;
      result.reasons.push('Có tiền án / tiền sự gần thời điểm xảy ra vụ việc (trong 12 tháng)');
    }
  }

  // 4. Disappearance post incident:
  // If lastContact was before incident, but more than 14 days after incident with no contact
  if (personData.lastContact) {
    const lastContactTime = new Date(personData.lastContact).getTime();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    // If contact happened before or around incident, but since incident elapsed > 14 days without new contact
    if (lastContactTime <= evtTime && Date.now() - evtTime > fourteenDaysMs) {
      const elapsedSinceContact = Date.now() - lastContactTime;
      if (elapsedSinceContact > fourteenDaysMs * 2) {
        result.disappearedPostIncident = true;
        result.scoreBonus += 15;
        result.reasons.push('Vắng mặt / Không liên lạc kiểm diện sau thời điểm xảy ra vụ án');
      }
    }
  }

  // 5. Journal activity within +/- 24 hours of event
  if (personData.journalEntries && personData.journalEntries.length > 0) {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const nearbyJournal = personData.journalEntries.find((j) => {
      const jt = new Date(j.date).getTime();
      return Math.abs(jt - evtTime) <= oneDayMs;
    });

    if (nearbyJournal) {
      result.journalActivityNearby = true;
      result.scoreBonus += 20;
      result.reasons.push('Có nhật ký trinh sát ghi nhận hoạt động xung quanh ngày xảy ra vụ án');
    }
  }

  return result;
}
