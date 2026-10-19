'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';

export interface QuickLinkCasePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  personId: string;
  personName: string;
  caseId: string;
  caseTitle: string;
  distanceText?: string | null;
  onLinked: (data: {
    personId: string;
    involvementType: string;
    verificationStatus: string;
    role?: string;
  }) => void;
}

export default function QuickLinkCasePopover({
  isOpen,
  onClose,
  personId,
  personName,
  caseId,
  caseTitle,
  distanceText,
  onLinked,
}: QuickLinkCasePopoverProps) {
  const [involvementType, setInvolvementType] = useState('PERSON_OF_INTEREST');
  const [verificationStatus, setVerificationStatus] = useState('INVESTIGATING');
  const [role, setRole] = useState('');
  const [reason, setReason] = useState(distanceText ? `Xuất hiện cách hiện trường ${distanceText}` : '');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/events/${caseId}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId,
          involvementType,
          verificationStatus,
          role: role.trim() || undefined,
          reasonForSuspicion: reason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Không thể liên kết đối tượng vào vụ án');
      }

      toast.success(`Đã đưa ${personName} vào vụ án`);
      onLinked({
        personId,
        involvementType,
        verificationStatus,
        role: role.trim() || undefined,
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-surface-elevated/80 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Đưa đối tượng vào vụ án</h3>
            <p className="text-[11px] text-muted truncate max-w-[260px]">
              Vụ: <span className="font-semibold text-foreground">{caseTitle}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20">
            <div className="font-semibold text-foreground text-sm">{personName}</div>
            {distanceText && (
              <div className="text-[11px] text-primary font-medium mt-0.5">
                📍 Cách hiện trường {distanceText}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              Vai trò trong vụ án
            </label>
            <select
              value={involvementType}
              onChange={(e) => setInvolvementType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="PERSON_OF_INTEREST">Đối tượng nghi vấn</option>
              <option value="SUSPECT">Nghi phạm chính</option>
              <option value="ACCOMPLICE">Đồng phạm / Giúp sức</option>
              <option value="WITNESS">Nhân chứng</option>
              <option value="VICTIM">Bị hại</option>
              <option value="INFORMANT">Nguồn tin / Cơ sở</option>
              <option value="OTHER">Vai trò khác</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              Trạng thái xác minh
            </label>
            <select
              value={verificationStatus}
              onChange={(e) => setVerificationStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="INVESTIGATING">Đang điều tra</option>
              <option value="HYPOTHESIS">Nghi vấn / Giả thuyết</option>
              <option value="CONFIRMED">Đã khẳng định</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              Ghi chú nghi vấn / Chi tiết vai trò
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Có mặt tại hiện trường lúc 23h..."
              className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-surface-elevated transition-colors text-xs"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors text-xs flex items-center gap-1.5 shadow-sm"
            >
              {loading ? 'Đang lưu...' : '✓ Xác nhận gán'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

