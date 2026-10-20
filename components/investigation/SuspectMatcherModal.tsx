'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import PersonAvatar from '@/components/PersonPhoto';
import { formatGraphName, type NameDisplayFormat } from '@/lib/nameUtils';

interface Vehicle {
  plateNumber: string;
  brandModel: string | null;
  color: string | null;
}

interface PhysicalMark {
  type: string;
  location: string;
  description: string | null;
}

interface CriminalRecord {
  charge: string;
  sentenceDetail: string | null;
  recordType: string;
}

interface Gang {
  id: string;
  name: string;
  turf: string | null;
  color: string | null;
}

interface CandidateSuspect {
  person: {
    id: string;
    name: string;
    surname: string | null;
    nickname: string | null;
    displayNameOverride: string | null;
    photo: string | null;
    managementLevel: string | null;
    threatLevel: string | null;
    citizenId: string | null;
    vehicles: Vehicle[];
    physicalMarks: PhysicalMark[];
    criminalRecords: CriminalRecord[];
    gangs: Gang[];
  };
  minDistanceKm: number | null;
  closestAddressText: string | null;
  matchReasons: string[];
  score: number;
  temporalSignals?: {
    hasAlibi: boolean;
    isIncarcerated: boolean;
    recentConvictionMatch: boolean;
    disappearedPostIncident: boolean;
    journalActivityNearby: boolean;
  };
  isLinked: boolean;
  linkedInvolvementType: string | null;
  linkedVerificationStatus: string | null;
}

interface SuspectMatcherModalProps {
  eventId: string;
  eventTitle: string;
  crimeType?: string | null;
  nameOrder?: 'WESTERN' | 'EASTERN';
  nameDisplayFormat?: NameDisplayFormat;
}

export default function SuspectMatcherModal({
  eventId,
  eventTitle,
  crimeType,
  nameOrder,
  nameDisplayFormat,
}: SuspectMatcherModalProps) {
  const t = useTranslations('events.matcher');
  const tEvents = useTranslations('events');
  const tPeople = useTranslations('people');
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [candidates, setCandidates] = useState<CandidateSuspect[]>([]);
  const [hasSceneCoords, setHasSceneCoords] = useState(false);
  const [linkingPersonId, setLinkingPersonId] = useState<string | null>(null);

  // Filters
  const [radiusKm, setRadiusKm] = useState<string>('all');
  const [matchCrimeType, setMatchCrimeType] = useState<boolean>(false);
  const [historyOnly, setHistoryOnly] = useState<boolean>(false);
  const [managementFilter, setManagementFilter] = useState<string>('SUSPECTS_ONLY');
  const [hideAlibi, setHideAlibi] = useState<boolean>(true);
  const [temporalSignalsOnly, setTemporalSignalsOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (radiusKm && radiusKm !== 'all') params.set('radiusKm', radiusKm);
      if (matchCrimeType) params.set('matchCrimeType', 'true');
      if (historyOnly) params.set('historyOnly', 'true');
      if (managementFilter) params.set('managementFilter', managementFilter);
      if (hideAlibi) params.set('hideAlibi', 'true');
      if (temporalSignalsOnly) params.set('temporalSignalsOnly', 'true');
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/events/${eventId}/candidate-suspects?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch candidates');

      const data = await res.json();
      setCandidates(data.candidates || []);
      setHasSceneCoords(Boolean(data.crimeScene?.hasCoordinates));
    } catch {
      toast.error('Không thể tải danh sách khoanh vùng đối tượng');
    } finally {
      setIsLoading(false);
    }
  }, [
    eventId,
    radiusKm,
    matchCrimeType,
    historyOnly,
    managementFilter,
    hideAlibi,
    temporalSignalsOnly,
    searchQuery,
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchCandidates();
    }
  }, [isOpen, fetchCandidates]);

  const handleLinkSuspect = async (candidate: CandidateSuspect) => {
    setLinkingPersonId(candidate.person.id);
    const candidateName = formatGraphName(candidate.person, nameOrder, nameDisplayFormat);

    try {
      const reasonDetails = candidate.matchReasons.length > 0
        ? candidate.matchReasons.join('; ')
        : 'Khoanh vùng theo tiêu chí nghiệp vụ';

      const res = await fetch(`/api/events/${eventId}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: candidate.person.id,
          role: 'Đối tượng nghi vấn',
          involvementType: 'SUSPECT',
          verificationStatus: 'HYPOTHESIS',
          confidence: candidate.score >= 50 ? 'HIGH' : 'MEDIUM',
          reasonForSuspicion: t('autoReason', { details: reasonDetails }),
          notes: candidate.closestAddressText ? `Địa chỉ gần hiện trường: ${candidate.closestAddressText}` : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Lỗi khi liên kết');
      }

      toast.success(t('linkSuccess', { name: candidateName }));

      // Update state locally
      setCandidates((prev) =>
        prev.map((c) =>
          c.person.id === candidate.person.id
            ? { ...c, isLinked: true, linkedInvolvementType: 'SUSPECT', linkedVerificationStatus: 'HYPOTHESIS' }
            : c
        )
      );

      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi đưa vào diện nghi vấn';
      toast.error(message);
    } finally {
      setLinkingPersonId(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white shadow-sm transition-all hover:shadow"
      >
        <span>{t('openButton')}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-start justify-between bg-surface-elevated">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <span>🎯</span> {t('title')}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium truncate max-w-xs">
                    📁 {eventTitle}
                  </span>
                  {crimeType && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 font-medium">
                      ⚖️ {crimeType}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('subtitle')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg px-2 py-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b border-border bg-surface space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Radius Filter */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    📍 {t('radiusLabel')}
                  </label>
                  <select
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(e.target.value)}
                    className="w-full text-xs rounded-md border border-input bg-surface text-foreground px-2.5 py-1.5 focus:border-primary focus:ring-primary"
                  >
                    <option value="all">{t('radiusAll')}</option>
                    <option value="0.5">500 m</option>
                    <option value="1.0">1.0 km</option>
                    <option value="2.0">2.0 km</option>
                    <option value="3.0">3.0 km</option>
                    <option value="5.0">5.0 km</option>
                  </select>
                </div>

                {/* Management Level */}
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    👥 {t('managementFilter')}
                  </label>
                  <select
                    value={managementFilter}
                    onChange={(e) => setManagementFilter(e.target.value)}
                    className="w-full text-xs rounded-md border border-input bg-surface text-foreground px-2.5 py-1.5 focus:border-primary focus:ring-primary"
                  >
                    <option value="SUSPECTS_ONLY">{t('managementSuspectsOnly')}</option>
                    <option value="ALL">{t('managementAll')}</option>
                    <option value="KEY_TARGET">🔴 {tPeople('form.managementLevels.KEY_TARGET')}</option>
                    <option value="SURVEILLANCE">🟠 {tPeople('form.managementLevels.SURVEILLANCE')}</option>
                  </select>
                </div>

                {/* Search Text */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-muted mb-1">
                    🔍 Tìm kiếm nhanh (Biển số xe, Dấu vết, CCCD, Tên)
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="VD: 29B1, xăm rồng, 00120..., An..."
                    className="w-full text-xs rounded-md border border-input bg-surface text-foreground px-2.5 py-1.5 focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-foreground pt-1">
                {crimeType && (
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={matchCrimeType}
                      onChange={(e) => setMatchCrimeType(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="font-medium text-red-700 dark:text-red-400">
                      ⚖️ {t('crimeTypeMatchOnly', { type: crimeType })}
                    </span>
                  </label>
                )}

                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={historyOnly}
                    onChange={(e) => setHistoryOnly(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>📋 {t('historyOnly')}</span>
                </label>

                {/* Temporal Toggles */}
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideAlibi}
                    onChange={(e) => setHideAlibi(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    🛡️ Ẩn ngoại phạm / Đang thụ án
                  </span>
                </label>

                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={temporalSignalsOnly}
                    onChange={(e) => setTemporalSignalsOnly(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    ⏱️ Có biến động quanh ngày án
                  </span>
                </label>

                {!hasSceneCoords && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400">
                    ℹ️ {t('noCrimeSceneCoordinates')}
                  </span>
                )}
              </div>
            </div>

            {/* Candidate List Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-elevated/40">
              <div className="flex items-center justify-between text-xs font-medium text-muted">
                <span>{t('candidatesFound', { count: candidates.length })}</span>
                {isLoading && <span className="animate-pulse">Đang rà soát dữ liệu...</span>}
              </div>

              {candidates.length === 0 && !isLoading ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg bg-surface">
                  <span className="text-3xl block mb-2">🔍</span>
                  <p className="text-sm font-medium text-foreground">{t('noCandidates')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hãy thử mở rộng bán kính hiện trường hoặc chọn &quot;Tất cả diện theo dõi&quot;.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.map((candidate) => {
                    const displayName = formatGraphName(
                      candidate.person,
                      nameOrder,
                      nameDisplayFormat
                    );
                    const isKey = candidate.person.managementLevel === 'KEY_TARGET';
                    const isSuspect = candidate.person.managementLevel === 'SURVEILLANCE';

                    return (
                      <div
                        key={candidate.person.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                          candidate.isLinked
                            ? 'bg-muted/15 border-border opacity-70'
                            : candidate.score >= 50
                            ? 'bg-surface border-red-500/40 shadow-xs'
                            : 'bg-surface border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <Link href={`/people/${candidate.person.id}`} target="_blank">
                            <PersonAvatar
                              personId={candidate.person.id}
                              photo={candidate.person.photo}
                              name={displayName}
                              size={44}
                            />
                          </Link>

                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/people/${candidate.person.id}`}
                                target="_blank"
                                className="font-bold text-sm text-foreground hover:underline"
                              >
                                {displayName}
                              </Link>

                              {isKey && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                                  🔴 Trọng điểm
                                </span>
                              )}
                              {isSuspect && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  🟠 Nghi vấn
                                </span>
                              )}

                              {candidate.minDistanceKm !== null && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                  📍 {t('distanceFromScene', {
                                    distance: candidate.minDistanceKm < 1
                                      ? `${Math.round(candidate.minDistanceKm * 1000)}m`
                                      : `${candidate.minDistanceKm}km`,
                                  })}
                                </span>
                              )}

                              {candidate.person.citizenId && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted/40 text-muted font-mono">
                                  🆔 {candidate.person.citizenId}
                                </span>
                              )}

                              {/* Temporal Badges */}
                              {candidate.temporalSignals?.hasAlibi && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  🟢 Ngoại phạm
                                </span>
                              )}
                              {candidate.temporalSignals?.isIncarcerated && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                  🔒 Đang thụ án
                                </span>
                              )}
                              {candidate.temporalSignals?.recentConvictionMatch && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  ⚡ Mới tái hòa nhập
                                </span>
                              )}
                              {candidate.temporalSignals?.disappearedPostIncident && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                  ⚠️ Vắng mặt sau án
                                </span>
                              )}
                              {candidate.temporalSignals?.journalActivityNearby && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                  📝 Có nhật ký quanh ngày án
                                </span>
                              )}
                            </div>

                            {/* Match Reasons */}
                            {candidate.matchReasons.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {candidate.matchReasons.map((reason, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20"
                                  >
                                    ⚡ {reason}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Details (Vehicles, Marks, Gangs) */}
                            <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
                              {candidate.closestAddressText && (
                                <p className="truncate">
                                  🏠 <span className="font-medium text-foreground">Nơi cư trú:</span> {candidate.closestAddressText}
                                </p>
                              )}

                              {candidate.person.vehicles.length > 0 && (
                                <p className="truncate">
                                  🚗 <span className="font-medium text-foreground">Phương tiện:</span>{' '}
                                  {candidate.person.vehicles.map((v) => `${v.plateNumber} (${[v.brandModel, v.color].filter(Boolean).join(' ')})`).join(', ')}
                                </p>
                              )}

                              {candidate.person.physicalMarks.length > 0 && (
                                <p className="truncate">
                                  🔍 <span className="font-medium text-foreground">Dấu vết nhận dạng:</span>{' '}
                                  {candidate.person.physicalMarks.map((m) => `${m.type} ở ${m.location}${m.description ? `: ${m.description}` : ''}`).join(', ')}
                                </p>
                              )}

                              {candidate.person.gangs.length > 0 && (
                                <p className="truncate">
                                  👥 <span className="font-medium text-foreground">Băng nhóm:</span>{' '}
                                  {candidate.person.gangs.map((g) => `${g.name}${g.turf ? ` (${g.turf})` : ''}`).join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Column */}
                        <div className="flex md:flex-col items-center justify-end md:justify-center shrink-0 gap-2">
                          {candidate.isLinked ? (
                            <span className="text-xs px-3 py-1.5 rounded-lg bg-muted text-muted-foreground font-medium text-center">
                              ✓ {t('alreadyLinked')}
                            </span>
                          ) : (
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              disabled={linkingPersonId === candidate.person.id}
                              onClick={() => handleLinkSuspect(candidate)}
                              className="whitespace-nowrap"
                            >
                              {linkingPersonId === candidate.person.id
                                ? t('linking')
                                : t('linkAsHypothesis')}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-border bg-surface flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Được đối chiếu và tự động phân hạng dựa trên khoảng cách GPS và tiền án tiền sự.
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
