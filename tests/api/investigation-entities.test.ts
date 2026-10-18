import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  personFindUnique: vi.fn(),
  suspectVehicleFindMany: vi.fn(),
  suspectVehicleFindUnique: vi.fn(),
  suspectVehicleCreate: vi.fn(),
  suspectVehicleUpdate: vi.fn(),
  suspectBankAccountFindMany: vi.fn(),
  suspectBankAccountFindUnique: vi.fn(),
  suspectBankAccountCreate: vi.fn(),
  suspectBankAccountUpdate: vi.fn(),
  suspectBankAccountUpdateMany: vi.fn(),
  physicalMarkFindMany: vi.fn(),
  physicalMarkFindUnique: vi.fn(),
  physicalMarkCreate: vi.fn(),
  physicalMarkUpdate: vi.fn(),
  criminalRecordFindMany: vi.fn(),
  criminalRecordFindUnique: vi.fn(),
  criminalRecordCreate: vi.fn(),
  criminalRecordUpdate: vi.fn(),
  gangFindMany: vi.fn(),
  gangFindUnique: vi.fn(),
  gangCreate: vi.fn(),
  gangUpdate: vi.fn(),
  gangMembershipUpsert: vi.fn(),
  gangMembershipFindUnique: vi.fn(),
  gangMembershipDelete: vi.fn(),
  eventFindUnique: vi.fn(),
  personEventFindFirst: vi.fn(),
  personEventCreate: vi.fn(),
  personEventUpdate: vi.fn(),
}));

vi.mock('../../lib/prisma', () => ({
  prisma: {
    person: {
      findUnique: mocks.personFindUnique,
    },
    event: {
      findUnique: mocks.eventFindUnique,
    },
    personEvent: {
      findFirst: mocks.personEventFindFirst,
      create: mocks.personEventCreate,
      update: mocks.personEventUpdate,
    },
    suspectVehicle: {
      findMany: mocks.suspectVehicleFindMany,
      findUnique: mocks.suspectVehicleFindUnique,
      create: mocks.suspectVehicleCreate,
      update: mocks.suspectVehicleUpdate,
    },
    suspectBankAccount: {
      findMany: mocks.suspectBankAccountFindMany,
      findUnique: mocks.suspectBankAccountFindUnique,
      create: mocks.suspectBankAccountCreate,
      update: mocks.suspectBankAccountUpdate,
      updateMany: mocks.suspectBankAccountUpdateMany,
    },
    physicalMark: {
      findMany: mocks.physicalMarkFindMany,
      findUnique: mocks.physicalMarkFindUnique,
      create: mocks.physicalMarkCreate,
      update: mocks.physicalMarkUpdate,
    },
    criminalRecord: {
      findMany: mocks.criminalRecordFindMany,
      findUnique: mocks.criminalRecordFindUnique,
      create: mocks.criminalRecordCreate,
      update: mocks.criminalRecordUpdate,
    },
    gang: {
      findMany: mocks.gangFindMany,
      findUnique: mocks.gangFindUnique,
      create: mocks.gangCreate,
      update: mocks.gangUpdate,
    },
    gangMembership: {
      upsert: mocks.gangMembershipUpsert,
      findUnique: mocks.gangMembershipFindUnique,
      delete: mocks.gangMembershipDelete,
    },
  },
}));

vi.mock('../../lib/auth', () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: 'user-123', email: 'officer@example.com', name: 'Officer Test' },
    })
  ),
}));

// Import vehicle endpoints
import { GET as getVehicles, POST as createVehicle } from '../../app/api/people/[id]/vehicles/route';
import { PUT as updateVehicle, DELETE as deleteVehicle } from '../../app/api/people/[id]/vehicles/[vehicleId]/route';

// Import bank account endpoints
import { GET as getBankAccounts, POST as createBankAccount } from '../../app/api/people/[id]/bank-accounts/route';
import { PUT as updateBankAccount, DELETE as deleteBankAccount } from '../../app/api/people/[id]/bank-accounts/[accountId]/route';

// Import physical mark endpoints
import { GET as getMarks, POST as createMark } from '../../app/api/people/[id]/physical-marks/route';
import { PUT as updateMark, DELETE as deleteMark } from '../../app/api/people/[id]/physical-marks/[markId]/route';

// Import criminal record endpoints
import { GET as getRecords, POST as createRecord } from '../../app/api/people/[id]/criminal-records/route';
import { PUT as updateRecord, DELETE as deleteRecord } from '../../app/api/people/[id]/criminal-records/[recordId]/route';

// Import gang endpoints
import { GET as getGangs, POST as createGang } from '../../app/api/gangs/route';
import { GET as getGang, PUT as updateGang, DELETE as deleteGang } from '../../app/api/gangs/[id]/route';
import { POST as addGangMember } from '../../app/api/gangs/[id]/members/route';
import { DELETE as removeGangMember } from '../../app/api/gangs/[id]/members/[personId]/route';

// Import event people endpoints
import { POST as addEventPerson, PUT as updateEventPerson } from '../../app/api/events/[id]/people/route';

describe('Investigation Entities API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Vehicles API', () => {
    it('GET /api/people/[id]/vehicles returns vehicles', async () => {
      mocks.personFindUnique.mockResolvedValue({ id: 'person-1', userId: 'user-123' });
      mocks.suspectVehicleFindMany.mockResolvedValue([
        { id: 'v-1', plateNumber: '29A-12345', vehicleType: 'Motorcycle' },
      ]);

      const req = new Request('http://localhost/api/people/person-1/vehicles');
      const res = await getVehicles(req, { params: Promise.resolve({ id: 'person-1' }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.vehicles).toHaveLength(1);
      expect(body.vehicles[0].plateNumber).toBe('29A-12345');
    });

    it('POST /api/people/[id]/vehicles creates vehicle', async () => {
      mocks.personFindUnique.mockResolvedValue({ id: 'person-1', userId: 'user-123' });
      mocks.suspectVehicleCreate.mockImplementation(({ data }) => Promise.resolve({ id: 'v-1', ...data }));

      const req = new Request('http://localhost/api/people/person-1/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plateNumber: '29b1-999.99',
          vehicleType: 'Xe máy',
          brandModel: 'Honda Wave',
          color: 'Đỏ đen',
        }),
      });
      const res = await createVehicle(req, { params: Promise.resolve({ id: 'person-1' }) });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.vehicle.plateNumber).toBe('29B1-999.99');
    });

    it('PUT /api/people/[id]/vehicles/[vehicleId] updates vehicle', async () => {
      mocks.personFindUnique.mockResolvedValue({ id: 'person-1', userId: 'user-123' });
      mocks.suspectVehicleFindUnique.mockResolvedValue({ id: 'v-1', personId: 'person-1' });
      mocks.suspectVehicleUpdate.mockResolvedValue({ id: 'v-1', color: 'Xanh' });

      const req = new Request('http://localhost/api/people/person-1/vehicles/v-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: 'Xanh' }),
      });
      const res = await updateVehicle(req, { params: Promise.resolve({ id: 'person-1', vehicleId: 'v-1' }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.vehicle.color).toBe('Xanh');
    });

    it('DELETE /api/people/[id]/vehicles/[vehicleId] soft-deletes vehicle', async () => {
      mocks.personFindUnique.mockResolvedValue({ id: 'person-1', userId: 'user-123' });
      mocks.suspectVehicleFindUnique.mockResolvedValue({ id: 'v-1', personId: 'person-1' });
      mocks.suspectVehicleUpdate.mockResolvedValue({ id: 'v-1', deletedAt: new Date() });

      const req = new Request('http://localhost/api/people/person-1/vehicles/v-1', { method: 'DELETE' });
      const res = await deleteVehicle(req, { params: Promise.resolve({ id: 'person-1', vehicleId: 'v-1' }) });

      expect(res.status).toBe(200);
      expect(mocks.suspectVehicleUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'v-1' } })
      );
    });
  });

  describe('Bank Accounts API', () => {
    it('GET /api/people/[id]/bank-accounts returns bank accounts list', async () => {
      mocks.personFindUnique.mockResolvedValue({ id: 'person-1', userId: 'user-123' });
      mocks.suspectBankAccountFindMany.mockResolvedValue([
        {
          id: 'acc-1',
          personId: 'person-1',
          bankName: 'Techcombank',
          accountNumber: '19034567890123',
          accountHolder: 'NGUYEN VAN A',
          accountType: 'OWNER',
          isPrimary: true,
          notes: 'Tài khoản chính',
        },
      ]);

      const req = new Request('http://localhost/api/people/person-1/bank-accounts');
      const res = await getBankAccounts(req, { params: Promise.resolve({ id: 'person-1' }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.bankAccounts).toHaveLength(1);
      expect(body.bankAccounts[0].bankName).toBe('Techcombank');
      expect(body.bankAccounts[0].accountNumber).toBe('19034567890123');
    });

    it('POST /api/people/[id]/bank-accounts creates a bank account and unmarks previous primary if isPrimary=true', async () => {
      mocks.personFindUnique.mockResolvedValue({ id: 'person-1', userId: 'user-123' });
      mocks.suspectBankAccountUpdateMany.mockResolvedValue({ count: 1 });
      mocks.suspectBankAccountCreate.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'acc-2', ...data })
      );

      const req = new Request('http://localhost/api/people/person-1/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: 'MB Bank',
          accountNumber: '0987654321',
          accountHolder: 'LE THI B',
          accountType: 'MULE',
          isPrimary: true,
          notes: 'Tài khoản rác nhận tiền chuộc',
        }),
      });

      const res = await createBankAccount(req, { params: Promise.resolve({ id: 'person-1' }) });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(mocks.suspectBankAccountUpdateMany).toHaveBeenCalledWith({
        where: { personId: 'person-1', isPrimary: true },
        data: { isPrimary: false },
      });
      expect(body.bankAccount.bankName).toBe('MB Bank');
      expect(body.bankAccount.accountNumber).toBe('0987654321');
      expect(body.bankAccount.accountType).toBe('MULE');
      expect(body.bankAccount.isPrimary).toBe(true);
    });

    it('PUT /api/people/[id]/bank-accounts/[accountId] updates bank account', async () => {
      mocks.personFindUnique.mockResolvedValue({ id: 'person-1', userId: 'user-123' });
      mocks.suspectBankAccountFindUnique.mockResolvedValue({ id: 'acc-1', personId: 'person-1' });
      mocks.suspectBankAccountUpdate.mockResolvedValue({
        id: 'acc-1',
        bankName: 'Techcombank',
        accountNumber: '19034567890123',
        accountType: 'SUSPICIOUS',
        notes: 'Đã phát hiện dòng tiền bất minh',
      });

      const req = new Request('http://localhost/api/people/person-1/bank-accounts/acc-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType: 'SUSPICIOUS',
          notes: 'Đã phát hiện dòng tiền bất minh',
        }),
      });

      const res = await updateBankAccount(req, {
        params: Promise.resolve({ id: 'person-1', accountId: 'acc-1' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.bankAccount.accountType).toBe('SUSPICIOUS');
    });

    it('DELETE /api/people/[id]/bank-accounts/[accountId] soft-deletes bank account', async () => {
      mocks.personFindUnique.mockResolvedValue({ id: 'person-1', userId: 'user-123' });
      mocks.suspectBankAccountFindUnique.mockResolvedValue({ id: 'acc-1', personId: 'person-1' });
      mocks.suspectBankAccountUpdate.mockResolvedValue({ id: 'acc-1', deletedAt: new Date() });

      const req = new Request('http://localhost/api/people/person-1/bank-accounts/acc-1', {
        method: 'DELETE',
      });
      const res = await deleteBankAccount(req, {
        params: Promise.resolve({ id: 'person-1', accountId: 'acc-1' }),
      });

      expect(res.status).toBe(200);
      expect(mocks.suspectBankAccountUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'acc-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });
  });

  describe('Physical Marks API', () => {
    it('POST /api/people/[id]/physical-marks creates a mark', async () => {
      mocks.personFindUnique.mockResolvedValue({ id: 'person-1', userId: 'user-123' });
      mocks.physicalMarkCreate.mockImplementation(({ data }) => Promise.resolve({ id: 'm-1', ...data }));

      const req = new Request('http://localhost/api/people/person-1/physical-marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TATTOO',
          location: 'Bắp tay phải',
          description: 'Xăm hình rồng quấn kiếm',
        }),
      });
      const res = await createMark(req, { params: Promise.resolve({ id: 'person-1' }) });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.physicalMark.type).toBe('TATTOO');
      expect(body.physicalMark.location).toBe('Bắp tay phải');
    });

    it('DELETE /api/people/[id]/physical-marks/[markId] soft-deletes a mark', async () => {
      mocks.personFindUnique.mockResolvedValue({ id: 'person-1', userId: 'user-123' });
      mocks.physicalMarkFindUnique.mockResolvedValue({ id: 'm-1', personId: 'person-1' });
      mocks.physicalMarkUpdate.mockResolvedValue({ id: 'm-1', deletedAt: new Date() });

      const req = new Request('http://localhost/api/people/person-1/physical-marks/m-1', { method: 'DELETE' });
      const res = await deleteMark(req, { params: Promise.resolve({ id: 'person-1', markId: 'm-1' }) });

      expect(res.status).toBe(200);
      expect(mocks.physicalMarkUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'm-1' } })
      );
    });
  });

  describe('Criminal Records API', () => {
    it('POST /api/people/[id]/criminal-records creates record', async () => {
      mocks.personFindUnique.mockResolvedValue({ id: 'person-1', userId: 'user-123' });
      mocks.criminalRecordCreate.mockImplementation(({ data }) => Promise.resolve({ id: 'cr-1', ...data }));

      const req = new Request('http://localhost/api/people/person-1/criminal-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charge: 'Trộm cắp tài sản',
          recordType: 'CONVICTION',
          sentenceDetail: '18 tháng tù',
          adjudicatedBy: 'TAND Quận Hoàn Kiếm',
          isPardoned: false,
        }),
      });
      const res = await createRecord(req, { params: Promise.resolve({ id: 'person-1' }) });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.criminalRecord.charge).toBe('Trộm cắp tài sản');
      expect(body.criminalRecord.recordType).toBe('CONVICTION');
    });
  });

  describe('Gangs API', () => {
    it('POST /api/gangs creates a gang', async () => {
      mocks.gangCreate.mockImplementation(({ data }) => Promise.resolve({ id: 'gang-1', ...data }));

      const req = new Request('http://localhost/api/gangs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Băng nhóm chợ đêm',
          description: 'Chuyên trộm cắp và bảo kê khu chợ đêm',
          turf: 'Khu vực Chợ Đồng Xuân',
          color: '#FF0000',
        }),
      });
      const res = await createGang(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.gang.name).toBe('Băng nhóm chợ đêm');
    });

    it('POST /api/gangs/[id]/members adds a member to gang', async () => {
      mocks.gangFindUnique.mockResolvedValue({ id: 'gang-1', userId: 'user-123' });
      mocks.personFindUnique.mockResolvedValue({ id: 'person-1', userId: 'user-123' });
      mocks.gangMembershipUpsert.mockResolvedValue({ gangId: 'gang-1', personId: 'person-1', role: 'LEADER' });

      const req = new Request('http://localhost/api/gangs/gang-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: 'person-1',
          role: 'LEADER',
          notes: 'Cầm đầu phân chia địa bàn',
        }),
      });
      const res = await addGangMember(req, { params: Promise.resolve({ id: 'gang-1' }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.membership.role).toBe('LEADER');
    });

    it('DELETE /api/gangs/[id]/members/[personId] removes member from gang', async () => {
      mocks.gangFindUnique.mockResolvedValue({ id: 'gang-1', userId: 'user-123' });
      mocks.gangMembershipFindUnique.mockResolvedValue({ gangId: 'gang-1', personId: 'person-1' });
      mocks.gangMembershipDelete.mockResolvedValue({});

      const req = new Request('http://localhost/api/gangs/gang-1/members/person-1', { method: 'DELETE' });
      const res = await removeGangMember(req, { params: Promise.resolve({ id: 'gang-1', personId: 'person-1' }) });

      expect(res.status).toBe(200);
      expect(mocks.gangMembershipDelete).toHaveBeenCalled();
    });
  });

  describe('Case People Linkage (Án mờ & Căn cứ nghi vấn)', () => {
    it('POST /api/events/[id]/people links suspect with reasonForSuspicion and alibi', async () => {
      mocks.eventFindUnique.mockResolvedValue({ id: 'ev-1', userId: 'user-123', deletedAt: null });
      mocks.personFindUnique.mockResolvedValue({ id: 'person-1', userId: 'user-123', deletedAt: null });
      mocks.personEventFindFirst.mockResolvedValue(null);
      mocks.personEventCreate.mockImplementation(({ data }) => Promise.resolve({
        id: 'pe-1',
        ...data,
        person: { id: 'person-1', name: 'Nguyễn Văn A' },
        event: { id: 'ev-1', title: 'Vụ trộm tiệm vàng' },
      }));

      const req = new Request('http://localhost/api/events/ev-1/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: 'person-1',
          role: 'Cảnh giới',
          involvementType: 'SUSPECT',
          verificationStatus: 'INVESTIGATING',
          confidence: 'HIGH',
          reasonForSuspicion: 'Nhân dạng khớp camera an ninh và vắng mặt khỏi nơi cư trú sau vụ án',
          alibi: 'Khai ở nhà ngủ một mình, chưa có người làm chứng',
          notes: 'Cần trích xuất thêm camera ngã tư lúc 02h15',
        }),
      });

      const res = await addEventPerson(req, { params: Promise.resolve({ id: 'ev-1' }) });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.personEvent.involvementType).toBe('SUSPECT');
      expect(body.personEvent.reasonForSuspicion).toBe('Nhân dạng khớp camera an ninh và vắng mặt khỏi nơi cư trú sau vụ án');
      expect(body.personEvent.alibi).toBe('Khai ở nhà ngủ một mình, chưa có người làm chứng');
    });

    it('PUT /api/events/[id]/people updates reasonForSuspicion and alibi', async () => {
      mocks.eventFindUnique.mockResolvedValue({ id: 'ev-1', userId: 'user-123', deletedAt: null });
      mocks.personEventFindFirst.mockResolvedValue({ id: 'pe-1', eventId: 'ev-1', personId: 'person-1', deletedAt: null });
      mocks.personEventUpdate.mockImplementation(({ data }) => Promise.resolve({
        id: 'pe-1',
        ...data,
        person: { id: 'person-1', name: 'Nguyễn Văn A' },
      }));

      const req = new Request('http://localhost/api/events/ev-1/people', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId: 'person-1',
          verificationStatus: 'CONFIRMED',
          reasonForSuspicion: 'Đã tìm thấy tang vật tại nhà',
          alibi: 'Đã xác minh lời khai ngoại phạm là giả',
        }),
      });

      const res = await updateEventPerson(req, { params: Promise.resolve({ id: 'ev-1' }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.personEvent.verificationStatus).toBe('CONFIRMED');
      expect(body.personEvent.reasonForSuspicion).toBe('Đã tìm thấy tang vật tại nhà');
      expect(body.personEvent.alibi).toBe('Đã xác minh lời khai ngoại phạm là giả');
    });
  });
});

