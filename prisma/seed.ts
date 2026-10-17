// Load environment variables FIRST (before any other imports)
import { config } from 'dotenv';
config();

// Now import everything else
import * as bcrypt from 'bcryptjs';

async function main() {
  // Dynamically import prisma after env is loaded. The seed wipes and rebuilds
  // the database, so it uses the client that sees soft-deleted rows too.
  const { prismaIncludingDeleted: prisma } = await import('../lib/prisma');
  console.log('🌱 Bắt đầu khởi tạo dữ liệu mẫu điều tra vụ án & đối tượng (Investigation Demo)...');

  // Clear existing data in foreign-key-safe order
  await prisma.journalEntryEvent.deleteMany();
  await prisma.journalEntryPerson.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.personEvent.deleteMany();
  await prisma.eventRelationship.deleteMany();
  await prisma.eventGroup.deleteMany();
  await prisma.eventAddress.deleteMany();
  await prisma.eventUrl.deleteMany();
  await prisma.eventCustomField.deleteMany();
  await prisma.event.deleteMany();
  await prisma.personCustomFieldValue.deleteMany();
  await prisma.customFieldTemplate.deleteMany();
  await prisma.personAddress.deleteMany();
  await prisma.personPhone.deleteMany();
  await prisma.personEmail.deleteMany();
  await prisma.personUrl.deleteMany();
  await prisma.personIM.deleteMany();
  await prisma.personLocation.deleteMany();
  await prisma.personCustomField.deleteMany();
  await prisma.importantDate.deleteMany();
  await prisma.duplicateDismissal.deleteMany();
  await prisma.relationship.deleteMany();
  await prisma.relationshipType.deleteMany();
  await prisma.personGroup.deleteMany();
  await prisma.person.deleteMany();
  await prisma.group.deleteMany();

  // 1. Upsert Demo Investigator User (preserving user.id so active browser sessions stay valid)
  const hashedPassword = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { email: 'demo@nametag.one' },
    update: {
      password: hashedPassword,
      name: 'Minh',
      surname: 'Trần',
      nickname: 'Điều tra viên',
      language: 'vi-VN',
      nameOrder: 'EASTERN',
      dateFormat: 'DMY',
      emailVerified: true,
    },
    create: {
      email: 'demo@nametag.one',
      password: hashedPassword,
      name: 'Minh',
      surname: 'Trần',
      nickname: 'Điều tra viên',
      theme: 'DARK',
      language: 'vi-VN',
      nameOrder: 'EASTERN',
      dateFormat: 'DMY',
      emailVerified: true,
    },
  });

  // Seed investigation data for ALL existing users (including demo@nametag.one and any custom account)
  await prisma.user.updateMany({
    data: { nameOrder: 'EASTERN' },
  });
  const allUsers = await prisma.user.findMany();
  for (const user of allUsers) {
    console.log(`\n👤 Đang nạp dữ liệu điều tra mẫu cho tài khoản: ${user.email} (ID: ${user.id})...`);

  // 2. Create Investigation Relationship Types
  const bossType = await prisma.relationshipType.create({
    data: {
      userId: user.id,
      name: 'BOSS',
      label: 'Cầm đầu / Chỉ đạo',
      color: '#EF4444',
    },
  });

  const subordinateType = await prisma.relationshipType.create({
    data: {
      userId: user.id,
      name: 'SUBORDINATE',
      label: 'Đàn em / Chân rết',
      color: '#F97316',
      inverseId: bossType.id,
    },
  });

  await prisma.relationshipType.update({
    where: { id: bossType.id },
    data: { inverseId: subordinateType.id },
  });

  const accompliceType = await prisma.relationshipType.create({
    data: {
      userId: user.id,
      name: 'ACCOMPLICE',
      label: 'Đồng bọn / Chiến hữu',
      color: '#F59E0B',
    },
  });
  await prisma.relationshipType.update({
    where: { id: accompliceType.id },
    data: { inverseId: accompliceType.id },
  });

  const fenceType = await prisma.relationshipType.create({
    data: {
      userId: user.id,
      name: 'FENCE',
      label: 'Đầu mối tiêu thụ',
      color: '#8B5CF6',
    },
  });
  await prisma.relationshipType.update({
    where: { id: fenceType.id },
    data: { inverseId: fenceType.id },
  });

  const spouseType = await prisma.relationshipType.create({
    data: {
      userId: user.id,
      name: 'SPOUSE',
      label: 'Vợ / Chồng / Nhân tình',
      color: '#EC4899',
    },
  });
  await prisma.relationshipType.update({
    where: { id: spouseType.id },
    data: { inverseId: spouseType.id },
  });

  const siblingType = await prisma.relationshipType.create({
    data: {
      userId: user.id,
      name: 'SIBLING',
      label: 'Anh / Chị / Em ruột',
      color: '#6366F1',
    },
  });
  await prisma.relationshipType.update({
    where: { id: siblingType.id },
    data: { inverseId: siblingType.id },
  });

  const friendType = await prisma.relationshipType.create({
    data: {
      userId: user.id,
      name: 'FRIEND',
      label: 'Quan hệ xã hội',
      color: '#3B82F6',
    },
  });
  await prisma.relationshipType.update({
    where: { id: friendType.id },
    data: { inverseId: friendType.id },
  });

  const colleagueType = await prisma.relationshipType.create({
    data: {
      userId: user.id,
      name: 'COLLEAGUE',
      label: 'Làm ăn chung / Đồng nghiệp',
      color: '#10B981',
    },
  });
  await prisma.relationshipType.update({
    where: { id: colleagueType.id },
    data: { inverseId: colleagueType.id },
  });

  const informantType = await prisma.relationshipType.create({
    data: {
      userId: user.id,
      name: 'INFORMANT',
      label: 'Cơ sở / Nguồn tin',
      color: '#06B6D4',
    },
  });
  await prisma.relationshipType.update({
    where: { id: informantType.id },
    data: { inverseId: informantType.id },
  });

  console.log('✓ Đã tạo 9 loại mối quan hệ nghiệp vụ');

  // 3. Create Groups (Task Forces / Criminal Rings / Categories)
  const taskForceGroup = await prisma.group.create({
    data: {
      userId: user.id,
      name: 'Chuyên án VA-2026A (Trộm tiệm vàng & Kho hàng)',
      description: 'Các đối tượng và vụ án thuộc diện theo dõi đặc biệt của Chuyên án VA-2026A',
      color: '#EF4444',
    },
  });

  const longBienGangGroup = await prisma.group.create({
    data: {
      userId: user.id,
      name: 'Băng nhóm Hùng Sói (Long Biên)',
      description: 'Ổ nhóm chuyên đột nhập ban đêm, vô hiệu hóa hệ thống báo động tại Hà Nội',
      color: '#F59E0B',
    },
  });

  const fenceRingGroup = await prisma.group.create({
    data: {
      userId: user.id,
      name: 'Đường dây tiêu thụ tài sản gian',
      description: 'Các cơ sở cầm đồ, tiệm vàng, cửa hàng điện thoại nghi vấn tiêu thụ tang vật',
      color: '#8B5CF6',
    },
  });

  const witnessGroup = await prisma.group.create({
    data: {
      userId: user.id,
      name: 'Nhân chứng & Nguồn tin cơ sở',
      description: 'Nhân chứng hiện trường, bị hại và quần chúng cung cấp tin báo có giá trị',
      color: '#10B981',
    },
  });

  console.log('✓ Đã tạo 4 nhóm chuyên án & phân loại đối tượng');

  // 4. Create Custom Field Templates (for filtering on Dashboard / People list)
  const riskTemplate = await prisma.customFieldTemplate.create({
    data: {
      userId: user.id,
      name: 'Mức độ nguy hiểm',
      slug: 'muc-do-nguy-hiem',
      type: 'SELECT',
      options: ['Cao (Có vũ khí)', 'Trung bình', 'Thấp', 'Không nguy hiểm'],
      order: 0,
    },
  });

  const priorRecordTemplate = await prisma.customFieldTemplate.create({
    data: {
      userId: user.id,
      name: 'Có tiền án tiền sự',
      slug: 'co-tien-an-tien-su',
      type: 'BOOLEAN',
      options: [],
      order: 1,
    },
  });

  const vehiclePlateTemplate = await prisma.customFieldTemplate.create({
    data: {
      userId: user.id,
      name: 'Biển số phương tiện',
      slug: 'bien-so-phuong-tien',
      type: 'TEXT',
      options: [],
      order: 2,
    },
  });

  const idNumberTemplate = await prisma.customFieldTemplate.create({
    data: {
      userId: user.id,
      name: 'Số CCCD / Định danh',
      slug: 'so-cccd-dinh-danh',
      type: 'TEXT',
      options: [],
      order: 3,
    },
  });

  console.log('✓ Đã tạo 4 trường tùy chỉnh (Custom Fields) phục vụ bộ lọc điều tra');

  // 5. Create Subjects (People) — independent network (no "relationshipToUserId" required)
  // Coordinates are placed accurately around Hanoi (Hoàn Kiếm, Hai Bà Trưng, Đống Đa, Cầu Giấy, Long Biên)
  // so 500m / 1km / 2km / 5km proximity rings on the Map immediately highlight relevant subjects.

  // Subject 1: Nguyễn Văn Hùng ("Hùng Sói") - Ringleader
  const hungSoi = await prisma.person.create({
    data: {
      userId: user.id,
      surname: 'Nguyễn',
      middleName: 'Văn',
      name: 'Hùng',
      nickname: 'Hùng Sói',
      organization: 'Tự do (Băng nhóm Long Biên)',
      jobTitle: 'Đối tượng cầm đầu',
      lastContact: new Date('2026-03-10'),
      notes:
        'Đối tượng có 2 tiền án về tội Trộm cắp tài sản (2018, 2021). Đặc điểm nhận dạng: Sẹo dài 4cm ở lông mày phải, xăm hình sói ở bả vai trái. Thường xuyên di chuyển giữa Long Biên và khu phố cổ Hoàn Kiếm vào ban đêm.',
      groups: {
        create: [{ groupId: taskForceGroup.id }, { groupId: longBienGangGroup.id }],
      },
      phoneNumbers: {
        create: [
          { type: 'mobile', number: '0912 345 678' },
          { type: 'other', number: '0988 999 113' },
        ],
      },
      addresses: {
        create: [
          {
            type: 'other',
            streetLine1: 'Số 18 Ngõ Đào Duy Từ, Phường Hàng Buồm',
            locality: 'Quận Hoàn Kiếm',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0362,
            longitude: 105.8538,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
          {
            type: 'home',
            streetLine1: 'Số 142 Nguyễn Văn Cừ, Phường Bồ Đề',
            locality: 'Quận Long Biên',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0455,
            longitude: 105.8752,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
        ],
      },
      importantDates: {
        create: [{ title: 'Ngày sinh', type: 'birthday', date: new Date('1986-04-15') }],
      },
      customFieldValues: {
        create: [
          { templateId: riskTemplate.id, value: 'Cao (Có vũ khí)' },
          { templateId: priorRecordTemplate.id, value: 'true' },
          { templateId: vehiclePlateTemplate.id, value: '29A-868.92 (Honda SH Đen)' },
          { templateId: idNumberTemplate.id, value: '001086012491' },
        ],
      },
    },
  });

  // Subject 2: Lê Hoàng Hải ("Hải Cận") - Lock & Alarm Specialist
  const haiCan = await prisma.person.create({
    data: {
      userId: user.id,
      surname: 'Lê',
      middleName: 'Hoàng',
      name: 'Hải',
      nickname: 'Hải Cận',
      organization: 'Tiệm sửa khóa & Điện tử Hoàng Hải',
      jobTitle: 'Thợ khóa / Kỹ thuật điện tử',
      lastContact: new Date('2026-03-08'),
      notes:
        'Am hiểu sâu về hệ thống báo động hồng ngoại, camera giám sát và két sắt điện tử. Có quan hệ mật thiết với Hùng Sói từ thời chấp hành án tại Trại giam Số 3.',
      groups: {
        create: [{ groupId: taskForceGroup.id }, { groupId: longBienGangGroup.id }],
      },
      phoneNumbers: {
        create: [{ type: 'mobile', number: '0904 512 889' }],
      },
      addresses: {
        create: [
          {
            type: 'home',
            streetLine1: 'Số 45 Phố Phúc Tân, Phường Phúc Tân',
            locality: 'Quận Hoàn Kiếm',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0378,
            longitude: 105.8588,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
        ],
      },
      importantDates: {
        create: [{ title: 'Ngày sinh', type: 'birthday', date: new Date('1991-08-22') }],
      },
      customFieldValues: {
        create: [
          { templateId: riskTemplate.id, value: 'Trung bình' },
          { templateId: priorRecordTemplate.id, value: 'true' },
          { templateId: vehiclePlateTemplate.id, value: '29C1-445.12 (Yamaha Exciter)' },
          { templateId: idNumberTemplate.id, value: '001091008312' },
        ],
      },
    },
  });

  // Subject 3: Phạm Quốc Tuấn ("Tuấn Xế") - Getaway Driver & Lookout
  const tuanXe = await prisma.person.create({
    data: {
      userId: user.id,
      surname: 'Phạm',
      middleName: 'Quốc',
      name: 'Tuấn',
      nickname: 'Tuấn Xế',
      organization: 'Bãi xe tự phát Cầu Giấy',
      jobTitle: 'Lái xe tự do',
      lastContact: new Date('2026-03-11'),
      notes:
        'Chuyên điều khiển xe tải nhỏ và xe bán tải vận chuyển hàng ban đêm. Thường xuyên sử dụng biển số giả khi di chuyển qua các tuyến phố trung tâm.',
      groups: {
        create: [
          { groupId: taskForceGroup.id },
          { groupId: longBienGangGroup.id },
          { groupId: fenceRingGroup.id },
        ],
      },
      phoneNumbers: {
        create: [{ type: 'mobile', number: '0977 234 556' }],
      },
      addresses: {
        create: [
          {
            type: 'home',
            streetLine1: 'Số 28 Đường Trần Nhật Duật, Phường Đồng Xuân',
            locality: 'Quận Hoàn Kiếm',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0389,
            longitude: 105.8569,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
          {
            type: 'work',
            streetLine1: 'Ngõ 165 Cầu Giấy, Phường Dịch Vọng',
            locality: 'Quận Cầu Giấy',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0342,
            longitude: 105.7931,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
        ],
      },
      importantDates: {
        create: [{ title: 'Ngày sinh', type: 'birthday', date: new Date('1994-11-05') }],
      },
      customFieldValues: {
        create: [
          { templateId: riskTemplate.id, value: 'Trung bình' },
          { templateId: priorRecordTemplate.id, value: 'true' },
          { templateId: vehiclePlateTemplate.id, value: '29H-512.88 (Bán tải Ford Ranger Đen)' },
          { templateId: idNumberTemplate.id, value: '001094025109' },
        ],
      },
    },
  });

  // Subject 4: Đặng Thị Mai ("Mai Vàng") - Fence / Pawnshop Owner
  const maiVang = await prisma.person.create({
    data: {
      userId: user.id,
      surname: 'Đặng',
      middleName: 'Thị',
      name: 'Mai',
      nickname: 'Mai Vàng',
      organization: 'Tiệm cầm đồ & Thu mua vàng bạc Ánh Mai',
      jobTitle: 'Chủ cơ sở cầm đồ',
      lastContact: new Date('2026-03-09'),
      notes:
        'Chủ cơ sở cầm đồ Ánh Mai trên phố Huế. Có biểu hiện thu mua vàng nguyên liệu không rõ nguồn gốc và cho vay nặng lãi. Là nhân tình của Hùng Sói.',
      groups: {
        create: [{ groupId: taskForceGroup.id }, { groupId: fenceRingGroup.id }],
      },
      phoneNumbers: {
        create: [{ type: 'mobile', number: '0936 888 999' }],
      },
      addresses: {
        create: [
          {
            type: 'work',
            streetLine1: 'Số 215 Phố Huế, Phường Phố Huế',
            locality: 'Quận Hai Bà Trưng',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0165,
            longitude: 105.8515,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
        ],
      },
      importantDates: {
        create: [{ title: 'Ngày sinh', type: 'birthday', date: new Date('1989-02-14') }],
      },
      customFieldValues: {
        create: [
          { templateId: riskTemplate.id, value: 'Thấp' },
          { templateId: priorRecordTemplate.id, value: 'false' },
          { templateId: vehiclePlateTemplate.id, value: '30G-912.05 (Mercedes C200 Trắng)' },
          { templateId: idNumberTemplate.id, value: '001189004521' },
        ],
      },
    },
  });

  // Subject 5: Vũ Đình Khánh ("Khánh Chột") - Enforcer & Burglar
  const khanhChot = await prisma.person.create({
    data: {
      userId: user.id,
      surname: 'Vũ',
      middleName: 'Đình',
      name: 'Khánh',
      nickname: 'Khánh Chột',
      organization: 'CLB Bi-a Đêm Trắng Cầu Giấy',
      jobTitle: 'Quản lý quán bi-a',
      lastContact: new Date('2026-03-05'),
      notes:
        'Đối tượng cộm cán khu vực Cầu Giấy, có 1 tiền án Cướp giật tài sản và 1 tiền sự Cố ý gây thương tích. Thường tụ tập đàn em tại quán bi-a sau 23h đêm.',
      groups: {
        create: [{ groupId: taskForceGroup.id }, { groupId: longBienGangGroup.id }],
      },
      phoneNumbers: {
        create: [{ type: 'mobile', number: '0963 111 789' }],
      },
      addresses: {
        create: [
          {
            type: 'home',
            streetLine1: 'Số 82 Đường Quan Hoa, Phường Quan Hoa',
            locality: 'Quận Cầu Giấy',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0321,
            longitude: 105.8012,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
        ],
      },
      importantDates: {
        create: [{ title: 'Ngày sinh', type: 'birthday', date: new Date('1988-07-19') }],
      },
      customFieldValues: {
        create: [
          { templateId: riskTemplate.id, value: 'Cao (Có vũ khí)' },
          { templateId: priorRecordTemplate.id, value: 'true' },
          { templateId: vehiclePlateTemplate.id, value: '29B1-778.33 (Honda Winner Đỏ Đen)' },
          { templateId: idNumberTemplate.id, value: '001088019302' },
        ],
      },
    },
  });

  // Subject 6: Trần Minh Đức ("Đức Đen") - Electronics Fence
  const ducDen = await prisma.person.create({
    data: {
      userId: user.id,
      surname: 'Trần',
      middleName: 'Minh',
      name: 'Đức',
      nickname: 'Đức Đen',
      organization: 'Cửa hàng Điện thoại & Laptop Đức Minh',
      jobTitle: 'Chủ cửa hàng thiết bị điện tử',
      lastContact: new Date('2026-03-01'),
      notes:
        'Chuyên thu mua linh kiện điện tử, điện thoại, máy tính xách tay số lượng lớn không hóa đơn chứng từ, rã xác linh kiện để tiêu thụ đi các tỉnh.',
      groups: {
        create: [{ groupId: fenceRingGroup.id }],
      },
      phoneNumbers: {
        create: [{ type: 'mobile', number: '0945 678 123' }],
      },
      addresses: {
        create: [
          {
            type: 'work',
            streetLine1: 'Số 119 Phố Chùa Bộc, Phường Quang Trung',
            locality: 'Quận Đống Đa',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0082,
            longitude: 105.8268,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
        ],
      },
      customFieldValues: {
        create: [
          { templateId: riskTemplate.id, value: 'Thấp' },
          { templateId: priorRecordTemplate.id, value: 'false' },
          { templateId: vehiclePlateTemplate.id, value: '30F-332.19 (Kia Cerato Bạc)' },
          { templateId: idNumberTemplate.id, value: '001090031120' },
        ],
      },
    },
  });

  // Subject 7: Hoàng Văn Nam ("Nam Béo") - Initial suspect, later RULED OUT due to hospital alibi
  const namBeo = await prisma.person.create({
    data: {
      userId: user.id,
      surname: 'Hoàng',
      middleName: 'Văn',
      name: 'Nam',
      nickname: 'Nam Béo',
      organization: 'Tự do',
      jobTitle: 'Lao động tự do',
      lastContact: new Date('2026-02-28'),
      notes:
        'Từng là đàn em cũ của Hùng Sói năm 2021. Đã xác minh có bằng chứng ngoại phạm rõ ràng trong đêm xảy ra vụ trộm tiệm vàng Kim Bảo (đang điều trị nội trú phẫu thuật ruột thừa tại BV Đức Giang).',
      groups: {
        create: [{ groupId: longBienGangGroup.id }],
      },
      phoneNumbers: {
        create: [{ type: 'mobile', number: '0918 222 334' }],
      },
      addresses: {
        create: [
          {
            type: 'home',
            streetLine1: 'Số 562 Nguyễn Văn Cừ, Phường Gia Thụy',
            locality: 'Quận Long Biên',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0488,
            longitude: 105.8865,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
        ],
      },
      customFieldValues: {
        create: [
          { templateId: riskTemplate.id, value: 'Thấp' },
          { templateId: priorRecordTemplate.id, value: 'true' },
          { templateId: idNumberTemplate.id, value: '001087044218' },
        ],
      },
    },
  });

  // Subject 8: Bùi Thanh Thảo ("Thảo Ngân") - Jewelry Store Cashier (Person of Interest / Insider)
  const thaoNgan = await prisma.person.create({
    data: {
      userId: user.id,
      surname: 'Bùi',
      middleName: 'Thanh',
      name: 'Thảo',
      nickname: 'Thảo Ngân',
      organization: 'Tiệm vàng Kim Bảo (Hàng Bạc)',
      jobTitle: 'Nhân viên thu ngân & Quản lý kho quỹ',
      lastContact: new Date('2026-03-12'),
      notes:
        'Nhân viên nắm mật mã bảo trì hệ thống báo động tại Tiệm vàng Kim Bảo. Qua trích xuất sao kê phát hiện có khoản nợ tín dụng đen tại tiệm cầm đồ Ánh Mai của Đặng Thị Mai.',
      groups: {
        create: [{ groupId: taskForceGroup.id }, { groupId: witnessGroup.id }],
      },
      phoneNumbers: {
        create: [{ type: 'mobile', number: '0982 765 432' }],
      },
      addresses: {
        create: [
          {
            type: 'home',
            streetLine1: 'Số 32 Phố Hàng Đào, Phường Hàng Đào',
            locality: 'Quận Hoàn Kiếm',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0332,
            longitude: 105.8508,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
        ],
      },
      customFieldValues: {
        create: [
          { templateId: riskTemplate.id, value: 'Không nguy hiểm' },
          { templateId: priorRecordTemplate.id, value: 'false' },
          { templateId: idNumberTemplate.id, value: '001197015682' },
        ],
      },
    },
  });

  // Subject 9: Đỗ Văn Bình ("Bình Xe Ôm") - Key Eyewitness & Informant
  const binhXeOm = await prisma.person.create({
    data: {
      userId: user.id,
      surname: 'Đỗ',
      middleName: 'Văn',
      name: 'Bình',
      nickname: 'Bình Xe Ôm',
      organization: 'Tổ tự quản an ninh trật tự Hoàn Kiếm',
      jobTitle: 'Tài xế xe công nghệ ca đêm',
      lastContact: new Date('2026-03-12'),
      notes:
        'Nguồn tin cơ sở uy tín tại khu vực phố cổ. Đã cung cấp hình ảnh camera hành trình ghi lại chiếc xe bán tải Ford Ranger màu đen đỗ gần ngã tư Hàng Bạc - Đinh Liệt lúc 02h15 sáng.',
      groups: {
        create: [{ groupId: witnessGroup.id }],
      },
      phoneNumbers: {
        create: [{ type: 'mobile', number: '0903 112 233' }],
      },
      addresses: {
        create: [
          {
            type: 'home',
            streetLine1: 'Số 78 Phố Hàng Gai, Phường Hàng Gai',
            locality: 'Quận Hoàn Kiếm',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0325,
            longitude: 105.8498,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
        ],
      },
      customFieldValues: {
        create: [
          { templateId: riskTemplate.id, value: 'Không nguy hiểm' },
          { templateId: priorRecordTemplate.id, value: 'false' },
          { templateId: vehiclePlateTemplate.id, value: '29E2-119.04 (Honda Wave Xanh)' },
        ],
      },
    },
  });

  // Subject 10: Ngô Thế Vinh ("Vinh Bạc") - Fugitive / Unlocated Subject (for testing Unlocated Roster on Map)
  const vinhBac = await prisma.person.create({
    data: {
      userId: user.id,
      surname: 'Ngô',
      middleName: 'Thế',
      name: 'Vinh',
      nickname: 'Vinh Bạc',
      organization: 'Tự do (Lang thang không nơi ở cố định)',
      jobTitle: 'Đối tượng cung cấp thiết bị phá khóa',
      lastContact: new Date('2026-03-02'),
      notes:
        'Đối tượng chuyên nhập lậu bộ dò mã két sắt điện tử và thiết bị phá sóng báo động. Hiện đã rời khỏi nơi trọ cũ, chưa xác định được tọa độ nơi ẩn náu hiện tại.',
      groups: {
        create: [{ groupId: taskForceGroup.id }, { groupId: longBienGangGroup.id }],
      },
      phoneNumbers: {
        create: [{ type: 'mobile', number: '0919 404 000' }],
      },
      customFieldValues: {
        create: [
          { templateId: riskTemplate.id, value: 'Cao (Có vũ khí)' },
          { templateId: priorRecordTemplate.id, value: 'true' },
          { templateId: idNumberTemplate.id, value: '001085099881' },
        ],
      },
    },
  });

  console.log('✓ Đã tạo 10 hồ sơ đối tượng (9 đã có tọa độ GPS, 1 đang truy tìm chưa rõ tọa độ)');

  // 6. Create Relationships between Subjects (Interconnected Network)
  await prisma.relationship.createMany({
    data: [
      // Hải Cận <-> Vinh Bạc (Cung cấp thiết bị phá khóa)
      {
        personId: haiCan.id,
        relatedPersonId: vinhBac.id,
        relationshipTypeId: accompliceType.id,
        notes: 'Mua bộ dò mã két sắt chuyên dụng từ Vinh Bạc trước vụ trộm Hàng Bạc',
      },
      {
        personId: vinhBac.id,
        relatedPersonId: haiCan.id,
        relationshipTypeId: accompliceType.id,
        notes: 'Cung cấp thiết bị phá khóa và dò mã báo động cho Hải Cận',
      },
      // Hùng Sói <-> Hải Cận (Cầm đầu <-> Đàn em)
      {
        personId: hungSoi.id,
        relatedPersonId: haiCan.id,
        relationshipTypeId: bossType.id,
        notes: 'Chỉ đạo trực tiếp Hải Cận vô hiệu hóa báo động và phá khóa két sắt',
      },
      {
        personId: haiCan.id,
        relatedPersonId: hungSoi.id,
        relationshipTypeId: subordinateType.id,
        notes: 'Đàn em thân tín phụ trách kỹ thuật mở khóa cho Hùng Sói',
      },

      // Hùng Sói <-> Tuấn Xế (Cầm đầu <-> Đàn em)
      {
        personId: hungSoi.id,
        relatedPersonId: tuanXe.id,
        relationshipTypeId: bossType.id,
        notes: 'Thuê Tuấn Xế làm tài xế cảnh giới và chở tang vật tẩu thoát',
      },
      {
        personId: tuanXe.id,
        relatedPersonId: hungSoi.id,
        relationshipTypeId: subordinateType.id,
        notes: 'Chuyên lái xe phục vụ các phi vụ của Hùng Sói',
      },

      // Hùng Sói <-> Khánh Chột (Đồng bọn / Chiến hữu)
      {
        personId: hungSoi.id,
        relatedPersonId: khanhChot.id,
        relationshipTypeId: accompliceType.id,
        notes: 'Bạn tù cũ, phối hợp thực hiện các vụ đột nhập kho hàng khu vực phía Tây Hà Nội',
      },
      {
        personId: khanhChot.id,
        relatedPersonId: hungSoi.id,
        relationshipTypeId: accompliceType.id,
        notes: 'Bạn tù cũ, phối hợp thực hiện các vụ đột nhập kho hàng',
      },

      // Hùng Sói <-> Mai Vàng (Nhân tình & Tiêu thụ)
      {
        personId: hungSoi.id,
        relatedPersonId: maiVang.id,
        relationshipTypeId: spouseType.id,
        notes: 'Quan hệ tình cảm, thường xuyên chuyển vàng trang sức cho Mai Vàng nấu chảy',
      },
      {
        personId: maiVang.id,
        relatedPersonId: hungSoi.id,
        relationshipTypeId: spouseType.id,
        notes: 'Nhân tình và là đầu mối tiêu thụ vàng bạc cho Hùng Sói',
      },

      // Hải Cận <-> Tuấn Xế (Đồng bọn)
      {
        personId: haiCan.id,
        relatedPersonId: tuanXe.id,
        relationshipTypeId: accompliceType.id,
        notes: 'Cùng tham gia khảo sát địa bàn trước khi gây án',
      },
      {
        personId: tuanXe.id,
        relatedPersonId: haiCan.id,
        relationshipTypeId: accompliceType.id,
        notes: 'Cùng tham gia khảo sát địa bàn trước khi gây án',
      },

      // Tuấn Xế <-> Đức Đen (Đầu mối tiêu thụ)
      {
        personId: tuanXe.id,
        relatedPersonId: ducDen.id,
        relationshipTypeId: fenceType.id,
        notes: 'Trực tiếp chở lô hàng điện tử trộm cắp đến kho sau cửa hàng của Đức Đen',
      },
      {
        personId: ducDen.id,
        relatedPersonId: tuanXe.id,
        relationshipTypeId: fenceType.id,
        notes: 'Thu mua lô linh kiện và điện thoại do Tuấn Xế giao ban đêm',
      },

      // Mai Vàng <-> Đức Đen (Làm ăn chung)
      {
        personId: maiVang.id,
        relatedPersonId: ducDen.id,
        relationshipTypeId: colleagueType.id,
        notes: 'Thường xuyên giới thiệu nguồn hàng cầm cố quá hạn và đồ trộm cắp cho nhau',
      },
      {
        personId: ducDen.id,
        relatedPersonId: maiVang.id,
        relationshipTypeId: colleagueType.id,
        notes: 'Đối tác tiêu thụ tài sản cầm cố và hàng trộm cắp',
      },

      // Mai Vàng <-> Thảo Ngân (Chủ nợ - Con nợ)
      {
        personId: maiVang.id,
        relatedPersonId: thaoNgan.id,
        relationshipTypeId: friendType.id,
        notes: 'Cho Thảo Ngân vay lãi nặng 350 triệu đồng, nghi vấn ép cung cấp sơ đồ camera tiệm vàng',
      },
      {
        personId: thaoNgan.id,
        relatedPersonId: maiVang.id,
        relationshipTypeId: friendType.id,
        notes: 'Vay nợ tại tiệm cầm đồ Ánh Mai của Đặng Thị Mai',
      },

      // Hùng Sói <-> Nam Béo (Quan hệ xã hội cũ)
      {
        personId: hungSoi.id,
        relatedPersonId: namBeo.id,
        relationshipTypeId: friendType.id,
        notes: 'Đàn em cũ nhưng đã tách nhóm từ cuối năm 2024',
      },
      {
        personId: namBeo.id,
        relatedPersonId: hungSoi.id,
        relationshipTypeId: friendType.id,
        notes: 'Từng đi theo Hùng Sói trước năm 2024',
      },

      // Bình Xe Ôm <-> Tuấn Xế (Nguồn tin phát hiện)
      {
        personId: binhXeOm.id,
        relatedPersonId: tuanXe.id,
        relationshipTypeId: informantType.id,
        notes: 'Nhận diện được Tuấn Xế điều khiển xe bán tải Ford Ranger đen tại hiện trường Hàng Bạc',
      },
      {
        personId: tuanXe.id,
        relatedPersonId: binhXeOm.id,
        relationshipTypeId: informantType.id,
        notes: 'Bị ông Bình ghi hình camera hành trình lúc 02h15 sáng',
      },
    ],
  });

  console.log('✓ Đã thiết lập mạng lưới quan hệ giữa các đối tượng');

  // 7. Create Cases (Events) with Crime Scene GPS Coordinates
  // Case 1: Active Investigation - Jewelry Store Burglary in Hoàn Kiếm
  const caseKimBao = await prisma.event.create({
    data: {
      userId: user.id,
      title: 'Vụ án #2026-01: Đột nhập Tiệm vàng Kim Bảo - Phố Hàng Bạc',
      category: 'Tội phạm có tổ chức',
      status: 'ONGOING',
      startDate: new Date('2026-03-05T02:10:00.000Z'),
      hasTime: true,
      description:
        '### Tóm tắt nội dung vụ án\nRạng sáng ngày 05/03/2026 (khoảng 02h10 - 02h45), kẻ gian đột nhập từ tum tầng 3 xuống Tiệm vàng Kim Bảo (Số 68 Hàng Bạc, Hoàn Kiếm). Đối tượng đã **ngắt chính xác nguồn dự phòng của hệ thống báo động hồng ngoại** và dùng thiết bị chuyên dụng mở khóa 02 két sắt chứa khoảng **85 lượng vàng SJC và trang sức** (ước tính thiệt hại 7,2 tỷ VNĐ).\n\n### Dấu vết & Phương thức thủ đoạn (MO)\n- Không có dấu hiệu cạy phá cửa chính; hệ thống báo động bị vô hiệu hóa bằng mã kỹ thuật nội bộ.\n- Camera nhà dân đối diện ghi nhận 02 đối tượng mặc áo mưa tối màu rời hiện trường lên xe bán tải **Ford Ranger màu đen** đỗ tại ngã tư Hàng Bạc - Đinh Liệt.',
      groups: {
        create: [{ groupId: taskForceGroup.id }, { groupId: longBienGangGroup.id }],
      },
      addresses: {
        create: [
          {
            type: 'work',
            streetLine1: 'Số 68 Phố Hàng Bạc, Phường Hàng Bạc',
            locality: 'Quận Hoàn Kiếm',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0341,
            longitude: 105.8525,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
        ],
      },
      customFields: {
        create: [
          { key: 'Thiệt hại ước tính', value: '7.200.000.000 VNĐ (85 lượng vàng)' },
          { key: 'Đơn vị thụ lý', value: 'Đội Cảnh sát Hình sự - PC02' },
        ],
      },
    },
  });

  // Case 2: Active Investigation - Electronics Warehouse Burglary in Cầu Giấy
  const caseCauGiay = await prisma.event.create({
    data: {
      userId: user.id,
      title: 'Vụ án #2026-02: Trộm kho linh kiện điện tử công nghệ cao Cầu Giấy',
      category: 'Hình sự / Trật tự xã hội',
      status: 'ONGOING',
      startDate: new Date('2026-02-19T01:30:00.000Z'),
      hasTime: true,
      description:
        '### Tóm tắt nội dung vụ án\nRạng sáng 19/02/2026, kho hàng của Công ty TNHH Thiết bị Số Hà Thành (Phố Duy Tân, Cầu Giấy) bị cắt khóa cửa cuốn và vô hiệu hóa đầu ghi camera. Nhóm đối tượng bốc dỡ **120 máy tính xách tay và 200 điện thoại iPhone nguyên hộp** (trị giá khoảng 6,5 tỷ VNĐ) lên xe bán tải tối màu.\n\n### Nhận định điều tra\n- Thủ đoạn cắt nguồn dự phòng bộ báo động trùng khớp 100% với **Vụ án #2026-01 (Tiệm vàng Kim Bảo)**.\n- Phát hiện một số IMEI máy bị đánh cắp bắt đầu được kích hoạt lẻ tẻ qua đường dây thu mua của **Trần Minh Đức (Đức Đen)** tại Đống Đa.',
      groups: {
        create: [{ groupId: taskForceGroup.id }, { groupId: fenceRingGroup.id }],
      },
      addresses: {
        create: [
          {
            type: 'work',
            streetLine1: 'Số 36 Phố Duy Tân, Phường Dịch Vọng Hậu',
            locality: 'Quận Cầu Giấy',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0312,
            longitude: 105.7845,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
        ],
      },
      customFields: {
        create: [
          { key: 'Thiệt hại ước tính', value: '6.500.000.000 VNĐ' },
          { key: 'Phương thức thủ đoạn', value: 'Vô hiệu hóa báo động + Xe bán tải chở hàng đêm' },
        ],
      },
    },
  });

  // Case 3: Newly Reported / Pending Verification - Stolen Assets & Pawnshop Money Laundering
  const caseTieuThu = await prisma.event.create({
    data: {
      userId: user.id,
      title: 'Vụ án #2026-03: Đường dây tiêu thụ tài sản gian & Tín dụng đen Phố Huế',
      category: 'Kinh tế / Lừa đảo',
      status: 'PLANNED',
      startDate: new Date('2026-03-08T09:00:00.000Z'),
      hasTime: false,
      description:
        '### Nguồn tin trinh sát\nQua công tác trinh sát địa bàn, phát hiện cơ sở cầm đồ **Ánh Mai (215 Phố Huế)** do **Đặng Thị Mai** làm chủ thường xuyên nấu chảy vàng trang sức vào ban đêm và giao dịch tiền mặt số lượng lớn với nhóm đối tượng hình sự ở Long Biên và Đống Đa.\n\n### Nhiệm vụ tiếp theo\n- Xác minh mối liên hệ tài chính giữa Đặng Thị Mai và thu ngân Bùi Thanh Thảo trước thời điểm xảy ra vụ đột nhập Tiệm vàng Kim Bảo.',
      groups: {
        create: [{ groupId: taskForceGroup.id }, { groupId: fenceRingGroup.id }],
      },
      addresses: {
        create: [
          {
            type: 'work',
            streetLine1: 'Số 215 Phố Huế, Phường Phố Huế',
            locality: 'Quận Hai Bà Trưng',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0165,
            longitude: 105.8515,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
        ],
      },
    },
  });

  // Case 4: Solved / Closed Case - Long Biên Safe Burglary (Historical reference)
  const caseLongBienClosed = await prisma.event.create({
    data: {
      userId: user.id,
      title: 'Vụ án #2025-11: Cạy két sắt Văn phòng Vận tải Long Biên (Đã kết luận)',
      category: 'Hình sự / Trật tự xã hội',
      status: 'COMPLETED',
      startDate: new Date('2025-11-12T03:00:00.000Z'),
      endDate: new Date('2025-12-20T17:00:00.000Z'),
      hasTime: true,
      description:
        'Vụ án trộm cắp két sắt tại Văn phòng Công ty Vận tải Bắc Hà (Long Biên) tháng 11/2025. Đã thu hồi một phần tang vật, phương thức mở khóa két sắt điện tử tương tự các vụ án đầu năm 2026.',
      groups: {
        create: [{ groupId: longBienGangGroup.id }],
      },
      addresses: {
        create: [
          {
            type: 'work',
            streetLine1: 'Số 410 Nguyễn Văn Cừ, Phường Ngọc Lâm',
            locality: 'Quận Long Biên',
            region: 'Hà Nội',
            country: 'Việt Nam',
            latitude: 21.0468,
            longitude: 105.8795,
            geocodeStatus: 'success',
            geocodedAt: new Date(),
          },
        ],
      },
    },
  });

  console.log('✓ Đã tạo 4 hồ sơ Vụ án (2 Đang điều tra, 1 Mới tiếp nhận, 1 Đã kết luận)');

  // 8. Link Related Cases (EventRelationship)
  await prisma.eventRelationship.createMany({
    data: [
      {
        fromEventId: caseKimBao.id,
        toEventId: caseCauGiay.id,
        relationshipType: 'Cùng phương thức thủ đoạn (MO)',
        notes: 'Cả 2 vụ đều ngắt nguồn dự phòng báo động hồng ngoại và dùng xe bán tải Ford Ranger đen tẩu thoát lúc 02h sáng.',
      },
      {
        fromEventId: caseCauGiay.id,
        toEventId: caseKimBao.id,
        relationshipType: 'Cùng phương thức thủ đoạn (MO)',
        notes: 'Cả 2 vụ đều ngắt nguồn dự phòng báo động hồng ngoại và dùng xe bán tải Ford Ranger đen tẩu thoát lúc 02h sáng.',
      },
      {
        fromEventId: caseKimBao.id,
        toEventId: caseTieuThu.id,
        relationshipType: 'Đường dây tiêu thụ tang vật',
        notes: 'Số vàng SJC và nữ trang bị lấy cắp tại Tiệm vàng Kim Bảo nghi vấn được tuồn về Tiệm cầm đồ Ánh Mai để nấu chảy.',
      },
      {
        fromEventId: caseTieuThu.id,
        toEventId: caseKimBao.id,
        relationshipType: 'Đường dây tiêu thụ tang vật',
        notes: 'Nơi tiêu thụ tang vật của vụ trộm Tiệm vàng Kim Bảo.',
      },
    ],
  });

  // 9. Create Investigative Hypotheses & Subject Links (PersonEvent)
  // Note: Hùng Sói, Hải Cận, Tuấn Xế, and Mai Vàng are linked to >= 2 active cases
  // so the Cross-Case Suspect Analysis panel immediately highlights them!
  await prisma.personEvent.createMany({
    data: [
      // === CASE 1: Tiệm vàng Kim Bảo (ONGOING) ===
      {
        eventId: caseKimBao.id,
        personId: vinhBac.id,
        involvementType: 'ACCOMPLICE',
        verificationStatus: 'HYPOTHESIS',
        confidence: 'MEDIUM',
        role: 'Nghi vấn cung cấp thiết bị dò mã két sắt (Đang truy tìm tọa độ)',
        notes:
          'Nguồn tin trinh sát báo Vinh Bạc vừa giao một bộ dò mã két sắt nhập lậu cho Hải Cận 3 ngày trước vụ án. Hiện đối tượng đã bỏ trốn khỏi nơi trọ cũ, chưa xác định được tọa độ GPS.',
      },
      {
        eventId: caseKimBao.id,
        personId: hungSoi.id,
        involvementType: 'SUSPECT',
        verificationStatus: 'CONFIRMED',
        confidence: 'HIGH',
        role: 'Chủ mưu & Trực tiếp đột nhập',
        notes:
          'Dấu giày tại tum tầng 3 và dữ liệu trạm BTS điện thoại di động khẳng định Hùng Sói có mặt tại số 68 Hàng Bạc từ 01h55 đến 02h45 ngày 05/03/2026.',
      },
      {
        eventId: caseKimBao.id,
        personId: haiCan.id,
        involvementType: 'SUSPECT',
        verificationStatus: 'INVESTIGATING',
        confidence: 'HIGH',
        role: 'Kỹ thuật vô hiệu hóa báo động & mở két',
        notes:
          'Thủ đoạn mở khóa 2 két sắt điện tử không để lại vết cạy phá trùng khớp với kỹ năng chuyên môn của Hải Cận. Đang trưng cầu giám định dấu vân tay trên hộp kỹ thuật.',
      },
      {
        eventId: caseKimBao.id,
        personId: tuanXe.id,
        involvementType: 'ACCOMPLICE',
        verificationStatus: 'CONFIRMED',
        confidence: 'HIGH',
        role: 'Tài xế cảnh giới & Tẩu thoát',
        notes:
          'Camera hành trình của nhân chứng Đỗ Văn Bình ghi rõ chiếc Ford Ranger đen của Tuấn Xế đỗ chờ tại ngã tư Hàng Bạc - Đinh Liệt lúc 02h15.',
      },
      {
        eventId: caseKimBao.id,
        personId: maiVang.id,
        involvementType: 'ACCOMPLICE',
        verificationStatus: 'INVESTIGATING',
        confidence: 'MEDIUM',
        role: 'Tiêu thụ vàng trộm cắp & Môi giới nội gián',
        notes:
          'Sáng 05/03/2026 (chỉ 4 tiếng sau vụ án), Hùng Sói đã di chuyển thẳng về cơ sở cầm đồ của Mai Vàng tại 215 Phố Huế.',
      },
      {
        eventId: caseKimBao.id,
        personId: thaoNgan.id,
        involvementType: 'PERSON_OF_INTEREST',
        verificationStatus: 'HYPOTHESIS',
        confidence: 'MEDIUM',
        role: 'Nghi vấn nội gián cung cấp mã báo động',
        notes:
          'Giả thuyết: Thảo Ngân bị Mai Vàng ép cung cấp mã bảo trì báo động và lịch trực bảo vệ để trừ khoản nợ lãi cao 350 triệu đồng.',
      },
      {
        eventId: caseKimBao.id,
        personId: binhXeOm.id,
        involvementType: 'WITNESS',
        verificationStatus: 'CONFIRMED',
        confidence: 'HIGH',
        role: 'Nhân chứng hiện trường & Cung cấp camera hành trình',
        notes:
          'Đã giao nộp thẻ nhớ camera hành trình ghi lại cảnh 2 đối tượng xách túi đen lên xe bán tải lúc 02h42 sáng.',
      },
      {
        eventId: caseKimBao.id,
        personId: namBeo.id,
        involvementType: 'SUSPECT',
        verificationStatus: 'RULED_OUT',
        confidence: 'HIGH',
        role: 'Nghi vấn ban đầu (Đã loại trừ)',
        notes:
          'ĐÃ LOẠI TRỪ: Xác minh bệnh án và camera Bệnh viện Đa khoa Đức Giang xác nhận Nam Béo đang nằm viện sau ca mổ ruột thừa từ 03/03 đến 07/03/2026.',
      },

      // === CASE 2: Kho linh kiện điện tử Cầu Giấy (ONGOING) ===
      {
        eventId: caseCauGiay.id,
        personId: hungSoi.id,
        involvementType: 'SUSPECT',
        verificationStatus: 'INVESTIGATING',
        confidence: 'HIGH',
        role: 'Chỉ đạo vụ đột nhập',
        notes:
          'Số điện thoại phụ 0988 999 113 của Hùng Sói phát sóng tại trạm BTS Phố Duy Tân (Cầu Giấy) cùng khung giờ xảy ra vụ trộm kho hàng.',
      },
      {
        eventId: caseCauGiay.id,
        personId: khanhChot.id,
        involvementType: 'SUSPECT',
        verificationStatus: 'CONFIRMED',
        confidence: 'HIGH',
        role: 'Trực tiếp cắt khóa kho hàng & Bốc xếp',
        notes:
          'Hình ảnh camera ngõ 165 Cầu Giấy nhận diện rõ vết sẹo và dáng đi của Khánh Chột khi điều phối bốc hàng lên xe bán tải.',
      },
      {
        eventId: caseCauGiay.id,
        personId: haiCan.id,
        involvementType: 'ACCOMPLICE',
        verificationStatus: 'HYPOTHESIS',
        confidence: 'MEDIUM',
        role: 'Vô hiệu hóa đầu ghi camera',
        notes:
          'Giả thuyết: Hải Cận đi cùng nhóm để ngắt hệ thống cảnh báo qua mạng của kho hàng trước khi Khánh Chột cắt cửa cuốn.',
      },
      {
        eventId: caseCauGiay.id,
        personId: tuanXe.id,
        involvementType: 'ACCOMPLICE',
        verificationStatus: 'CONFIRMED',
        confidence: 'HIGH',
        role: 'Vận chuyển lô hàng điện tử trộm cắp',
        notes:
          'Xe bán tải Ford Ranger của Tuấn Xế được camera giao thông ghi nhận di chuyển từ Duy Tân về phố Chùa Bộc lúc 03h10 sáng 19/02/2026.',
      },
      {
        eventId: caseCauGiay.id,
        personId: ducDen.id,
        involvementType: 'SUSPECT',
        verificationStatus: 'INVESTIGATING',
        confidence: 'HIGH',
        role: 'Tiêu thụ lô laptop & iPhone trộm cắp',
        notes:
          'Phát hiện 05 máy iPhone thuộc lô hàng bị mất tại kho Cầu Giấy được rao bán không hộp tại cửa hàng của Đức Đen.',
      },

      // === CASE 3: Đường dây tiêu thụ tài sản gian Phố Huế (PLANNED) ===
      {
        eventId: caseTieuThu.id,
        personId: maiVang.id,
        involvementType: 'SUSPECT',
        verificationStatus: 'INVESTIGATING',
        confidence: 'HIGH',
        role: 'Chủ mưu đường dây tiêu thụ & Tín dụng đen',
        notes:
          'Đứng tên cơ sở cầm đồ Ánh Mai, trực tiếp thu mua vàng trộm cắp để nấu chảy thành vàng nguyên liệu.',
      },
      {
        eventId: caseTieuThu.id,
        personId: ducDen.id,
        involvementType: 'ACCOMPLICE',
        verificationStatus: 'INVESTIGATING',
        confidence: 'MEDIUM',
        role: 'Đầu mối tiêu thụ thiết bị điện tử',
        notes:
          'Phối hợp với Mai Vàng tiêu thụ tài sản giá trị cao (điện thoại, laptop, đồng hồ) do các băng nhóm trộm cắp mang tới.',
      },
      {
        eventId: caseTieuThu.id,
        personId: hungSoi.id,
        involvementType: 'PERSON_OF_INTEREST',
        verificationStatus: 'HYPOTHESIS',
        confidence: 'HIGH',
        role: 'Nguồn cung cấp tài sản trộm cắp',
        notes:
          'Cung cấp vàng và tài sản lấy được từ các vụ đột nhập cho Mai Vàng tiêu thụ.',
      },
      {
        eventId: caseTieuThu.id,
        personId: thaoNgan.id,
        involvementType: 'VICTIM',
        verificationStatus: 'INVESTIGATING',
        confidence: 'HIGH',
        role: 'Con nợ bị cưỡng ép',
        notes:
          'Vay 100 triệu đồng nhưng bị tính lãi cắt cổ lên 350 triệu đồng, bị đe dọa buộc phải hợp tác cung cấp thông tin nội bộ tiệm vàng.',
      },

      // === CASE 4: Vụ cạy két sắt Long Biên (COMPLETED) ===
      {
        eventId: caseLongBienClosed.id,
        personId: hungSoi.id,
        involvementType: 'SUSPECT',
        verificationStatus: 'INVESTIGATING',
        confidence: 'MEDIUM',
        role: 'Nghi vấn liên đới',
        notes: 'Có mặt gần khu vực Ngọc Lâm vào thời điểm xảy ra vụ án tháng 11/2025.',
      },
      {
        eventId: caseLongBienClosed.id,
        personId: namBeo.id,
        involvementType: 'WITNESS',
        verificationStatus: 'CONFIRMED',
        confidence: 'MEDIUM',
        role: 'Khai báo thông tin cũ',
        notes: 'Cung cấp thông tin về thói quen hoạt động ban đêm của băng nhóm Long Biên.',
      },
    ],
  });

  console.log('✓ Đã tạo 18 liên kết giả thuyết điều tra (PersonEvent) giữa Đối tượng và Vụ án');

  // 10. Create Investigation Log Entries (JournalEntry linked to both Cases & Subjects)
  const logEntry1 = await prisma.journalEntry.create({
    data: {
      userId: user.id,
      title: 'Biên bản khám nghiệm hiện trường & Trích xuất camera Vụ tiệm vàng Kim Bảo',
      date: new Date('2026-03-05T08:30:00.000Z'),
      hasTime: true,
      body: `### Kết quả khám nghiệm hiện trường (68 Hàng Bạc)\n- Kẻ gian đột nhập qua lối thông gió tầng tum lúc **02h12 sáng 05/03/2026**.\n- Hộp điều khiển trung tâm báo động hồng ngoại bị ngắt nguồn dự phòng và nhập mã bảo trì kỹ thuật chính xác ngay lần đầu tiên -> **Nhận định có sự thông đồng hoặc rò rỉ thông tin từ nhân viên nội bộ**.\n- Thu giữ 02 vết giày cỡ 42 tại hành lang tầng 2 và 01 mẫu vân tay mờ trên nắp hộp kỹ thuật.\n\n### Trích xuất camera khu vực\n- Nguồn tin **Đỗ Văn Bình (Bình Xe Ôm)** cung cấp đoạn video từ camera hành trình lúc **02h42**: Có 02 đối tượng đội mũ trùm kín xách 02 ba lô đen lên xe bán tải **Ford Ranger màu đen** (biển số bị che bùn một phần, nhận diện được đầu số 29H-512.xx) do đối tượng giống **Phạm Quốc Tuấn (Tuấn Xế)** điều khiển.`,
      people: {
        create: [
          { personId: hungSoi.id },
          { personId: haiCan.id },
          { personId: tuanXe.id },
          { personId: binhXeOm.id },
        ],
      },
      events: {
        create: [{ eventId: caseKimBao.id }],
      },
    },
  });

  const logEntry2 = await prisma.journalEntry.create({
    data: {
      userId: user.id,
      title: 'Báo cáo xác minh ngoại phạm của Hoàng Văn Nam (Nam Béo) — Loại trừ nghi vấn',
      date: new Date('2026-03-07T14:15:00.000Z'),
      hasTime: true,
      body: `### Nội dung xác minh\nTiến hành làm việc với Bệnh viện Đa khoa Đức Giang (Long Biên) để kiểm tra thông tin ngoại phạm của đối tượng **Hoàng Văn Nam (Nam Béo)**.\n\n### Kết luận\n- Hồ sơ bệnh án số #BA-2026-0892 và dữ liệu camera hành lang Khoa Ngoại tổng hợp xác nhận Hoàng Văn Nam nhập viện cấp cứu mổ ruột thừa lúc **19h30 ngày 03/03/2026** và nằm điều trị liên tục đến chiều **07/03/2026**.\n- **Quyết định**: Chuyển trạng thái của Hoàng Văn Nam trong Vụ án #2026-01 sang **Đã loại trừ (RULED_OUT)** để tập trung lực lượng vào mũi của **Nguyễn Văn Hùng (Hùng Sói)** và **Lê Hoàng Hải (Hải Cận)**.`,
      people: {
        create: [{ personId: namBeo.id }, { personId: hungSoi.id }],
      },
      events: {
        create: [{ eventId: caseKimBao.id }],
      },
    },
  });

  const logEntry3 = await prisma.journalEntry.create({
    data: {
      userId: user.id,
      title: 'Báo cáo trinh sát liên chuyên án: Phát hiện điểm giao nhận hàng giữa Tuấn Xế, Mai Vàng và Đức Đen',
      date: new Date('2026-03-10T22:00:00.000Z'),
      hasTime: true,
      body: `### Diễn biến giám sát\nTổ trinh sát mật phục tại khu vực Phố Huế và Chùa Bộc ghi nhận:\n1. Lúc **20h15 ngày 10/03/2026**, **Nguyễn Văn Hùng (Hùng Sói)** xuất hiện tại ngõ sau Tiệm cầm đồ Ánh Mai (215 Phố Huế) và gặp trực tiếp **Đặng Thị Mai (Mai Vàng)** trong khoảng 40 phút.\n2. Cùng ngày, xác minh tài khoản ngân hàng của thu ngân **Bùi Thanh Thảo (Thảo Ngân)** phát hiện nhiều giao dịch chuyển tiền trả lãi cho Đặng Thị Mai trước ngày 05/03/2026.\n3. Tại Quận Đống Đa, **Phạm Quốc Tuấn (Tuấn Xế)** và **Vũ Đình Khánh (Khánh Chột)** đã giao 02 thùng linh kiện điện tử thuộc lô hàng mất cắp tại **Kho Cầu Giấy (Vụ án #2026-02)** cho cửa hàng của **Trần Minh Đức (Đức Đen)**.\n\n### Đề xuất kế hoạch phá án\n- Đủ căn cứ xác lập mối liên hệ chặt chẽ giữa 3 vụ án (#2026-01, #2026-02, #2026-03).\n- Đề xuất triệu tập đồng loạt các đối tượng và khám xét khẩn cấp nơi ở tại Số 18 Ngõ Đào Duy Từ (Hoàn Kiếm) cùng Tiệm cầm đồ Ánh Mai (215 Phố Huế).`,
      people: {
        create: [
          { personId: hungSoi.id },
          { personId: maiVang.id },
          { personId: thaoNgan.id },
          { personId: tuanXe.id },
          { personId: khanhChot.id },
          { personId: ducDen.id },
        ],
      },
      events: {
        create: [
          { eventId: caseKimBao.id },
          { eventId: caseCauGiay.id },
          { eventId: caseTieuThu.id },
        ],
      },
    },
  });

  console.log(
    `✓ Đã tạo 3 biên bản Nhật ký điều tra (${logEntry1.id}, ${logEntry2.id}, ${logEntry3.id}) gắn kết cả Vụ án và Đối tượng`
  );
  }

  console.log('\n🎉 Khởi tạo cơ sở dữ liệu mẫu điều tra thành công!');
  console.log('\nThông tin đăng nhập Demo:');
  console.log('Email:    demo@nametag.one');
  console.log('Mật khẩu: password123');
  console.log('Ngôn ngữ: Tiếng Việt (vi-VN)');

  // Disconnect after successful seed
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Lỗi khi khởi tạo dữ liệu mẫu:', e);
  process.exit(1);
});
