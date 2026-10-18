import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  eventFindUnique: vi.fn(),
  personFindMany: vi.fn(),
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    event: {
      findUnique: mocks.eventFindUnique,
    },
    person: {
      findMany: mocks.personFindMany,
    },
  },
}));

vi.mock('../../lib/api-utils', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api-utils')>('../../lib/api-utils');
  return {
    ...actual,
    withAuth: (handler: any) => (req: any, ctx: any) =>
      handler(req, { user: { id: 'user-123', email: 'test@example.com' } }, ctx),
  };
});

import { GET } from '../../app/api/events/[id]/candidate-suspects/route';

describe('Candidate Suspects Smart Matcher API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEvent = {
    id: 'ev-1',
    title: 'Vụ trộm đột nhập phố Hàng Bạc',
    crimeType: 'Trộm cắp tài sản',
    addresses: [
      {
        latitude: 21.0345,
        longitude: 105.8525,
        locality: 'Hoàn Kiếm, Hà Nội',
        streetLine1: '12 Hàng Bạc',
      },
    ],
    people: [
      {
        personId: 'person-already-linked',
        involvementType: 'SUSPECT',
        verificationStatus: 'INVESTIGATING',
      },
    ],
  };

  it('returns 404 if event is not found', async () => {
    mocks.eventFindUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/events/non-existent/candidate-suspects');
    const res = await GET(req, { params: Promise.resolve({ id: 'non-existent' }) });

    expect(res.status).toBe(404);
  });

  it('ranks and filters candidates based on GPS distance, crime type, and management level', async () => {
    mocks.eventFindUnique.mockResolvedValue(mockEvent);

    const candidate1 = {
      id: 'person-near-target',
      name: 'Trần Văn',
      surname: 'Tặc',
      nickname: 'Tặc Mắt Lé',
      displayNameOverride: null,
      photo: null,
      managementLevel: 'KEY_TARGET',
      threatLevel: 'HIGH',
      citizenId: '001200000001',
      modusOperandi: 'Thường cạy khóa ban đêm trộm cắp tài sản các cửa hàng kim hoàn',
      addresses: [
        {
          id: 'addr-1',
          streetLine1: '18 Hàng Bạc',
          locality: 'Hoàn Kiếm',
          latitude: 21.0347, // ~25 meters from crime scene
          longitude: 105.8526,
        },
      ],
      vehicles: [
        { plateNumber: '29B1-999.88', brandModel: 'Honda Wave alpha', color: 'Đỏ' },
      ],
      physicalMarks: [
        { type: 'TATTOO', location: 'Cánh tay phải', description: 'Hình đầu hổ' },
      ],
      criminalRecords: [
        { charge: 'Trộm cắp tài sản', sentenceDetail: '2 năm tù', recordType: 'CONVICTION' },
      ],
      gangMemberships: [
        { gang: { id: 'gang-1', name: 'Băng Hàng Bạc', turf: 'Hoàn Kiếm', color: '#ff0000' } },
      ],
    };

    const candidate2 = {
      id: 'person-far-normal',
      name: 'Lê Văn',
      surname: 'Lành',
      nickname: null,
      displayNameOverride: null,
      photo: null,
      managementLevel: 'NORMAL',
      threatLevel: 'LOW',
      citizenId: '001200000002',
      modusOperandi: null,
      addresses: [
        {
          id: 'addr-2',
          streetLine1: 'Quận Hà Đông',
          locality: 'Hà Nội',
          latitude: 20.9700, // ~15km away
          longitude: 105.7800,
        },
      ],
      vehicles: [],
      physicalMarks: [],
      criminalRecords: [],
      gangMemberships: [],
    };

    mocks.personFindMany.mockResolvedValue([candidate1, candidate2]);

    // Test with radius 2km
    const req = new Request('http://localhost/api/events/ev-1/candidate-suspects?radiusKm=2&managementFilter=ALL');
    const res = await GET(req, { params: Promise.resolve({ id: 'ev-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.crimeScene.hasCoordinates).toBe(true);
    expect(body.crimeType).toBe('Trộm cắp tài sản');
    // Person 2 is 15km away, should be filtered out by radiusKm=2
    expect(body.candidates.length).toBe(1);
    expect(body.candidates[0].person.id).toBe('person-near-target');
    expect(body.candidates[0].score).toBeGreaterThan(60);
    expect(body.candidates[0].matchReasons).toContain('Đối tượng trọng điểm địa bàn');
  });

  it('filters candidates by SUSPECTS_ONLY and historyOnly', async () => {
    mocks.eventFindUnique.mockResolvedValue(mockEvent);

    const normalWithRecord = {
      id: 'person-normal-record',
      name: 'Phạm Văn',
      surname: 'C',
      nickname: null,
      displayNameOverride: null,
      photo: null,
      managementLevel: 'NORMAL',
      threatLevel: 'LOW',
      citizenId: '001200000003',
      modusOperandi: null,
      addresses: [],
      vehicles: [],
      physicalMarks: [],
      criminalRecords: [
        { charge: 'Gây rối trật tự công cộng', sentenceDetail: 'Phạt hành chính', recordType: 'ADMIN_VIOLATION' },
      ],
      gangMemberships: [],
    };

    const suspectWithoutRecord = {
      id: 'person-suspect-clean',
      name: 'Vũ Thị',
      surname: 'D',
      nickname: null,
      displayNameOverride: null,
      photo: null,
      managementLevel: 'SURVEILLANCE',
      threatLevel: 'MEDIUM',
      citizenId: '001200000004',
      modusOperandi: null,
      addresses: [],
      vehicles: [],
      physicalMarks: [],
      criminalRecords: [],
      gangMemberships: [],
    };

    mocks.personFindMany.mockResolvedValue([normalWithRecord, suspectWithoutRecord]);

    // Filter by SUSPECTS_ONLY
    const reqSuspects = new Request('http://localhost/api/events/ev-1/candidate-suspects?managementFilter=SUSPECTS_ONLY');
    const resSuspects = await GET(reqSuspects, { params: Promise.resolve({ id: 'ev-1' }) });
    const bodySuspects = await resSuspects.json();

    expect(bodySuspects.candidates.length).toBe(1);
    expect(bodySuspects.candidates[0].person.id).toBe('person-suspect-clean');

    // Filter by historyOnly
    const reqHistory = new Request('http://localhost/api/events/ev-1/candidate-suspects?historyOnly=true&managementFilter=ALL');
    const resHistory = await GET(reqHistory, { params: Promise.resolve({ id: 'ev-1' }) });
    const bodyHistory = await resHistory.json();

    expect(bodyHistory.candidates.length).toBe(1);
    expect(bodyHistory.candidates[0].person.id).toBe('person-normal-record');
  });

  it('searches by vehicle plate and physical mark description', async () => {
    mocks.eventFindUnique.mockResolvedValue(mockEvent);

    const targetPerson = {
      id: 'person-vehicle-mark',
      name: 'Hoàng',
      surname: 'Nam',
      nickname: null,
      displayNameOverride: null,
      photo: null,
      managementLevel: 'SURVEILLANCE',
      threatLevel: 'LOW',
      citizenId: '001200000099',
      modusOperandi: null,
      addresses: [],
      vehicles: [
        { plateNumber: '30E-888.88', brandModel: 'SH 150i', color: 'Đen nhám' },
      ],
      physicalMarks: [
        { type: 'SCAR', location: 'Đuôi mắt trái', description: 'Vết sẹo lồi dài 2cm' },
      ],
      criminalRecords: [],
      gangMemberships: [],
    };

    mocks.personFindMany.mockResolvedValue([targetPerson]);

    // Search by vehicle plate
    const reqPlate = new Request('http://localhost/api/events/ev-1/candidate-suspects?q=888.88&managementFilter=ALL');
    const resPlate = await GET(reqPlate, { params: Promise.resolve({ id: 'ev-1' }) });
    const bodyPlate = await resPlate.json();
    expect(bodyPlate.candidates.length).toBe(1);

    // Search by physical mark
    const reqMark = new Request('http://localhost/api/events/ev-1/candidate-suspects?q=sẹo lồi&managementFilter=ALL');
    const resMark = await GET(reqMark, { params: Promise.resolve({ id: 'ev-1' }) });
    const bodyMark = await resMark.json();
    expect(bodyMark.candidates.length).toBe(1);
  });
});

