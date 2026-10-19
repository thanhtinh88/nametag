'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import {
  PRESET_GANG_ROLES,
  DEFAULT_GANG_ROLE,
  getGangRoleInfo,
} from '@/lib/gangUtils';
import type {
  FormData,
  VehicleDraftItem,
  PhysicalMarkDraftItem,
  CriminalRecordDraftItem,
  BankAccountDraftItem,
  GangMembershipDraftItem,
} from '../../hooks/usePersonForm';

interface AvailableGang {
  id: string;
  name: string;
  color: string | null;
  turf: string | null;
}

interface InvestigationSectionProps {
  formData: FormData;
  onFormDataChange: (updates: Partial<FormData>) => void;
  mode?: 'create' | 'edit';
  personId?: string;
  vehicles: VehicleDraftItem[];
  onVehiclesChange: (vehicles: VehicleDraftItem[]) => void;
  physicalMarks: PhysicalMarkDraftItem[];
  onPhysicalMarksChange: (marks: PhysicalMarkDraftItem[]) => void;
  criminalRecords: CriminalRecordDraftItem[];
  onCriminalRecordsChange: (records: CriminalRecordDraftItem[]) => void;
  bankAccounts: BankAccountDraftItem[];
  onBankAccountsChange: (accounts: BankAccountDraftItem[]) => void;
  gangMemberships: GangMembershipDraftItem[];
  onGangMembershipsChange: (gangs: GangMembershipDraftItem[]) => void;
  availableGangs?: AvailableGang[];
  dateFormat?: 'MDY' | 'DMY' | 'YMD';
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm';

export default function InvestigationSection({
  formData,
  onFormDataChange,
  mode = 'create',
  personId,
  vehicles,
  onVehiclesChange,
  physicalMarks,
  onPhysicalMarksChange,
  criminalRecords,
  onCriminalRecordsChange,
  bankAccounts,
  onBankAccountsChange,
  gangMemberships,
  onGangMembershipsChange,
  availableGangs = [],
}: InvestigationSectionProps) {
  const t = useTranslations('people.investigation');
  const [isSubmittingSubForm, setIsSubmittingSubForm] = useState(false);

  // Toggle sub-forms
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showMarkForm, setShowMarkForm] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [showGangForm, setShowGangForm] = useState(false);

  // Sub-form state
  const [newVehicle, setNewVehicle] = useState({
    plateNumber: '',
    vehicleType: 'Xe máy',
    brandModel: '',
    color: '',
    identifyingFeatures: '',
    registeredOwner: '',
    isSuspicious: false,
  });

  const [newMark, setNewMark] = useState({
    type: 'TATTOO',
    location: '',
    description: '',
  });

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

  const [newBankAccount, setNewBankAccount] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    accountType: 'OWNER',
    isPrimary: false,
    notes: '',
  });

  const [newGangMembership, setNewGangMembership] = useState({
    gangId: '',
    role: DEFAULT_GANG_ROLE,
    notes: '',
  });
  const [customGangRoleInput, setCustomGangRoleInput] = useState('');

  const [gangsList, setGangsList] = useState<AvailableGang[]>(availableGangs);
  useEffect(() => {
    if (availableGangs && availableGangs.length > 0) {
      setGangsList(availableGangs);
    }
  }, [availableGangs]);

  const [showQuickGangModal, setShowQuickGangModal] = useState(false);
  const [quickGangName, setQuickGangName] = useState('');
  const [quickGangTurf, setQuickGangTurf] = useState('');
  const [quickGangColor, setQuickGangColor] = useState('#EF4444');
  const [isCreatingQuickGang, setIsCreatingQuickGang] = useState(false);

  // ============================================
  // Handlers: Vehicle
  // ============================================
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plateNumber.trim()) return;

    if (mode === 'edit' && personId) {
      setIsSubmittingSubForm(true);
      try {
        const res = await fetch(`/api/people/${personId}/vehicles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newVehicle),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to add vehicle');
        }
        const created = await res.json();
        onVehiclesChange([created.vehicle, ...vehicles]);
        toast.success(t('vehicleAdded') || 'Đã thêm phương tiện');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Lỗi khi thêm phương tiện');
        setIsSubmittingSubForm(false);
        return;
      }
      setIsSubmittingSubForm(false);
    } else {
      // In create mode, assign temp id
      const draft: VehicleDraftItem = {
        id: `draft-${Date.now()}`,
        ...newVehicle,
      };
      onVehiclesChange([draft, ...vehicles]);
      toast.success('Đã thêm phương tiện vào danh sách tạo');
    }

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
  };

  const handleDeleteVehicle = async (vehicleId?: string) => {
    if (!vehicleId) return;
    if (mode === 'edit' && personId && !vehicleId.startsWith('draft-')) {
      if (!confirm('Bạn có chắc muốn xóa phương tiện này?')) return;
      try {
        const res = await fetch(`/api/people/${personId}/vehicles/${vehicleId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete vehicle');
        toast.success(t('vehicleDeleted') || 'Đã xóa phương tiện');
      } catch {
        toast.error('Lỗi khi xóa phương tiện');
        return;
      }
    }
    onVehiclesChange(vehicles.filter((v) => v.id !== vehicleId));
  };

  // ============================================
  // Handlers: Physical Marks
  // ============================================
  const handleAddMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMark.location.trim() || !newMark.description.trim()) return;

    if (mode === 'edit' && personId) {
      setIsSubmittingSubForm(true);
      try {
        const res = await fetch(`/api/people/${personId}/physical-marks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMark),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to add mark');
        }
        const created = await res.json();
        onPhysicalMarksChange([created.physicalMark, ...physicalMarks]);
        toast.success(t('markAdded') || 'Đã thêm dấu vết');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Lỗi khi thêm dấu vết');
        setIsSubmittingSubForm(false);
        return;
      }
      setIsSubmittingSubForm(false);
    } else {
      const draft: PhysicalMarkDraftItem = {
        id: `draft-${Date.now()}`,
        ...newMark,
      };
      onPhysicalMarksChange([draft, ...physicalMarks]);
      toast.success('Đã thêm dấu vết vào danh sách tạo');
    }

    setNewMark({ type: 'TATTOO', location: '', description: '' });
    setShowMarkForm(false);
  };

  const handleDeleteMark = async (markId?: string) => {
    if (!markId) return;
    if (mode === 'edit' && personId && !markId.startsWith('draft-')) {
      if (!confirm('Bạn có chắc muốn xóa dấu vết này?')) return;
      try {
        const res = await fetch(`/api/people/${personId}/physical-marks/${markId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete mark');
        toast.success(t('markDeleted') || 'Đã xóa dấu vết');
      } catch {
        toast.error('Lỗi khi xóa dấu vết');
        return;
      }
    }
    onPhysicalMarksChange(physicalMarks.filter((m) => m.id !== markId));
  };

  // ============================================
  // Handlers: Criminal Records
  // ============================================
  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.charge.trim()) return;

    if (mode === 'edit' && personId) {
      setIsSubmittingSubForm(true);
      try {
        const res = await fetch(`/api/people/${personId}/criminal-records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRecord),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to add criminal record');
        }
        const created = await res.json();
        onCriminalRecordsChange([created.criminalRecord, ...criminalRecords]);
        toast.success(t('recordAdded') || 'Đã thêm tiền án/tiền sự');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Lỗi khi thêm hồ sơ');
        setIsSubmittingSubForm(false);
        return;
      }
      setIsSubmittingSubForm(false);
    } else {
      const draft: CriminalRecordDraftItem = {
        id: `draft-${Date.now()}`,
        ...newRecord,
      };
      onCriminalRecordsChange([draft, ...criminalRecords]);
      toast.success('Đã thêm tiền án/tiền sự vào danh sách tạo');
    }

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
  };

  const handleDeleteRecord = async (recordId?: string) => {
    if (!recordId) return;
    if (mode === 'edit' && personId && !recordId.startsWith('draft-')) {
      if (!confirm('Bạn có chắc muốn xóa bản án/tiền sự này?')) return;
      try {
        const res = await fetch(`/api/people/${personId}/criminal-records/${recordId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete criminal record');
        toast.success(t('recordDeleted') || 'Đã xóa bản án/tiền sự');
      } catch {
        toast.error('Lỗi khi xóa hồ sơ');
        return;
      }
    }
    onCriminalRecordsChange(criminalRecords.filter((r) => r.id !== recordId));
  };

  // ============================================
  // Handlers: Bank Accounts
  // ============================================
  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankAccount.bankName.trim() || !newBankAccount.accountNumber.trim()) return;

    if (mode === 'edit' && personId) {
      setIsSubmittingSubForm(true);
      try {
        const res = await fetch(`/api/people/${personId}/bank-accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBankAccount),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to add bank account');
        }
        const created = await res.json();
        onBankAccountsChange([created.bankAccount, ...bankAccounts]);
        toast.success(t('bankAccountAdded') || 'Đã thêm tài khoản ngân hàng');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Lỗi khi thêm tài khoản');
        setIsSubmittingSubForm(false);
        return;
      }
      setIsSubmittingSubForm(false);
    } else {
      const draft: BankAccountDraftItem = {
        id: `draft-${Date.now()}`,
        ...newBankAccount,
      };
      onBankAccountsChange([draft, ...bankAccounts]);
      toast.success('Đã thêm tài khoản vào danh sách tạo');
    }

    setNewBankAccount({
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      accountType: 'OWNER',
      isPrimary: false,
      notes: '',
    });
    setShowBankForm(false);
  };

  const handleDeleteBankAccount = async (accountId?: string) => {
    if (!accountId) return;
    if (mode === 'edit' && personId && !accountId.startsWith('draft-')) {
      if (!confirm('Bạn có chắc muốn xóa tài khoản ngân hàng này?')) return;
      try {
        const res = await fetch(`/api/people/${personId}/bank-accounts/${accountId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete bank account');
        toast.success(t('bankAccountDeleted') || 'Đã xóa tài khoản');
      } catch {
        toast.error('Lỗi khi xóa tài khoản');
        return;
      }
    }
    onBankAccountsChange(bankAccounts.filter((b) => b.id !== accountId));
  };

  // ============================================
  // Handlers: Gang Memberships
  // ============================================
  const handleCreateQuickGang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGangName.trim()) return;
    setIsCreatingQuickGang(true);
    try {
      const res = await fetch('/api/gangs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickGangName.trim(),
          turf: quickGangTurf.trim() || null,
          color: quickGangColor || '#EF4444',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create gang');
      }
      const createdGang: AvailableGang = {
        id: data.gang.id,
        name: data.gang.name,
        turf: data.gang.turf,
        color: data.gang.color,
      };
      setGangsList((prev) => [createdGang, ...prev]);
      setNewGangMembership((prev) => ({ ...prev, gangId: createdGang.id }));
      setShowQuickGangModal(false);
      setShowGangForm(true);
      setQuickGangName('');
      setQuickGangTurf('');
      toast.success(`Đã tạo băng nhóm "${createdGang.name}"`);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tạo băng nhóm');
    } finally {
      setIsCreatingQuickGang(false);
    }
  };

  const handleAddGangMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGangMembership.gangId) return;

    const selectedGang = gangsList.find((g) => g.id === newGangMembership.gangId);
    const effectiveRole =
      newGangMembership.role === 'CUSTOM'
        ? customGangRoleInput.trim() || DEFAULT_GANG_ROLE
        : newGangMembership.role;

    if (mode === 'edit' && personId) {
      setIsSubmittingSubForm(true);
      try {
        const res = await fetch(`/api/gangs/${newGangMembership.gangId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personId,
            role: effectiveRole,
            notes: newGangMembership.notes || null,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to add gang membership');
        }
        const created = await res.json();
        onGangMembershipsChange([
          {
            ...created.membership,
            gang: selectedGang,
          },
          ...gangMemberships,
        ]);
        toast.success(t('gangMemberAdded') || 'Đã thêm vào băng nhóm');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Lỗi khi thêm vào băng nhóm');
        setIsSubmittingSubForm(false);
        return;
      }
      setIsSubmittingSubForm(false);
    } else {
      const draft: GangMembershipDraftItem = {
        id: `draft-${Date.now()}`,
        gangId: newGangMembership.gangId,
        role: effectiveRole,
        notes: newGangMembership.notes || null,
        gang: selectedGang,
      };
      onGangMembershipsChange([draft, ...gangMemberships]);
      toast.success('Đã thêm băng nhóm vào danh sách tạo');
    }

    setNewGangMembership({
      gangId: '',
      role: DEFAULT_GANG_ROLE,
      notes: '',
    });
    setCustomGangRoleInput('');
    setShowGangForm(false);
  };

  const handleResetGangRole = async (gangId: string, membershipId?: string) => {
    const targetGang = gangMemberships.find((g) => g.gangId === gangId);
    if (!targetGang) return;

    if (mode === 'edit' && personId && membershipId && !membershipId.startsWith('draft-')) {
      try {
        const res = await fetch(`/api/gangs/${gangId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personId,
            role: DEFAULT_GANG_ROLE,
          }),
        });
        if (!res.ok) throw new Error('Failed to reset gang role');
        toast.success('Đã xóa vai trò, chuyển về vai trò mặc định (Thành viên / Đàn em)');
      } catch {
        toast.error('Lỗi khi thiết lập lại vai trò');
        return;
      }
    } else {
      toast.success('Đã chuyển về vai trò mặc định');
    }

    onGangMembershipsChange(
      gangMemberships.map((g) =>
        g.gangId === gangId ? { ...g, role: DEFAULT_GANG_ROLE } : g
      )
    );
  };

  const handleDeleteGangMembership = async (gangId: string, membershipId?: string) => {
    if (mode === 'edit' && personId && membershipId && !membershipId.startsWith('draft-')) {
      if (!confirm('Bạn có chắc muốn xóa quan hệ với băng nhóm này?')) return;
      try {
        const res = await fetch(`/api/gangs/${gangId}/members/${personId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to remove gang member');
        toast.success(t('gangMemberRemoved') || 'Đã xóa khỏi băng nhóm');
      } catch {
        toast.error('Lỗi khi xóa khỏi băng nhóm');
        return;
      }
    }
    onGangMembershipsChange(gangMemberships.filter((g) => g.gangId !== gangId));
  };

  return (
    <div className="space-y-6">
      {/* 1. Tiền án, tiền sự & Vi phạm pháp luật */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
            <span>⚖️</span>
            <span>{t('criminalRecords') || 'Tiền án, tiền sự & Vi phạm'}</span>
            {criminalRecords.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-surface-elevated text-foreground">
                {criminalRecords.length}
              </span>
            )}
          </h4>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowRecordForm(!showRecordForm)}
          >
            {showRecordForm ? 'Hủy' : `+ ${t('addRecord') || 'Thêm tiền án / tiền sự'}`}
          </Button>
        </div>

        {showRecordForm && (
          <form onSubmit={handleAddRecord} className="p-4 bg-surface-elevated rounded-xl space-y-3 border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('charge') || 'Tội danh / Hành vi vi phạm'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Trộm cắp tài sản, Đánh bạc..."
                  value={newRecord.charge}
                  onChange={(e) => setNewRecord({ ...newRecord, charge: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('recordType') || 'Phân loại'}
                </label>
                <select
                  value={newRecord.recordType}
                  onChange={(e) => setNewRecord({ ...newRecord, recordType: e.target.value })}
                  className={inputClass}
                >
                  <option value="CONVICTION">Tiền án (Bản án hình sự)</option>
                  <option value="ADMIN_VIOLATION">Tiền sự (Xử phạt hành chính)</option>
                  <option value="SUSPECT_DETENTION">Tạm giữ / Tạm giam</option>
                  <option value="WARRANT">Lệnh truy nã / Truy tìm</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('sentenceDetail') || 'Mức án / Quyết định xử phạt'}
                </label>
                <input
                  type="text"
                  placeholder="VD: 3 năm tù giam, Phạt 2.000.000 VNĐ"
                  value={newRecord.sentenceDetail}
                  onChange={(e) => setNewRecord({ ...newRecord, sentenceDetail: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('adjudicatedBy') || 'Cơ quan ra quyết định'}
                </label>
                <input
                  type="text"
                  placeholder="VD: TAND quận Đống Đa, CA TP Hà Nội"
                  value={newRecord.adjudicatedBy}
                  onChange={(e) => setNewRecord({ ...newRecord, adjudicatedBy: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('incidentDate') || 'Thời gian vi phạm'}
                </label>
                <input
                  type="date"
                  value={newRecord.incidentDate}
                  onChange={(e) => setNewRecord({ ...newRecord, incidentDate: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('verdictDate') || 'Ngày ra bản án / quyết định'}
                </label>
                <input
                  type="date"
                  value={newRecord.verdictDate}
                  onChange={(e) => setNewRecord({ ...newRecord, verdictDate: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={newRecord.isPardoned}
                  onChange={(e) => setNewRecord({ ...newRecord, isPardoned: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>Đã được xóa án tích / hoàn lương</span>
              </label>

              <Button type="submit" size="sm" disabled={isSubmittingSubForm}>
                {isSubmittingSubForm ? 'Đang lưu...' : 'Lưu bản án'}
              </Button>
            </div>
          </form>
        )}

        {criminalRecords.length === 0 ? (
          <p className="text-xs text-muted italic">Chưa ghi nhận tiền án hoặc tiền sự.</p>
        ) : (
          <div className="space-y-2">
            {criminalRecords.map((r) => (
              <div
                key={r.id}
                className="p-3 bg-surface-elevated rounded-xl border border-border flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">{r.charge}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface border border-border text-muted">
                      {r.recordType === 'CONVICTION' ? 'Tiền án' : r.recordType === 'ADMIN_VIOLATION' ? 'Tiền sự' : r.recordType}
                    </span>
                    {r.isPardoned && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        Đã xóa án tích
                      </span>
                    )}
                  </div>
                  <div className="text-muted">
                    {[r.sentenceDetail, r.adjudicatedBy].filter(Boolean).join(' • ')}
                  </div>
                  {(r.incidentDate || r.verdictDate) && (
                    <div className="text-[11px] text-muted">
                      Ngày vi phạm: {r.incidentDate || '—'} {r.verdictDate ? `| Ngày tuyên: ${r.verdictDate}` : ''}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteRecord(r.id)}
                  className="text-xs text-muted hover:text-red-500 transition-colors p-1"
                  title="Xóa tiền án/tiền sự"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Dấu vết dị hình, hình xăm, đặc điểm nhận dạng */}
      <div className="space-y-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
            <span>🐉</span>
            <span>{t('physicalMarks') || 'Dấu vết, hình xăm & sẹo nhận dạng'}</span>
            {physicalMarks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-surface-elevated text-foreground">
                {physicalMarks.length}
              </span>
            )}
          </h4>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowMarkForm(!showMarkForm)}
          >
            {showMarkForm ? 'Hủy' : `+ ${t('addMark') || 'Thêm dấu vết'}`}
          </Button>
        </div>

        {showMarkForm && (
          <form onSubmit={handleAddMark} className="p-4 bg-surface-elevated rounded-xl space-y-3 border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('markType') || 'Phân loại dấu vết'}
                </label>
                <select
                  value={newMark.type}
                  onChange={(e) => setNewMark({ ...newMark, type: e.target.value })}
                  className={inputClass}
                >
                  <option value="TATTOO">Hình xăm (Tattoo)</option>
                  <option value="SCAR">Vết sẹo (Scar)</option>
                  <option value="DEFORMITY">Dị hình / Khuyết tật</option>
                  <option value="MOLE">Nốt ruồi / Vết chàm</option>
                  <option value="OTHER">Đặc điểm khác</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('markLocation') || 'Vị trí trên cơ thể'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Bắp tay phải, cổ, ngực trái..."
                  value={newMark.location}
                  onChange={(e) => setNewMark({ ...newMark, location: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1">
                {t('markDescription') || 'Mô tả chi tiết'} *
              </label>
              <textarea
                rows={2}
                required
                placeholder="VD: Xăm rồng quấn kiếm, sẹo dài 4cm do chém..."
                value={newMark.description}
                onChange={(e) => setNewMark({ ...newMark, description: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm" disabled={isSubmittingSubForm}>
                {isSubmittingSubForm ? 'Đang lưu...' : 'Lưu dấu vết'}
              </Button>
            </div>
          </form>
        )}

        {physicalMarks.length === 0 ? (
          <p className="text-xs text-muted italic">Chưa lưu dấu vết hoặc hình xăm nhận dạng.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {physicalMarks.map((m) => (
              <div
                key={m.id}
                className="p-3 bg-surface-elevated rounded-xl border border-border flex justify-between items-start text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-foreground">
                      {m.type === 'TATTOO'
                        ? 'Hình xăm'
                        : m.type === 'SCAR'
                        ? 'Vết sẹo'
                        : m.type === 'DEFORMITY'
                        ? 'Dị hình'
                        : m.type}
                    </span>
                    <span className="text-muted">• {m.location}</span>
                  </div>
                  <p className="text-foreground leading-relaxed">{m.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteMark(m.id)}
                  className="text-xs text-muted hover:text-red-500 transition-colors p-1"
                  title="Xóa dấu vết"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Phương tiện di chuyển & Biển số xe */}
      <div className="space-y-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
            <span>🏍️</span>
            <span>{t('vehicles') || 'Phương tiện di chuyển & Biển số xe'}</span>
            {vehicles.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-surface-elevated text-foreground">
                {vehicles.length}
              </span>
            )}
          </h4>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowVehicleForm(!showVehicleForm)}
          >
            {showVehicleForm ? 'Hủy' : `+ ${t('addVehicle') || 'Thêm phương tiện'}`}
          </Button>
        </div>

        {showVehicleForm && (
          <form onSubmit={handleAddVehicle} className="p-4 bg-surface-elevated rounded-xl space-y-3 border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('plateNumber') || 'Biển số xe'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: 29A-123.45"
                  value={newVehicle.plateNumber}
                  onChange={(e) => setNewVehicle({ ...newVehicle, plateNumber: e.target.value })}
                  className={`${inputClass} font-mono`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('vehicleType') || 'Loại xe'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Xe máy, Ô tô, Bán tải..."
                  value={newVehicle.vehicleType}
                  onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('brandModel') || 'Nhãn hiệu / Model'}
                </label>
                <input
                  type="text"
                  placeholder="VD: Honda SH, Toyota Vios..."
                  value={newVehicle.brandModel}
                  onChange={(e) => setNewVehicle({ ...newVehicle, brandModel: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('color') || 'Màu sơn'}
                </label>
                <input
                  type="text"
                  placeholder="VD: Trắng - Đen, Đỏ..."
                  value={newVehicle.color}
                  onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('registeredOwner') || 'Chủ sở hữu đăng ký'}
                </label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn A..."
                  value={newVehicle.registeredOwner}
                  onChange={(e) => setNewVehicle({ ...newVehicle, registeredOwner: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('identifyingFeatures') || 'Đặc điểm nhận dạng xe'}
                </label>
                <input
                  type="text"
                  placeholder="VD: Decal hình hổ, vỡ yếm trái..."
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
                <span>⚠️ Phương tiện nghi vấn phạm tội</span>
              </label>

              <Button type="submit" size="sm" disabled={isSubmittingSubForm}>
                {isSubmittingSubForm ? 'Đang lưu...' : 'Lưu phương tiện'}
              </Button>
            </div>
          </form>
        )}

        {vehicles.length === 0 ? (
          <p className="text-xs text-muted italic">Chưa lưu phương tiện di chuyển.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className={`p-3 rounded-xl border flex justify-between items-start text-xs ${
                  v.isSuspicious
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-surface-elevated border-border'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm tracking-wider px-2 py-0.5 rounded bg-surface border border-border">
                      {v.plateNumber}
                    </span>
                    <span className="text-muted font-medium">{v.vehicleType}</span>
                    {v.isSuspicious && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-white font-semibold">
                        Nghi vấn
                      </span>
                    )}
                  </div>
                  {(v.brandModel || v.color) && (
                    <div className="text-muted mt-1">
                      {[v.brandModel, v.color].filter(Boolean).join(' • ')}
                    </div>
                  )}
                  {v.identifyingFeatures && (
                    <div className="text-foreground mt-0.5">
                      Đặc điểm: {v.identifyingFeatures}
                    </div>
                  )}
                  {v.registeredOwner && (
                    <div className="text-muted mt-0.5 text-[11px]">
                      Chủ xe: {v.registeredOwner}
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

      {/* 4. Tài khoản ngân hàng */}
      <div className="space-y-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
            <span>💳</span>
            <span>{t('bankAccounts') || 'Tài khoản ngân hàng & Dòng tiền'}</span>
            {bankAccounts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-surface-elevated text-foreground">
                {bankAccounts.length}
              </span>
            )}
          </h4>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowBankForm(!showBankForm)}
          >
            {showBankForm ? 'Hủy' : `+ ${t('addBankAccount') || 'Thêm tài khoản'}`}
          </Button>
        </div>

        {showBankForm && (
          <form onSubmit={handleAddBankAccount} className="p-4 bg-surface-elevated rounded-xl space-y-3 border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('bankName') || 'Tên ngân hàng'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Vietcombank, Techcombank..."
                  value={newBankAccount.bankName}
                  onChange={(e) => setNewBankAccount({ ...newBankAccount, bankName: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('accountNumber') || 'Số tài khoản'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: 1903388888888"
                  value={newBankAccount.accountNumber}
                  onChange={(e) => setNewBankAccount({ ...newBankAccount, accountNumber: e.target.value })}
                  className={`${inputClass} font-mono`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('accountHolder') || 'Chủ tài khoản (Đứng tên)'}
                </label>
                <input
                  type="text"
                  placeholder="VD: NGUYEN VAN A"
                  value={newBankAccount.accountHolder}
                  onChange={(e) => setNewBankAccount({ ...newBankAccount, accountHolder: e.target.value })}
                  className={`${inputClass} uppercase`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  {t('accountType') || 'Phân loại tài khoản'}
                </label>
                <select
                  value={newBankAccount.accountType}
                  onChange={(e) => setNewBankAccount({ ...newBankAccount, accountType: e.target.value })}
                  className={inputClass}
                >
                  <option value="OWNER">Chính chủ sở hữu</option>
                  <option value="MULE">Tài khoản thuê / Mua mượn (Mule)</option>
                  <option value="SUSPICIOUS">Nghi vấn giao dịch rửa tiền</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={newBankAccount.isPrimary}
                  onChange={(e) => setNewBankAccount({ ...newBankAccount, isPrimary: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>Tài khoản giao dịch chính</span>
              </label>

              <Button type="submit" size="sm" disabled={isSubmittingSubForm}>
                {isSubmittingSubForm ? 'Đang lưu...' : 'Lưu tài khoản'}
              </Button>
            </div>
          </form>
        )}

        {bankAccounts.length === 0 ? (
          <p className="text-xs text-muted italic">Chưa lưu tài khoản ngân hàng.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bankAccounts.map((b) => (
              <div
                key={b.id}
                className="p-3 bg-surface-elevated rounded-xl border border-border flex justify-between items-start text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm tracking-wide text-foreground">
                      {b.accountNumber}
                    </span>
                    <span className="text-muted font-medium">({b.bankName})</span>
                    {b.isPrimary && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary text-on-primary font-semibold">
                        Chính
                      </span>
                    )}
                  </div>
                  {b.accountHolder && (
                    <div className="text-muted uppercase mt-1 text-[11px]">
                      Chủ TK: {b.accountHolder}
                    </div>
                  )}
                  <div className="text-[11px] text-muted mt-0.5">
                    Loại: {b.accountType === 'MULE' ? 'Tài khoản thuê mượn (Mule)' : b.accountType === 'SUSPICIOUS' ? 'Nghi vấn' : 'Chính chủ'}
                  </div>
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

      {/* 5. Băng nhóm tội phạm liên quan */}
      <div className="space-y-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
            <span>🏴</span>
            <span>{t('gangMemberships') || 'Băng nhóm tội phạm liên quan'}</span>
            {gangMemberships.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-surface-elevated text-foreground">
                {gangMemberships.length}
              </span>
            )}
          </h4>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowQuickGangModal(true)}
            >
              + Tạo băng nhóm mới
            </Button>
            {gangsList.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowGangForm(!showGangForm)}
              >
                {showGangForm ? 'Hủy' : `+ ${t('addGangMember') || 'Gắn vào băng nhóm'}`}
              </Button>
            )}
          </div>
        </div>

        {/* Modal tạo nhanh băng nhóm */}
        {showQuickGangModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>🏴</span>
                  <span>Tạo nhanh băng nhóm mới</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowQuickGangModal(false)}
                  className="text-muted hover:text-foreground text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateQuickGang} className="space-y-4 text-xs">
                <div>
                  <label className="block text-muted font-semibold mb-1">
                    Tên băng nhóm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="VD: Băng nhóm Xã Đàn, Nhóm Tín dụng đen..."
                    value={quickGangName}
                    onChange={(e) => setQuickGangName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground font-semibold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-muted font-semibold mb-1">
                    Địa bàn hoạt động / Bảo kê
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Phố Xã Đàn, Bến xe Giáp Bát, Khu công nghiệp..."
                    value={quickGangTurf}
                    onChange={(e) => setQuickGangTurf(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-muted font-semibold mb-1">
                    Màu sắc nhận diện
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={quickGangColor}
                      onChange={(e) => setQuickGangColor(e.target.value)}
                      className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                    />
                    <span className="font-mono font-medium text-foreground uppercase">
                      {quickGangColor}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowQuickGangModal(false)}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={isCreatingQuickGang}>
                    {isCreatingQuickGang ? 'Đang tạo...' : 'Tạo & Chọn ngay'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showGangForm && (
          <form onSubmit={handleAddGangMembership} className="p-4 bg-surface-elevated rounded-xl space-y-3 border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  Chọn băng nhóm *
                </label>
                <select
                  required
                  value={newGangMembership.gangId}
                  onChange={(e) => setNewGangMembership({ ...newGangMembership, gangId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">-- Chọn băng nhóm --</option>
                  {gangsList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} {g.turf ? `(${g.turf})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  Vai trò trong băng nhóm
                </label>
                <select
                  value={newGangMembership.role}
                  onChange={(e) => setNewGangMembership({ ...newGangMembership, role: e.target.value })}
                  className={inputClass}
                >
                  <optgroup label="Vai trò mẫu">
                    {PRESET_GANG_ROLES.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.icon} {r.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Tùy biến">
                    <option value="CUSTOM">✏️ Khác (Tự gõ chức danh...)</option>
                  </optgroup>
                </select>
                {newGangMembership.role === 'CUSTOM' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Nhập vai trò tùy ý (VD: Thu tiền bảo kê, Trông tiệm cầm đồ...)"
                      value={customGangRoleInput}
                      onChange={(e) => setCustomGangRoleInput(e.target.value)}
                      className={inputClass}
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm" disabled={isSubmittingSubForm}>
                {isSubmittingSubForm ? 'Đang lưu...' : 'Lưu quan hệ băng nhóm'}
              </Button>
            </div>
          </form>
        )}

        {gangMemberships.length === 0 ? (
          <div className="p-4 bg-surface-elevated rounded-xl border border-dashed border-border text-center space-y-2">
            <p className="text-xs text-muted">
              {gangsList.length === 0
                ? 'Hệ thống chưa có băng nhóm tội phạm nào.'
                : 'Chưa gắn đối tượng vào băng nhóm nào.'}
            </p>
            {gangsList.length === 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowQuickGangModal(true)}
              >
                + Tạo băng nhóm mới ngay
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowGangForm(true)}
              >
                + Gắn vào băng nhóm
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {gangMemberships.map((gm) => {
              const roleInfo = getGangRoleInfo(gm.role);
              const isDefaultRole = (gm.role || DEFAULT_GANG_ROLE).toUpperCase() === DEFAULT_GANG_ROLE;

              return (
                <div
                  key={gm.id || gm.gangId}
                  className="p-3 bg-surface-elevated rounded-xl border border-border flex justify-between items-center text-xs gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: gm.gang?.color || '#ef4444' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">
                          {gm.gang?.name || 'Băng nhóm'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${roleInfo.badgeClass}`}
                        >
                          <span>{roleInfo.icon}</span>
                          <span>{roleInfo.label}</span>
                        </span>
                        {gm.gang?.turf && (
                          <span className="text-muted text-[11px]">📍 {gm.gang.turf}</span>
                        )}
                      </div>
                      {gm.notes && (
                        <p className="text-[11px] text-muted mt-0.5 italic truncate">{gm.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isDefaultRole && (
                      <button
                        type="button"
                        onClick={() => handleResetGangRole(gm.gangId, gm.id)}
                        className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                        title="Xóa vai trò, chuyển về vai trò mặc định của băng nhóm (Thành viên / Đàn em)"
                      >
                        ↺ Về mặc định
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteGangMembership(gm.gangId, gm.id)}
                      className="text-xs text-muted hover:text-red-500 transition-colors p-1.5 rounded hover:bg-surface"
                      title="Gỡ khỏi băng nhóm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Phương thức thủ đoạn & Đánh giá rủi ro */}
      <div className="space-y-4 pt-3 border-t border-border">
        <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
          <span>🎯</span>
          <span>Phương thức thủ đoạn & Đánh giá rủi ro</span>
        </h4>

        <div>
          <label htmlFor="modusOperandi" className="block text-xs font-semibold text-muted mb-1">
            {t('modusOperandi') || 'Phương thức, thủ đoạn hoạt động (M.O)'}
          </label>
          <textarea
            id="modusOperandi"
            rows={3}
            value={formData.modusOperandi}
            onChange={(e) => onFormDataChange({ modusOperandi: e.target.value })}
            placeholder="Mô tả chi tiết phương thức gây án, công cụ sử dụng, quy luật hoạt động, tuyến đường di chuyển..."
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="riskNotes" className="block text-xs font-semibold text-muted mb-1">
            {t('riskNotes') || 'Đánh giá nguy cơ & Biện pháp phòng ngừa nghiệp vụ'}
          </label>
          <textarea
            id="riskNotes"
            rows={2}
            value={formData.riskNotes}
            onChange={(e) => onFormDataChange({ riskNotes: e.target.value })}
            placeholder="Cảnh báo mức độ manh động, khả năng tẩu thoát, biện pháp giám sát hoặc phương án tiếp cận an toàn..."
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
