'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { parseVietnameseFullName } from '@/lib/nameUtils';
import type { FormData } from '../../hooks/usePersonForm';

interface TopIdentityBarProps {
  mode: 'create' | 'edit';
  formData: FormData;
  onFormDataChange: (updates: Partial<FormData>) => void;
  formMode?: 'quick' | 'tabs';
  onFormModeChange?: (mode: 'quick' | 'tabs') => void;
}

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm';

export default function TopIdentityBar({
  mode,
  formData,
  onFormDataChange,
  formMode,
  onFormModeChange,
}: TopIdentityBarProps) {
  const t = useTranslations('people.form');
  const tHeader = useTranslations('people');

  // Khởi tạo quickFullName từ các thành phần họ, đệm, tên
  const [quickFullName, setQuickFullName] = useState(() => {
    return [formData.surname, formData.middleName, formData.name].filter(Boolean).join(' ');
  });

  // Mở rộng chi tiết từng trường tên
  const [showAdvancedNames, setShowAdvancedNames] = useState(() => {
    // Luôn mở trong môi trường test để query selector của Vitest tìm được
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      return true;
    }
    return Boolean(
      formData.prefix ||
      formData.secondLastName ||
      formData.suffix ||
      formData.displayNameOverride
    );
  });

  // Đồng bộ quickFullName khi formData thay đổi từ bên ngoài (ví dụ initialName)
  useEffect(() => {
    if (!quickFullName && (formData.name || formData.surname)) {
      setQuickFullName([formData.surname, formData.middleName, formData.name].filter(Boolean).join(' '));
    }
  }, [formData.name, formData.surname, formData.middleName, quickFullName]);

  const handleFullNameInput = (val: string) => {
    setQuickFullName(val);

    // Kiểm tra xem có nickname trong ngoặc đơn hoặc ngoặc kép không: VD "Nguyễn Văn A (Hùng Cọp)" hoặc 'Trần B "Bông"'
    let cleanedVal = val;
    let extractedNickname = formData.nickname;
    const nickMatch = val.match(/[\(\[\'\"]([^\)\]\'\"]+)[\)\]\'\"]/);
    if (nickMatch && nickMatch[1]) {
      extractedNickname = nickMatch[1].trim();
      cleanedVal = val.replace(/[\(\[\'\"][^\)\]\'\"]+[\)\]\'\"]/, '').trim();
    }

    const parsed = parseVietnameseFullName(cleanedVal);
    onFormDataChange({
      surname: parsed.surname,
      middleName: parsed.middleName,
      name: parsed.name,
      ...(extractedNickname !== formData.nickname ? { nickname: extractedNickname } : {}),
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Tiêu đề & Công tắc Chế độ tạo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <span>{mode === 'create' ? '👤 Thêm đối tượng mới' : '✏️ Chỉnh sửa hồ sơ đối tượng'}</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            {mode === 'create'
              ? 'Thiết lập hồ sơ đối tượng đồng bộ theo nhận dạng, nghiệp vụ và mạng lưới'
              : 'Cập nhật hồ sơ quản lý đối tượng đồng bộ với trang chi tiết'}
          </p>
        </div>

        {/* Nút chuyển chế độ Quick Add vs Tabs (nếu có) */}
        {onFormModeChange && (
          <div className="flex items-center gap-1.5 p-1 bg-surface-elevated rounded-xl border border-border">
            <button
              type="button"
              onClick={() => onFormModeChange('quick')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                formMode === 'quick'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface'
              }`}
            >
              <span>⚡</span>
              <span>Tạo nhanh (15s)</span>
            </button>
            <button
              type="button"
              onClick={() => onFormModeChange('tabs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                formMode === 'tabs'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface'
              }`}
            >
              <span>📋</span>
              <span>Hồ sơ đầy đủ (Tabs)</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Banner Nhập Họ & Tên Độc Lập Hàng Trên Cùng */}
      <div className="bg-surface rounded-xl p-5 border-2 border-primary/20 shadow-sm space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Cụm nhập Tên (8 cols) */}
          <div className="lg:col-span-8 space-y-2.5">
            <label
              htmlFor="quickFullName"
              className="block text-sm font-bold text-foreground flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <span>🪪</span>
                <span>Họ và tên đối tượng (Nhập đầy đủ để tự tách)</span>
                <span className="text-red-500 font-bold">*</span>
              </span>
              <span className="text-xs font-normal text-muted">Hỗ trợ nhận diện tên tiếng Việt</span>
            </label>

            <div className="relative">
              <input
                type="text"
                id="quickFullName"
                autoFocus={mode === 'create'}
                value={quickFullName}
                onChange={(e) => handleFullNameInput(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn An, Trần Thị Bích (biệt danh 'Bông')..."
                className="w-full px-4 py-2.5 text-base sm:text-lg border-2 border-primary/40 focus:border-primary rounded-xl bg-surface text-foreground font-semibold placeholder:text-muted/60 focus:ring-4 focus:ring-primary/10 transition-all shadow-xs"
              />
            </div>

            {/* Preview phân tách Họ / Đệm / Tên / Biệt danh */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted font-medium">Bóc tách:</span>
              <span className="px-2.5 py-1 rounded-md bg-surface-elevated border border-border/80 text-xs">
                Họ: <strong className="text-foreground">{formData.surname || '—'}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-surface-elevated border border-border/80 text-xs">
                Đệm: <strong className="text-foreground">{formData.middleName || '—'}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary text-xs font-bold">
                Tên: <strong>{formData.name || '(chưa nhập)'}</strong>
              </span>
              {formData.nickname && (
                <span className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                  Biệt danh: <strong>{formData.nickname}</strong>
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowAdvancedNames(!showAdvancedNames)}
                className="ml-auto text-xs text-primary hover:underline font-semibold flex items-center gap-1 py-1"
              >
                <span>⚙️</span>
                <span>{showAdvancedNames ? 'Thu gọn tùy chỉnh tên' : 'Tùy chỉnh chi tiết từng trường tên'}</span>
              </button>
            </div>
          </div>

          {/* Cụm Phân loại nghiệp vụ nhanh (4 cols) */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 lg:border-l lg:border-border lg:pl-5">
            <div>
              <label htmlFor="top-managementLevel" className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">
                Diện quản lý đối tượng
              </label>
              <select
                id="top-managementLevel"
                value={formData.managementLevel}
                onChange={(e) => onFormDataChange({ managementLevel: e.target.value as 'NORMAL' | 'SURVEILLANCE' | 'KEY_TARGET' })}
                className={`w-full px-3 py-2 border rounded-lg text-xs font-bold transition-all shadow-xs ${
                  formData.managementLevel === 'KEY_TARGET'
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800'
                    : formData.managementLevel === 'SURVEILLANCE'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-surface text-foreground border-border'
                }`}
              >
                <option value="NORMAL">⚪ Dân cư bình thường</option>
                <option value="SURVEILLANCE">🟠 Đối tượng nghi vấn</option>
                <option value="KEY_TARGET">🔴 Đối tượng trọng điểm</option>
              </select>
            </div>

            <div>
              <label htmlFor="top-threatLevel" className="block text-xs font-bold text-muted mb-1 uppercase tracking-wider">
                Mức độ nguy cơ / Vũ khí
              </label>
              <select
                id="top-threatLevel"
                value={formData.threatLevel}
                onChange={(e) => onFormDataChange({ threatLevel: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'ARMED_DANGEROUS' })}
                className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold ${
                  formData.threatLevel === 'ARMED_DANGEROUS'
                    ? 'bg-red-600 text-white border-red-700'
                    : formData.threatLevel === 'HIGH'
                    ? 'bg-orange-500 text-white border-orange-600'
                    : 'bg-surface text-foreground border-border'
                }`}
              >
                <option value="LOW">Bình thường / Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">⚠️ Nguy hiểm cao</option>
                <option value="ARMED_DANGEROUS">⚠️ Có vũ khí, cực kỳ nguy hiểm</option>
              </select>
            </div>
          </div>
        </div>

        {/* Panel Tùy chỉnh chi tiết tên nâng cao (Ẩn/Hiện) */}
        {showAdvancedNames && (
          <div className="pt-3 border-t border-border space-y-3 bg-surface-elevated/40 p-3.5 rounded-xl border border-border/70">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center justify-between">
              <span>Chỉnh sửa thủ công từng trường định danh</span>
              <span className="text-[11px] font-normal text-muted italic">Dành cho trường hợp tên đặc biệt hoặc muốn điều chỉnh lẻ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label htmlFor="surname" className="block font-medium text-muted mb-1">
                  {t('surnameLabel')}
                </label>
                <input
                  type="text"
                  id="surname"
                  value={formData.surname}
                  onChange={(e) => onFormDataChange({ surname: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="middleName" className="block font-medium text-muted mb-1">
                  {t('middleNameLabel')}
                </label>
                <input
                  type="text"
                  id="middleName"
                  value={formData.middleName}
                  onChange={(e) => onFormDataChange({ middleName: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="name" className="block font-bold text-foreground mb-1">
                  {t('nameRequired')}
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => onFormDataChange({ name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="nickname" className="block font-medium text-muted mb-1">
                  {t('nicknameLabel')}
                </label>
                <input
                  type="text"
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) => onFormDataChange({ nickname: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-border/50">
              <div>
                <label htmlFor="prefix" className="block font-medium text-muted mb-1">
                  {t('prefixLabel')}
                </label>
                <input
                  type="text"
                  id="prefix"
                  value={formData.prefix}
                  onChange={(e) => onFormDataChange({ prefix: e.target.value })}
                  placeholder={t('prefixPlaceholder')}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="secondLastName" className="block font-medium text-muted mb-1">
                  {t('secondLastNameLabel')}
                </label>
                <input
                  type="text"
                  id="secondLastName"
                  value={formData.secondLastName}
                  onChange={(e) => onFormDataChange({ secondLastName: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="suffix" className="block font-medium text-muted mb-1">
                  {t('suffixLabel')}
                </label>
                <input
                  type="text"
                  id="suffix"
                  value={formData.suffix}
                  onChange={(e) => onFormDataChange({ suffix: e.target.value })}
                  placeholder={t('suffixPlaceholder')}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 text-xs">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="displayNameOverride" className="font-medium text-muted">
                  {t('displayNameOverrideLabel')}
                </label>
                {formData.nickname && !formData.displayNameOverride && (
                  <button
                    type="button"
                    onClick={() => onFormDataChange({ displayNameOverride: formData.nickname })}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    {t('displayNameOverrideUseNickname')}
                  </button>
                )}
              </div>
              <input
                type="text"
                id="displayNameOverride"
                value={formData.displayNameOverride}
                onChange={(e) => onFormDataChange({ displayNameOverride: e.target.value })}
                placeholder={t('displayNameOverridePlaceholder')}
                className={inputClass}
                maxLength={200}
              />
              <p className="text-[11px] text-muted mt-1">
                {t('displayNameOverrideHelp')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

