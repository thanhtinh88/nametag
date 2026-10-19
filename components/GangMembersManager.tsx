'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import PersonAvatar from './PersonPhoto';
import { formatFullName, formatGraphName, type NameDisplayFormat } from '@/lib/nameUtils';
import {
  PRESET_GANG_ROLES,
  DEFAULT_GANG_ROLE,
  getGangRoleInfo,
} from '@/lib/gangUtils';
import { Button } from './ui/Button';

interface Person {
  id: string;
  name: string;
  surname?: string | null;
  nickname?: string | null;
  displayNameOverride?: string | null;
  photo?: string | null;
  managementLevel?: string | null;
  threatLevel?: string | null;
}

export interface GangMemberItem {
  id?: string;
  gangId: string;
  personId: string;
  role: string;
  notes?: string | null;
  person: Person;
}

interface GangMembersManagerProps {
  gangId: string;
  gangName: string;
  gangColor?: string | null;
  currentMembers: GangMemberItem[];
  availablePeople: Person[];
  nameOrder?: 'WESTERN' | 'EASTERN';
  nameDisplayFormat?: NameDisplayFormat;
}

export default function GangMembersManager({
  gangId,
  gangName,
  currentMembers,
  availablePeople,
  nameOrder,
  nameDisplayFormat,
}: GangMembersManagerProps) {
  const t = useTranslations('gangs.members');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchPerson, setSearchPerson] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>(DEFAULT_GANG_ROLE);
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [memberNotes, setMemberNotes] = useState('');

  // Modal đổi sang vai trò tùy biến cho thành viên hiện tại
  const [customRoleModal, setCustomRoleModal] = useState<{
    personId: string;
    personName: string;
    currentRole: string;
  } | null>(null);
  const [inlineCustomRole, setInlineCustomRole] = useState('');

  // Filter available people that are not already members
  const memberPersonIds = new Set(currentMembers.map((m) => m.personId));
  const candidatePeople = availablePeople.filter((p) => !memberPersonIds.has(p.id));

  const filteredCandidates = candidatePeople.filter((p) => {
    if (!searchPerson.trim()) return true;
    const term = searchPerson.toLowerCase();
    const fullName = formatFullName(p, nameOrder).toLowerCase();
    const nickname = (p.nickname || '').toLowerCase();
    return fullName.includes(term) || nickname.includes(term);
  });

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId) {
      toast.error(t('selectPerson'));
      return;
    }

    const effectiveRole =
      selectedRole === 'CUSTOM'
        ? customRoleInput.trim() || DEFAULT_GANG_ROLE
        : selectedRole;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/gangs/${gangId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: selectedPersonId,
          role: effectiveRole,
          notes: memberNotes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || t('errorAdd'));
        return;
      }

      const addedPerson = availablePeople.find((p) => p.id === selectedPersonId);
      const personName = addedPerson ? formatFullName(addedPerson, nameOrder) : '';
      toast.success(t('addedSuccess', { name: personName, gang: gangName }));

      // Reset form
      setSelectedPersonId('');
      setSearchPerson('');
      setSelectedRole(DEFAULT_GANG_ROLE);
      setCustomRoleInput('');
      setMemberNotes('');
      setShowAddForm(false);
      router.refresh();
    } catch {
      toast.error(t('errorAdd'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (personId: string, personName: string, newRole: string) => {
    if (newRole === 'CUSTOM') {
      const current = currentMembers.find((m) => m.personId === personId);
      setInlineCustomRole(current?.role || '');
      setCustomRoleModal({
        personId,
        personName,
        currentRole: current?.role || '',
      });
      return;
    }

    try {
      const response = await fetch(`/api/gangs/${gangId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId,
          role: newRole,
        }),
      });

      if (!response.ok) {
        toast.error(t('errorRoleUpdate'));
        return;
      }

      const roleInfo = getGangRoleInfo(newRole);
      toast.success(
        newRole === DEFAULT_GANG_ROLE
          ? `Đã xóa vai trò, chuyển ${personName} về vai trò mặc định (${roleInfo.label})`
          : `Đã cập nhật vai trò của ${personName} thành "${roleInfo.label}"`
      );
      router.refresh();
    } catch {
      toast.error(t('errorRoleUpdate'));
    }
  };

  const handleSaveCustomRoleModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoleModal) return;

    const targetRole = inlineCustomRole.trim() || DEFAULT_GANG_ROLE;
    await handleUpdateRole(customRoleModal.personId, customRoleModal.personName, targetRole);
    setCustomRoleModal(null);
  };

  const handleRemoveMember = async (personId: string, personName: string) => {
    if (!confirm(`Bạn có chắc muốn gỡ ${personName} khỏi băng nhóm ${gangName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/gangs/${gangId}/members/${personId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        toast.error(t('errorRemove'));
        return;
      }

      toast.success(t('removedSuccess', { name: personName, gang: gangName }));
      router.refresh();
    } catch {
      toast.error(t('errorRemove'));
    }
  };

  // Group & sort members by preset order, followed by custom roles, and members
  const presetKeys = PRESET_GANG_ROLES.map((r) => r.key);
  const sortedMembers = [...currentMembers].sort((a, b) => {
    const idxA = presetKeys.indexOf(a.role.toUpperCase());
    const idxB = presetKeys.indexOf(b.role.toUpperCase());
    const rankA = idxA !== -1 ? idxA : 80;
    const rankB = idxB !== -1 ? idxB : 80;
    return rankA - rankB;
  });

  return (
    <div className="bg-surface rounded-xl p-5 border border-border shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <span>🏴</span>
            <span>{t('title', { count: currentMembers.length })}</span>
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Cơ cấu nhân sự, cấp bậc và vai trò phân công trong băng nhóm
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Đóng lại' : `+ ${t('addMember')}`}
        </Button>
      </div>

      {/* Modal tự nhập vai trò tùy biến cho thành viên */}
      {customRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <span>🏷️</span>
                <span>Nhập vai trò tùy ý</span>
              </h4>
              <button
                type="button"
                onClick={() => setCustomRoleModal(null)}
                className="text-muted hover:text-foreground text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomRoleModal} className="space-y-3 text-xs">
              <p className="text-muted">
                Đối tượng: <strong className="text-foreground">{customRoleModal.personName}</strong>
              </p>

              <div>
                <label className="block text-muted font-semibold mb-1">
                  Tên vai trò / Chức danh cụ thể <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="VD: Trực tổng đài lừa đảo, Thu hồi nợ, Tiêu thụ xe gian..."
                  value={inlineCustomRole}
                  onChange={(e) => setInlineCustomRole(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCustomRoleModal(null)}
                >
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Lưu vai trò
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form thêm thành viên */}
      {showAddForm && (
        <form
          onSubmit={handleAddMember}
          className="p-4 bg-surface-elevated rounded-xl space-y-3 border border-border"
        >
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <span>➕</span>
            <span>Thêm đối tượng vào băng nhóm</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Chọn đối tượng */}
            <div>
              <label className="block text-muted mb-1 font-medium">
                Tìm & Chọn đối tượng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Gõ tên hoặc biệt danh để tìm..."
                value={searchPerson}
                onChange={(e) => setSearchPerson(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground mb-1.5"
              />
              <select
                required
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
              >
                <option value="">-- Chọn đối tượng trong danh sách ({filteredCandidates.length}) --</option>
                {filteredCandidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {formatFullName(p, nameOrder)} {p.nickname ? `(${p.nickname})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Chọn vai trò */}
            <div>
              <label className="block text-muted mb-1 font-medium">
                Cấp bậc / Vai trò trong băng nhóm <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground font-semibold"
              >
                <optgroup label="Vai trò mẫu nghiệp vụ">
                  {PRESET_GANG_ROLES.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.icon} {r.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Tùy chỉnh">
                  <option value="CUSTOM">✏️ Khác (Tự gõ chức danh...)</option>
                </optgroup>
              </select>

              {/* Ô tự gõ vai trò nếu chọn CUSTOM */}
              {selectedRole === 'CUSTOM' && (
                <div className="mt-2 animate-in fade-in duration-100">
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên vai trò tùy ý (VD: Trực máy lừa đảo, Thu nợ...)"
                    value={customRoleInput}
                    onChange={(e) => setCustomRoleInput(e.target.value)}
                    className="w-full px-3 py-1.5 border border-primary rounded-lg bg-surface text-foreground font-medium text-xs focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {/* Ghi chú vai trò */}
            <div className="sm:col-span-2">
              <label className="block text-muted mb-1 font-medium">
                Ghi chú vai trò / Hành vi cụ thể (Tùy chọn)
              </label>
              <input
                type="text"
                value={memberNotes}
                onChange={(e) => setMemberNotes(e.target.value)}
                placeholder="VD: Chuyên quản lý sổ sách nợ, tài xế trốn chạy, bảo kê quán bar..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isLoading}>
              {isLoading ? 'Đang thêm...' : 'Xác nhận thêm'}
            </Button>
          </div>
        </form>
      )}

      {/* Danh sách thành viên */}
      {sortedMembers.length === 0 ? (
        <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted mb-2">{t('noMembers')}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            + {t('addMember')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedMembers.map((membership) => {
            const person = membership.person;
            const displayName = formatGraphName(person, nameOrder, nameDisplayFormat);
            const roleInfo = getGangRoleInfo(membership.role);
            const isDefaultRole = membership.role.toUpperCase() === DEFAULT_GANG_ROLE;

            return (
              <div
                key={membership.personId}
                className="flex items-start justify-between p-3.5 bg-surface-elevated/70 border border-border rounded-xl hover:border-primary/40 transition-colors gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <Link href={`/people/${person.id}`} className="shrink-0 hover:opacity-80 transition-opacity">
                    <PersonAvatar
                      personId={person.id}
                      name={person.name}
                      photo={person.photo}
                      size={36}
                    />
                  </Link>

                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/people/${person.id}`}
                        className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate"
                      >
                        {displayName}
                      </Link>
                      {person.nickname && (
                        <span className="text-xs text-muted font-medium truncate">
                          ({person.nickname})
                        </span>
                      )}
                    </div>

                    {/* Badge vai trò & Dropdown đổi vai trò & Nút xóa vai trò */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${roleInfo.badgeClass}`}>
                        <span>{roleInfo.icon}</span>
                        <span>{roleInfo.label}</span>
                      </span>

                      {/* Dropdown đổi vai trò nhanh */}
                      <select
                        value={roleInfo.isCustom ? 'CUSTOM' : membership.role.toUpperCase()}
                        onChange={(e) => handleUpdateRole(person.id, displayName, e.target.value)}
                        className="text-[11px] py-0.5 px-1.5 border border-border rounded bg-surface text-muted hover:text-foreground cursor-pointer focus:outline-none"
                        title="Đổi vai trò trong băng nhóm"
                      >
                        <optgroup label="Vai trò mẫu">
                          {PRESET_GANG_ROLES.map((r) => (
                            <option key={r.key} value={r.key}>
                              {r.icon} {r.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Tùy biến">
                          <option value="CUSTOM">
                            {roleInfo.isCustom ? `🏷️ Sửa vai trò: ${roleInfo.label}` : '✏️ Tự nhập vai trò khác...'}
                          </option>
                        </optgroup>
                      </select>

                      {/* Nút XÓA VAI TRÒ (Chuyển về vai trò mặc định: Thành viên) */}
                      {!isDefaultRole && (
                        <button
                          type="button"
                          onClick={() => handleUpdateRole(person.id, displayName, DEFAULT_GANG_ROLE)}
                          className="text-[10px] font-semibold text-muted hover:text-foreground px-1.5 py-0.5 rounded border border-border bg-surface hover:bg-surface-elevated transition-colors"
                          title="Xóa vai trò, chuyển về vai trò mặc định (Thành viên)"
                        >
                          ↺ Về mặc định
                        </button>
                      )}
                    </div>

                    {membership.notes && (
                      <p className="text-xs text-muted italic line-clamp-2">
                        {membership.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Nút gỡ thành viên khỏi băng nhóm */}
                <button
                  type="button"
                  onClick={() => handleRemoveMember(person.id, displayName)}
                  className="text-muted hover:text-red-500 p-1.5 rounded-lg hover:bg-surface transition-colors shrink-0"
                  title="Gỡ khỏi băng nhóm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
