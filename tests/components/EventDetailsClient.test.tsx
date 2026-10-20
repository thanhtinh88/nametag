import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import EventDetailsClient from '../../components/EventDetailsClient';
import viMessages from '../../locales/vi-VN.json';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
  usePathname: vi.fn(() => '/events/ev-1'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/PersonPhoto', () => ({
  default: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}));

vi.mock('@/components/investigation/SuspectMatcherModal', () => ({
  default: () => <button data-testid="suspect-matcher-btn">So khớp nghi can</button>,
}));

vi.mock('@/components/EventDeleteButton', () => ({
  default: () => <button data-testid="event-delete-btn">Xóa vụ án</button>,
}));

vi.mock('@/components/ImmichGallerySection', () => ({
  default: () => <div data-testid="immich-gallery">Immich Gallery</div>,
}));

vi.mock('@/components/UnifiedNetworkGraph', () => ({
  default: () => <div data-testid="unified-network-graph">Unified Network Graph</div>,
}));

vi.mock('@/components/EventPeopleManager', () => ({
  default: () => <div data-testid="event-people-manager">Event People Manager</div>,
}));

vi.mock('@/components/EventRelationshipManager', () => ({
  default: () => <div data-testid="event-rel-manager">Event Relationship Manager</div>,
}));

const mockEventDetail = {
  id: 'ev-1',
  title: 'Vụ án đột nhập kho hàng Gia Lâm',
  category: 'Trộm cắp',
  status: 'ONGOING' as const,
  caseCode: 'VV-2026-99',
  crimeType: 'Trộm cắp có tổ chức',
  caseStatus: 'INVESTIGATING',
  incidentTimeNotes: 'Đêm 14 rạng sáng 15/10',
  damageAssessment: 'Thiệt hại 200 triệu đồng linh kiện điện tử',
  startDate: '2026-10-14T17:00:00.000Z',
  endDate: null,
  hasTime: true,
  description: 'Thủ phạm dùng kìm cộng lực cắt khóa cửa sau.',
  immichAlbumId: null,
  groups: [{ group: { id: 'g-1', name: 'Chuyên án GL-01', color: '#3B82F6' } }],
  addresses: [
    {
      id: 'a-1',
      type: 'Hiện trường',
      streetLine1: 'Số 10 Nguyễn Đức Thuận',
      locality: 'Gia Lâm, Hà Nội',
      country: 'VN',
      latitude: 21.03,
      longitude: 105.9,
    },
  ],
  urls: [{ id: 'u-1', type: 'báo chí', url: 'https://example.com/news/1' }],
  customFields: [{ id: 'cf-1', key: 'Đơn vị thụ lý', value: 'Đội CSHS Công an Gia Lâm' }],
  people: [
    {
      id: 'pe-1',
      personId: 'p-1',
      role: 'Cầm đầu',
      involvementType: 'SUSPECT',
      verificationStatus: 'CONFIRMED',
      confidence: 'HIGH',
      reasonForSuspicion: 'Dấu vân tay trùng khớp tại hiện trường',
      alibi: 'Khai ở nhà ngủ nhưng không có người làm chứng',
      notes: 'Đã triệu tập làm việc',
      person: {
        id: 'p-1',
        name: 'Tuấn',
        surname: 'Trần',
        nickname: 'Tuấn Con',
        displayNameOverride: null,
        photo: null,
      },
    },
  ],
  relationshipsFrom: [],
  journalEntries: [
    {
      journalEntry: {
        id: 'je-1',
        title: 'Khám nghiệm hiện trường vụ đột nhập',
        date: '2026-10-15T08:00:00.000Z',
        body: 'Thu giữ 01 mẫu dấu vân tay trên mặt bàn thu ngân.',
        people: [],
      },
    },
  ],
};

describe('EventDetailsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <NextIntlClientProvider locale="vi" messages={viMessages}>
        <EventDetailsClient
          event={mockEventDetail}
          availablePeople={[]}
          availableEvents={[]}
          immichConfigured={true}
          dateFormat="DMY"
          nameOrder="EASTERN"
          nameDisplayFormat="FULL"
        />
      </NextIntlClientProvider>
    );
  };

  it('renders top identity bar with case code, crime type and title', () => {
    renderComponent();
    expect(screen.getByText('VV-2026-99')).toBeInTheDocument();
    expect(screen.getByText('Vụ án đột nhập kho hàng Gia Lâm')).toBeInTheDocument();
    expect(screen.getByText(/Trộm cắp có tổ chức/)).toBeInTheDocument();
  });

  it('renders the embedded graph, people manager and rel manager in the merged network tab by default', () => {
    renderComponent();
    expect(screen.getByTestId('unified-network-graph')).toBeInTheDocument();
    expect(screen.getByTestId('event-people-manager')).toBeInTheDocument();
    expect(screen.getByTestId('event-rel-manager')).toBeInTheDocument();
    expect(screen.getByText(/Nghi can chính/)).toBeInTheDocument();
  });

  it('switches to overview tab when clicked and shows damage assessment', async () => {
    const user = userEvent.setup();
    renderComponent();

    const overviewTab = screen.getByRole('button', { name: /Hồ sơ & Hiện trường/i });
    await user.click(overviewTab);

    expect(screen.getByText(/Thiệt hại 200 triệu đồng linh kiện điện tử/)).toBeInTheDocument();
  });

  it('switches to timeline tab and renders journal entries', async () => {
    const user = userEvent.setup();
    renderComponent();

    const timelineTab = screen.getByRole('button', { name: /Nhật ký & Tiến trình/i });
    await user.click(timelineTab);

    expect(screen.getByText('Khám nghiệm hiện trường vụ đột nhập')).toBeInTheDocument();
  });
});
