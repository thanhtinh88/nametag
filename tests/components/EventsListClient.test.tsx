import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import EventsListClient, { type SerializedEventItem } from '../../components/EventsListClient';
import viMessages from '../../locales/vi-VN.json';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
  usePathname: vi.fn(() => '/events'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/PersonPhoto', () => ({
  default: ({ name }: { name: string }) => <div data-testid="avatar">{name[0]}</div>,
}));

const mockEvents: SerializedEventItem[] = [
  {
    id: 'ev-1',
    title: 'Vụ án trộm cắp tiệm vàng Kim Bảo',
    category: 'Hình sự',
    status: 'ONGOING',
    caseCode: 'VV-2026-001',
    crimeType: 'Trộm cắp tài sản',
    caseStatus: 'INVESTIGATING',
    incidentTimeNotes: 'Đêm khuya 02:00',
    damageAssessment: 'Mất 50 lượng vàng',
    startDate: '2026-10-15T02:00:00.000Z',
    endDate: null,
    hasTime: true,
    description: 'Đối tượng cạy cửa đột nhập từ tầng 2.',
    groups: [{ groupId: 'g-1', group: { id: 'g-1', name: 'Chuyên án VA-01', color: '#EF4444' } }],
    addresses: [{ id: 'a-1', type: 'crime_scene', locality: 'Hà Nội', country: 'VN', latitude: 21.0, longitude: 105.8, geocodeStatus: 'success' }],
    people: [
      {
        id: 'pe-1',
        personId: 'p-1',
        role: 'Cầm đầu',
        involvementType: 'SUSPECT',
        verificationStatus: 'CONFIRMED',
        person: {
          id: 'p-1',
          name: 'Văn A',
          surname: 'Nguyễn',
          nickname: 'A Đen',
          displayNameOverride: null,
          photo: null,
        },
      },
    ],
    relatedEventsCount: 0,
  },
];

describe('EventsListClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof EventsListClient>> = {}) => {
    return render(
      <NextIntlClientProvider locale="vi" messages={viMessages}>
        <EventsListClient
          events={mockEvents}
          totalCount={1}
          currentPage={1}
          totalPages={1}
          pageSize={25}
          sortBy="startDate"
          order="desc"
          caseStatusFilter=""
          statusFilter=""
          groupFilter=""
          personFilter=""
          categoryFilter=""
          query=""
          quickCounts={{
            totalAll: 10,
            countUnresolved: 4,
            countInvestigating: 3,
            countSolved: 2,
            countSuspended: 1,
            countActive: 5,
          }}
          crossCaseSuspects={[]}
          categories={['Hình sự', 'Ma túy']}
          groups={[{ id: 'g-1', name: 'Chuyên án VA-01', color: '#EF4444' }]}
          people={[{ id: 'p-1', name: 'Văn A', surname: 'Nguyễn', nickname: 'A Đen', displayNameOverride: null }]}
          dateFormat="DMY"
          nameOrder="EASTERN"
          nameDisplayFormat="FULL"
          {...props}
        />
      </NextIntlClientProvider>
    );
  };

  it('renders quick tactical chips with counts', () => {
    renderComponent();
    expect(screen.getByText(/Tất cả \(10\)/)).toBeInTheDocument();
    expect(screen.getAllByText(/Chưa rõ đối tượng/).length).toBeGreaterThan(0);
    expect(screen.getByText(/\(4\)/)).toBeInTheDocument();
    expect(screen.getAllByText(/Đang thụ lý điều tra/).length).toBeGreaterThan(0);
  });

  it('renders the event card in grid view with caseCode, title and quick status selector', () => {
    renderComponent();
    expect(screen.getByText('VV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Vụ án trộm cắp tiệm vàng Kim Bảo')).toBeInTheDocument();
    expect(screen.getByText(/Trộm cắp tài sản/)).toBeInTheDocument();
  });

  it('can switch to table view mode', async () => {
    const user = userEvent.setup();
    renderComponent();

    const tableViewBtn = screen.getByRole('button', { name: /Sổ thụ lý/i });
    await user.click(tableViewBtn);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Mã số / Tiêu đề')).toBeInTheDocument();
  });

  it('clicking a quick chip navigates with caseStatus filter', async () => {
    const user = userEvent.setup();
    renderComponent();

    const unresolvedChip = screen.getByRole('button', { name: /Chưa rõ đối tượng/i });
    await user.click(unresolvedChip);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('caseStatus=UNRESOLVED'));
  });
});
