'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatDate, parseCalendarDate, type DateFormat } from '@/lib/date-format';

interface SuspectVehicleItem {
  id: string;
  plateNumber: string;
  vehicleType: string;
  brandModel: string | null;
  color: string | null;
  identifyingFeatures: string | null;
  registeredOwner: string | null;
  isSuspicious: boolean;
}

interface PhysicalMarkItem {
  id: string;
  type: string;
  location: string;
  description: string;
  photoUrl: string | null;
}

interface CriminalRecordItem {
  id: string;
  charge: string;
  recordType: string;
  sentenceDetail: string | null;
  adjudicatedBy: string | null;
  incidentDate: Date | string | null;
  verdictDate: Date | string | null;
  isPardoned: boolean;
  notes: string | null;
}

interface GangMembershipItem {
  id: string;
  role: string;
  notes: string | null;
  joinedAt: Date | string | null;
  leftAt: Date | string | null;
  gang: {
    id: string;
    name: string;
    color: string | null;
    turf: string | null;
  };
}

interface SuspectBankAccountItem {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string | null;
  accountType: string;
  isPrimary: boolean;
  notes: string | null;
}

interface PersonInvestigationDossierProps {
  person: {
    id: string;
    managementLevel?: string | null;
    threatLevel?: string | null;
    citizenId?: string | null;
    citizenIdIssueDate?: Date | string | null;
    citizenIdIssuePlace?: string | null;
    residenceStatus?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    bloodType?: string | null;
    modusOperandi?: string | null;
    riskNotes?: string | null;
    vehicles?: SuspectVehicleItem[];
    physicalMarks?: PhysicalMarkItem[];
    criminalRecords?: CriminalRecordItem[];
    gangMemberships?: GangMembershipItem[];
    bankAccounts?: SuspectBankAccountItem[];
  };
  dateFormat?: DateFormat;
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm';

export default function PersonInvestigationDossier({
  person,
  dateFormat = 'DMY',
}: PersonInvestigationDossierProps) {
  const t = useTranslations('people.investigation');
  const tForm = useTranslations('people.form');
  const router = useRouter();

  // Sub-forms toggles
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showMarkForm, setShowMarkForm] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);

  // New bank account state
  const [newBankAccount, setNewBankAccount] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    accountType: 'OWNER',
    isPrimary: false,
    notes: '',
  });

  // New vehicle state
  const [newVehicle, setNewVehicle] = useState({
    plateNumber: '',
    vehicleType: 'Xe máy',
    brandModel: '',
    color: '',
    identifyingFeatures: '',
    registeredOwner: '',
    isSuspicious: false,
  });

  // New physical mark state
  const [newMark, setNewMark] = useState({
    type: 'TATTOO',
    location: '',
    description: '',
  });
  const [markPhotoFile, setMarkPhotoFile] = useState<File | null>(null);

  // New criminal record state
  const [newRecord, setNewRecord] = useState({
    charge: '',
    recordType: 'CONVICTION',
    sentenceDetail: '',
    adjudicatedBy: '',
    incidentDate: '',
    verdictDate: '',
    isPardoned: false,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle vehicle submission
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plateNumber.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/people/${person.id}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVehicle),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add vehicle');
      }

      toast.success(t('vehicleAdded'));
      setNewVehicle({
        plateNumber: '',
        vehicleType: 'Xe máy',
        brandModel: '',
        color: '',
        identifyingFeatures: '',
        registeredOwner: '',
        isSuspicious: false,
      });
      setShowVehicleForm(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error adding vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phương tiện này?')) return;
    try {
      const res = await fetch(`/api/people/${person.id}/vehicles/${vehicleId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(t('vehicleDeleted'));
      router.refresh();
    } catch {
      toast.error('Lỗi khi xóa phương tiện');
    }
  };

  // Handle mark submission
  const handleAddMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMark.location.trim() || !newMark.description.trim()) return;

    setIsSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (markPhotoFile) {
        const formData = new FormData();
        formData.append('photo', markPhotoFile);
        const uploadRes = await fetch(`/api/people/${person.id}/physical-marks/photo`, {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          photoUrl = uploadData.photoUrl;
        }
      }

      const res = await fetch(`/api/people/${person.id}/physical-marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newMark, photoUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add mark');
      }

      toast.success(t('markAdded'));
      setNewMark({ type: 'TATTOO', location: '', description: '' });
      setMarkPhotoFile(null);
      setShowMarkForm(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error adding mark');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMark = async (markId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa dấu vết này?')) return;
    try {
      const res = await fetch(`/api/people/${person.id}/physical-marks/${markId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(t('markDeleted'));
      router.refresh();
    } catch {
      toast.error('Lỗi khi xóa dấu vết nhận dạng');
    }
  };

  // Handle criminal record submission
  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.charge.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/people/${person.id}/criminal-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRecord,
          incidentDate: newRecord.incidentDate || null,
          verdictDate: newRecord.verdictDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add record');
      }

      toast.success(t('recordAdded'));
      setNewRecord({
        charge: '',
        recordType: 'CONVICTION',
        sentenceDetail: '',
        adjudicatedBy: '',
        incidentDate: '',
        verdictDate: '',
        isPardoned: false,
        notes: '',
      });
      setShowRecordForm(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error adding record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;
    try {
      const res = await fetch(`/api/people/${person.id}/criminal-records/${recordId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(t('recordDeleted'));
      router.refresh();
    } catch {
      toast.error('Lỗi khi xóa bản ghi tiền án / tiền sự');
    }
  };

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankAccount.bankName.trim() || !newBankAccount.accountNumber.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/people/${person.id}/bank-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBankAccount),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add bank account');
      }

      toast.success(t('bankAccountAdded'));
      setNewBankAccount({
        bankName: '',
        accountNumber: '',
        accountHolder: '',
        accountType: 'OWNER',
        isPrimary: false,
        notes: '',
      });
      setShowBankForm(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error adding bank account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBankAccount = async (accountId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài khoản ngân hàng này?')) return;
    try {
      const res = await fetch(`/api/people/${person.id}/bank-accounts/${accountId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success(t('bankAccountDeleted'));
      router.refresh();
    } catch {
      toast.error('Lỗi khi xóa tài khoản ngân hàng');
    }
  };

  const vehicles = person.vehicles || [];
  const marks = person.physicalMarks || [];
  const records = person.criminalRecords || [];
  const gangMemberships = person.gangMemberships || [];
  const bankAccounts = person.bankAccounts || [];

  return (
    <div className="border border-border rounded-lg p-5 space-y-6 bg-surface shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <h3 className="text-lg font-semibold text-foreground">
            {t('title')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {person.managementLevel === 'KEY_TARGET' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900">
              🔴 {tForm('managementLevels.KEY_TARGET')}
            </span>
          )}
          {person.managementLevel === 'SURVEILLANCE' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              🟠 {tForm('managementLevels.SURVEILLANCE')}
            </span>
          )}
          {person.threatLevel === 'ARMED_DANGEROUS' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white shadow-sm">
              ⚠️ {tForm('threatLevels.ARMED_DANGEROUS')}
            </span>
          )}
          {person.threatLevel === 'HIGH' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-600 text-white shadow-sm">
              ⚠️ {tForm('threatLevels.HIGH')}
            </span>
          )}
        </div>
      </div>

      {/* Basic Investigation Profile Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        {person.citizenId && (
          <div className="p-3 bg-surface-elevated rounded-lg">
            <span className="text-xs text-muted block">{tForm('citizenIdLabel')}</span>
            <span className="font-mono font-medium text-foreground">{person.citizenId}</span>
            {person.citizenIdIssueDate && (
              <span className="text-xs text-muted block mt-0.5">
                {tForm('citizenIdIssueDateLabel')}: {formatDate(parseCalendarDate(person.citizenIdIssueDate), dateFormat)}
              </span>
            )}
            {person.citizenIdIssuePlace && (
              <span className="text-xs text-muted block">
                {person.citizenIdIssuePlace}
              </span>
            )}
          </div>
        )}

        {person.residenceStatus && (
          <div className="p-3 bg-surface-elevated rounded-lg">
            <span className="text-xs text-muted block">{tForm('residenceStatusLabel')}</span>
            <span className="font-medium text-foreground">
              {tForm(`residenceStatusOptions.${person.residenceStatus}` as never) || person.residenceStatus}
            </span>
          </div>
        )}

        {(person.heightCm || person.weightKg || person.bloodType) && (
          <div className="p-3 bg-surface-elevated rounded-lg">
            <span className="text-xs text-muted block">Thể tạng & Nhận dạng</span>
            <div className="font-medium text-foreground space-x-2">
              {person.heightCm && <span>{person.heightCm} cm</span>}
              {person.weightKg && <span>• {person.weightKg} kg</span>}
              {person.bloodType && <span>• Nhóm máu {person.bloodType}</span>}
            </div>
          </div>
        )}
      </div>

      {person.modusOperandi && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 block mb-1">
            🔍 {tForm('modusOperandiLabel')}
          </span>
          <p className="text-foreground whitespace-pre-wrap">{person.modusOperandi}</p>
        </div>
      )}

      {person.riskNotes && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm">
          <span className="text-xs font-semibold text-red-800 dark:text-red-300 block mb-1">
            ⚠️ {tForm('riskNotesLabel')}
          </span>
          <p className="text-foreground whitespace-pre-wrap">{person.riskNotes}</p>
        </div>
      )}

      {/* Gang memberships */}
      {gangMemberships.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            👥 {t('gangsTitle')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gangMemberships.map((m) => (
              <div
                key={m.id}
                className="p-3 bg-surface-elevated rounded-lg border-l-4"
                style={{ borderLeftColor: m.gang.color || '#6366f1' }}
              >
                <div className="font-semibold text-foreground text-sm flex items-center justify-between">
                  <span>{m.gang.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-surface border border-border">
                    {t(`roles.${m.role}` as never) || m.role}
                  </span>
                </div>
                {m.gang.turf && (
                  <p className="text-xs text-muted mt-1">Địa bàn: {m.gang.turf}</p>
                )}
                {m.notes && <p className="text-xs text-muted mt-1 italic">{m.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vehicles Section */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            🚗 {t('vehiclesTitle', { count: vehicles.length })}
          </h4>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowVehicleForm(!showVehicleForm)}
          >
            {showVehicleForm ? 'Hủy' : t('addVehicle')}
          </Button>
        </div>

        {showVehicleForm && (
          <form onSubmit={handleAddVehicle} className="p-4 bg-surface-elevated rounded-lg space-y-3 border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted block mb-1">{t('plateNumber')} *</label>
                <input
                  type="text"
                  required
                  placeholder={t('plateNumberPlaceholder')}
                  value={newVehicle.plateNumber}
                  onChange={(e) => setNewVehicle({ ...newVehicle, plateNumber: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">{t('vehicleType')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('vehicleTypePlaceholder')}
                  value={newVehicle.vehicleType}
                  onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">{t('brandModel')}</label>
                <input
                  type="text"
                  placeholder={t('brandModelPlaceholder')}
                  value={newVehicle.brandModel}
                  onChange={(e) => setNewVehicle({ ...newVehicle, brandModel: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted block mb-1">{t('color')}</label>
                <input
                  type="text"
                  placeholder={t('colorPlaceholder')}
                  value={newVehicle.color}
                  onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">{t('registeredOwner')}</label>
                <input
                  type="text"
                  placeholder={t('registeredOwnerPlaceholder')}
                  value={newVehicle.registeredOwner}
                  onChange={(e) => setNewVehicle({ ...newVehicle, registeredOwner: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">{t('identifyingFeatures')}</label>
                <input
                  type="text"
                  placeholder={t('identifyingFeaturesPlaceholder')}
                  value={newVehicle.identifyingFeatures}
                  onChange={(e) => setNewVehicle({ ...newVehicle, identifyingFeatures: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={newVehicle.isSuspicious}
                  onChange={(e) => setNewVehicle({ ...newVehicle, isSuspicious: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                ⚠️ {t('isSuspicious')}
              </label>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : 'Lưu phương tiện'}
              </Button>
            </div>
          </form>
        )}

        {vehicles.length === 0 ? (
          <p className="text-xs text-muted">{t('noVehicles')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className={`p-3 rounded-lg border flex justify-between items-start ${
                  v.isSuspicious
                    ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-950/20'
                    : 'bg-surface-elevated border-border'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm tracking-wider px-2 py-0.5 rounded bg-surface border border-border">
                      {v.plateNumber}
                    </span>
                    <span className="text-xs text-muted font-medium">{v.vehicleType}</span>
                    {v.isSuspicious && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500 text-white font-semibold">
                        Nghi vấn
                      </span>
                    )}
                  </div>
                  {(v.brandModel || v.color) && (
                    <div className="text-xs text-muted mt-1.5">
                      {[v.brandModel, v.color].filter(Boolean).join(' • ')}
                    </div>
                  )}
                  {v.identifyingFeatures && (
                    <div className="text-xs text-foreground mt-1">
                      Đặc điểm: {v.identifyingFeatures}
                    </div>
                  )}
                  {v.registeredOwner && (
                    <div className="text-xs text-muted mt-0.5">
                      Chủ sở hữu: {v.registeredOwner}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteVehicle(v.id)}
                  className="text-xs text-muted hover:text-red-500 transition-colors p-1"
                  title="Xóa phương tiện"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Physical Marks Section */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            👁️ {t('physicalMarksTitle', { count: marks.length })}
          </h4>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowMarkForm(!showMarkForm)}
          >
            {showMarkForm ? 'Hủy' : t('addPhysicalMark')}
          </Button>
        </div>

        {showMarkForm && (
          <form onSubmit={handleAddMark} className="p-4 bg-surface-elevated rounded-lg space-y-3 border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted block mb-1">{t('markType')} *</label>
                <select
                  value={newMark.type}
                  onChange={(e) => setNewMark({ ...newMark, type: e.target.value })}
                  className={inputClass}
                >
                  <option value="TATTOO">{t('markTypes.TATTOO')}</option>
                  <option value="SCAR">{t('markTypes.SCAR')}</option>
                  <option value="DEFORMITY">{t('markTypes.DEFORMITY')}</option>
                  <option value="MOLE">{t('markTypes.MOLE')}</option>
                  <option value="OTHER">{t('markTypes.OTHER')}</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">{t('markLocation')} *</label>
                <input
                  type="text"
                  required
                  placeholder={t('markLocationPlaceholder')}
                  value={newMark.location}
                  onChange={(e) => setNewMark({ ...newMark, location: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted block mb-1">{t('markDescription')} *</label>
              <textarea
                required
                rows={2}
                placeholder={t('markDescriptionPlaceholder')}
                value={newMark.description}
                onChange={(e) => setNewMark({ ...newMark, description: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-xs text-muted block mb-1">{t('markPhoto')}</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setMarkPhotoFile(e.target.files?.[0] || null)}
                className="text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-on-primary hover:file:bg-primary-dark cursor-pointer"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : 'Lưu dấu vết nhận dạng'}
              </Button>
            </div>
          </form>
        )}

        {marks.length === 0 ? (
          <p className="text-xs text-muted">{t('noMarks')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {marks.map((m) => (
              <div
                key={m.id}
                className="p-3 bg-surface-elevated rounded-lg border border-border flex gap-3 items-start"
              >
                {m.photoUrl ? (
                  <a href={m.photoUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                    <img
                      src={m.photoUrl}
                      alt={m.description}
                      className="w-16 h-16 object-cover rounded-md border border-border shadow-sm hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <div className="w-16 h-16 bg-surface rounded-md border border-border flex items-center justify-center text-xl flex-shrink-0">
                    👁️
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {t(`markTypes.${m.type}` as never) || m.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMark(m.id)}
                      className="text-xs text-muted hover:text-red-500 transition-colors p-1"
                      title="Xóa dấu vết"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-xs font-medium text-foreground mt-1">
                    Vị trí: {m.location}
                  </div>
                  <p className="text-xs text-muted mt-1 break-words">
                    {m.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Criminal Records Section */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            ⚖️ {t('criminalRecordsTitle', { count: records.length })}
          </h4>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowRecordForm(!showRecordForm)}
          >
            {showRecordForm ? 'Hủy' : t('addCriminalRecord')}
          </Button>
        </div>

        {showRecordForm && (
          <form onSubmit={handleAddRecord} className="p-4 bg-surface-elevated rounded-lg space-y-3 border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted block mb-1">{t('charge')} *</label>
                <input
                  type="text"
                  required
                  placeholder={t('chargePlaceholder')}
                  value={newRecord.charge}
                  onChange={(e) => setNewRecord({ ...newRecord, charge: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">{t('recordType')}</label>
                <select
                  value={newRecord.recordType}
                  onChange={(e) => setNewRecord({ ...newRecord, recordType: e.target.value })}
                  className={inputClass}
                >
                  <option value="CONVICTION">{t('recordTypes.CONVICTION')}</option>
                  <option value="ADMIN_VIOLATION">{t('recordTypes.ADMIN_VIOLATION')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted block mb-1">{t('sentenceDetail')}</label>
                <input
                  type="text"
                  placeholder={t('sentenceDetailPlaceholder')}
                  value={newRecord.sentenceDetail}
                  onChange={(e) => setNewRecord({ ...newRecord, sentenceDetail: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">{t('adjudicatedBy')}</label>
                <input
                  type="text"
                  placeholder={t('adjudicatedByPlaceholder')}
                  value={newRecord.adjudicatedBy}
                  onChange={(e) => setNewRecord({ ...newRecord, adjudicatedBy: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted block mb-1">{t('incidentDate')}</label>
                <input
                  type="date"
                  value={newRecord.incidentDate}
                  onChange={(e) => setNewRecord({ ...newRecord, incidentDate: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">{t('verdictDate')}</label>
                <input
                  type="date"
                  value={newRecord.verdictDate}
                  onChange={(e) => setNewRecord({ ...newRecord, verdictDate: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted block mb-1">{t('notes')}</label>
              <textarea
                rows={2}
                value={newRecord.notes}
                onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={newRecord.isPardoned}
                  onChange={(e) => setNewRecord({ ...newRecord, isPardoned: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                ✓ {t('isPardoned')}
              </label>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : 'Lưu tiền án / tiền sự'}
              </Button>
            </div>
          </form>
        )}

        {records.length === 0 ? (
          <p className="text-xs text-muted">{t('noRecords')}</p>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div
                key={r.id}
                className="p-3 bg-surface-elevated rounded-lg border border-border flex justify-between items-start"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        r.recordType === 'CONVICTION'
                          ? 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {t(`recordTypes.${r.recordType}` as never) || r.recordType}
                    </span>
                    <span className="font-semibold text-sm text-foreground">{r.charge}</span>
                    {r.isPardoned && (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30">
                        ✓ {t('isPardoned')}
                      </span>
                    )}
                  </div>
                  {r.sentenceDetail && (
                    <div className="text-xs text-foreground">
                      Bản án: {r.sentenceDetail}
                      {r.adjudicatedBy && ` (${r.adjudicatedBy})`}
                    </div>
                  )}
                  <div className="text-xs text-muted flex gap-3">
                    {r.incidentDate && (
                      <span>Thời điểm: {formatDate(parseCalendarDate(r.incidentDate), dateFormat)}</span>
                    )}
                    {r.verdictDate && (
                      <span>Quyết định: {formatDate(parseCalendarDate(r.verdictDate), dateFormat)}</span>
                    )}
                  </div>
                  {r.notes && <p className="text-xs text-muted italic mt-1">{r.notes}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteRecord(r.id)}
                  className="text-xs text-muted hover:text-red-500 transition-colors p-1"
                  title="Xóa tiền án / tiền sự"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Bank Accounts Section */}
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            💳 {t('bankAccountsTitle', { count: bankAccounts.length })}
          </h4>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowBankForm(!showBankForm)}
          >
            {showBankForm ? 'Đóng' : t('addBankAccount')}
          </Button>
        </div>

        {/* Add Bank Account Form */}
        {showBankForm && (
          <form
            onSubmit={handleAddBankAccount}
            className="p-4 bg-surface-elevated rounded-lg border border-border space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {t('bankName')} *
                </label>
                <input
                  type="text"
                  required
                  value={newBankAccount.bankName}
                  onChange={(e) =>
                    setNewBankAccount({ ...newBankAccount, bankName: e.target.value })
                  }
                  placeholder={t('bankNamePlaceholder')}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {t('accountNumber')} *
                </label>
                <input
                  type="text"
                  required
                  value={newBankAccount.accountNumber}
                  onChange={(e) =>
                    setNewBankAccount({ ...newBankAccount, accountNumber: e.target.value })
                  }
                  placeholder={t('accountNumberPlaceholder')}
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {t('accountHolder')}
                </label>
                <input
                  type="text"
                  value={newBankAccount.accountHolder}
                  onChange={(e) =>
                    setNewBankAccount({ ...newBankAccount, accountHolder: e.target.value })
                  }
                  placeholder={t('accountHolderPlaceholder')}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {t('accountType')}
                </label>
                <select
                  value={newBankAccount.accountType}
                  onChange={(e) =>
                    setNewBankAccount({ ...newBankAccount, accountType: e.target.value })
                  }
                  className={inputClass}
                >
                  <option value="OWNER">{t('accountTypes.OWNER')}</option>
                  <option value="MULE">{t('accountTypes.MULE')}</option>
                  <option value="SUSPICIOUS">{t('accountTypes.SUSPICIOUS')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                {t('notes')}
              </label>
              <textarea
                value={newBankAccount.notes}
                onChange={(e) =>
                  setNewBankAccount({ ...newBankAccount, notes: e.target.value })
                }
                rows={2}
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="inline-flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={newBankAccount.isPrimary}
                  onChange={(e) =>
                    setNewBankAccount({ ...newBankAccount, isPrimary: e.target.checked })
                  }
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>⭐ {t('isPrimary')}</span>
              </label>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : 'Lưu tài khoản'}
              </Button>
            </div>
          </form>
        )}

        {/* Bank Accounts List */}
        {bankAccounts.length === 0 ? (
          <p className="text-xs text-muted">{t('noBankAccounts')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bankAccounts.map((b) => (
              <div
                key={b.id}
                className="p-3 bg-surface-elevated rounded-lg border border-border flex justify-between items-start"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">{b.bankName}</span>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted/30 text-primary">
                      {b.accountNumber}
                    </span>
                    {b.isPrimary && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        ⭐ Chính
                      </span>
                    )}
                  </div>
                  {b.accountHolder && (
                    <div className="text-xs text-foreground font-medium">
                      Chủ TK: <span className="uppercase">{b.accountHolder}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        b.accountType === 'OWNER'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : b.accountType === 'MULE'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'bg-red-500/15 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {t(`accountTypes.${b.accountType}` as never) || b.accountType}
                    </span>
                  </div>
                  {b.notes && <p className="text-xs text-muted italic mt-1">{b.notes}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteBankAccount(b.id)}
                  className="text-xs text-muted hover:text-red-500 transition-colors p-1"
                  title="Xóa tài khoản"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
