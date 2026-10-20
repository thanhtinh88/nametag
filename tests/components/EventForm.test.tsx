import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import EventForm from '../../components/event-form/EventForm';
import viMessages from '../../locales/vi-VN.json';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/MarkdownEditor', () => ({
  default: ({ value, onChange, placeholder }: any) => (
    <textarea
      data-testid="markdown-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('@/components/PersonAutocomplete', () => ({
  default: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="person-autocomplete"
      value={value}
      onChange={(e) => onChange(e.target.value, 'Người Thử Nghiệm')}
      placeholder={placeholder}
    />
  ),
}));

describe('EventForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create mode form with all sections', () => {
    render(
      <NextIntlClientProvider locale="vi" messages={viMessages}>
        <EventForm
          mode="create"
          groups={[{ id: 'g-1', name: 'Chuyên án A', color: '#EF4444' }]}
          availablePeople={[{ id: 'p-1', name: 'A', surname: 'Nguyen', middleName: null, secondLastName: null, nickname: null }]}
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByPlaceholderText(/VD: VV-2026-001/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/VD: Vụ án #2026-04/)).toBeInTheDocument();
    expect(screen.getByText(/Thời điểm & Địa bàn hiện trường/)).toBeInTheDocument();
    expect(screen.getByText(/Diễn biến, Thiệt hại & Hồ sơ tài liệu/)).toBeInTheDocument();
    expect(screen.getByText(/Đối tượng liên quan & Nghi phạm/)).toBeInTheDocument();
  });

  it('renders edit mode form with initial values', () => {
    render(
      <NextIntlClientProvider locale="vi" messages={viMessages}>
        <EventForm
          mode="edit"
          event={{
            id: 'ev-1',
            title: 'Vụ án cướp giật phố Huế',
            category: 'Cướp giật',
            status: 'ONGOING',
            caseCode: 'VV-2026-002',
            crimeType: 'Cướp giật tài sản',
            caseStatus: 'INVESTIGATING',
            incidentTimeNotes: '19:30',
            damageAssessment: 'Chiếc iPhone 15 Pro Max',
            startDate: '2026-10-10T12:30:00.000Z',
            endDate: null,
            hasTime: true,
            description: 'Hai đối tượng đi xe Wave không biển kiểm soát.',
            groups: [{ groupId: 'g-1' }],
            addresses: [],
            urls: [],
            customFields: [],
          }}
          groups={[{ id: 'g-1', name: 'Chuyên án A', color: '#EF4444' }]}
          availablePeople={[]}
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByDisplayValue('VV-2026-002')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Vụ án cướp giật phố Huế')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cướp giật tài sản')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Chiếc iPhone 15 Pro Max')).toBeInTheDocument();
  });
});

