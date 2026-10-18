// Load environment variables FIRST (before any other imports)
import { config } from 'dotenv';
config();

// Now import everything else
import * as bcrypt from 'bcryptjs';

async function main() {
  // Dynamically import prisma after env is loaded. The seed wipes and rebuilds
  // the database, so it uses the client that sees soft-deleted rows too.
  const { prismaIncludingDeleted: prisma } = await import('../lib/prisma');
  console.log('🌱 Bắt đầu khởi tạo dữ liệu mẫu điều tra vụ án & đối tượng (Investigation Demo System)...');

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

  // Clear investigation sub-entities
  await prisma.suspectBankAccount.deleteMany();
  await prisma.suspectVehicle.deleteMany();
  await prisma.physicalMark.deleteMany();
  await prisma.criminalRecord.deleteMany();
  await prisma.gangMembership.deleteMany();
  await prisma.gang.deleteMany();

  // Clear person sub-entities
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

  console.log('✓ Đã dọn sạch cơ sở dữ liệu cũ');

  // 1. Upsert Demo Investigator User
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

  // Seed investigation data for all users in the DB
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

    console.log('✓ Đã tạo các loại mối quan hệ nghiệp vụ');

    // 3. Create Criminal Gangs (Băng nhóm tội phạm)
    const gangLongBien = await prisma.gang.create({
      data: {
        userId: user.id,
        name: 'Băng nhóm Hùng Sói (Long Biên)',
        turf: 'Long Biên, Hoàn Kiếm, Gia Lâm',
        description: 'Ổ nhóm chuyên đột nhập ban đêm, vô hiệu hóa hệ thống báo động các cửa hàng kim hoàn và kho hàng.',
        color: '#EF4444',
      },
    });

    const gangCauGiay = await prisma.gang.create({
      data: {
        userId: user.id,
        name: 'Băng nhóm Cầu Giấy (Khánh Chột)',
        turf: 'Cầu Giấy, Nam Từ Liêm, Bắc Từ Liêm',
        description: 'Chuyên cướp giật tài sản, cắt khóa kho xưởng công nghệ cao và đe dọa đòi nợ thuê.',
        color: '#F59E0B',
      },
    });

    const gangPhoHue = await prisma.gang.create({
      data: {
        userId: user.id,
        name: 'Đường dây Tiêu thụ & Tín dụng đen Phố Huế',
        turf: 'Hai Bà Trưng, Đống Đa, Hoàng Mai',
        description: 'Cơ sở cầm đồ trá hình, chuyên thu mua vàng trộm cắp nấu chảy và cho vay nặng lãi cưỡng đoạt.',
        color: '#8B5CF6',
      },
    });

    console.log('✓ Đã tạo 3 băng nhóm tội phạm địa bàn');

    // 4. Create Groups (Chuyên án & Danh mục quản lý)
    const taskForceGroup = await prisma.group.create({
      data: {
        userId: user.id,
        name: 'Chuyên án VA-2026A (Trộm tiệm vàng & Kho hàng)',
        description: 'Các đối tượng và vụ án thuộc diện theo dõi đặc biệt của Ban chuyên án',
        color: '#EF4444',
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

    // 5. Create 22 People (Subjects & Witnesses) with Full Dossiers
    // Subject 1: Nguyễn Văn Hùng ("Hùng Sói") - Ringleader
    const hungSoi = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Nguyễn',
        middleName: 'Văn',
        name: 'Hùng',
        nickname: 'Hùng Sói',
        organization: 'Tự do',
        jobTitle: 'Đối tượng cầm đầu ổ nhóm',
        citizenId: '001086012491',
        residenceStatus: 'TEMPORARY',
        managementLevel: 'KEY_TARGET',
        threatLevel: 'HIGH',
        heightCm: 174,
        weightKg: 68,
        bloodType: 'O',
        modusOperandi: 'Chuyên cạy khóa, vô hiệu hóa báo động hồng ngoại đột nhập ban đêm các tiệm vàng và kho hàng giá trị cao.',
        riskNotes: 'Rất cảnh giác, thường xuyên đổi số điện thoại và chỗ ở. Có mang theo hung khí khi hành sự.',
        notes: 'Đối tượng cộm cán, có 2 tiền án trộm cắp tài sản. Thường xuyên di chuyển giữa Long Biên và khu phố cổ Hoàn Kiếm vào ban đêm.',
        groups: { create: [{ groupId: taskForceGroup.id }] },
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
        vehicles: {
          create: [
            {
              plateNumber: '29A-868.92',
              vehicleType: 'Xe máy tay ga',
              brandModel: 'Honda SH 150i',
              color: 'Đen bóng',
              identifyingFeatures: 'Mặt nạ độ SH Ý, bọc carbon tay dắt',
              isSuspicious: true,
            },
          ],
        },
        bankAccounts: {
          create: [
            {
              bankName: 'MB Bank',
              accountNumber: '098877665544',
              accountHolder: 'NGUYEN MANH HUNG',
              accountType: 'OWNER',
              isPrimary: true,
              notes: 'Tài khoản chính chủ kinh doanh dịch vụ game net',
            },
            {
              bankName: 'VPBank',
              accountNumber: '9988112233',
              accountHolder: 'TRAN THI HOA',
              accountType: 'MULE',
              isPrimary: false,
              notes: 'Tài khoản rác mượn của bạn gái nhận chuyển tiền bảo kê',
            },
          ],
        },
        physicalMarks: {
          create: [
            {
              type: 'TATTOO',
              location: 'Bả vai trái',
              description: 'Xăm hình đầu sói ngậm trăng khuyết kích thước 15x15cm',
            },
            {
              type: 'SCAR',
              location: 'Lông mày phải',
              description: 'Vết sẹo rách dài 4cm cắt ngang lông mày',
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Trộm cắp tài sản',
              recordType: 'CONVICTION',
              sentenceDetail: '3 năm tù giam (TAND quận Long Biên)',
              verdictDate: new Date('2018-06-15'),
            },
            {
              charge: 'Trộm cắp tài sản',
              recordType: 'CONVICTION',
              sentenceDetail: '2 năm 6 tháng tù giam (TAND quận Hoàn Kiếm)',
              verdictDate: new Date('2021-09-20'),
            },
          ],
        },
      },
    });

    // Subject 2: Lê Hoàng Hải ("Hải Cận") - Lock & Electronics Specialist
    const haiCan = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Lê',
        middleName: 'Hoàng',
        name: 'Hải',
        nickname: 'Hải Cận',
        organization: 'Tiệm sửa khóa & Điện tử Hoàng Hải',
        jobTitle: 'Thợ khóa / Kỹ thuật điện tử',
        citizenId: '001089004112',
        residenceStatus: 'PERMANENT',
        managementLevel: 'KEY_TARGET',
        threatLevel: 'MEDIUM',
        heightCm: 168,
        weightKg: 60,
        modusOperandi: 'Dùng thiết bị điện tử giải mã khóa thẻ từ, dò mã két sắt số, ngắt nguồn dự phòng hộp báo động.',
        notes: 'Am hiểu sâu về hệ thống báo động hồng ngoại, camera giám sát và két sắt điện tử.',
        groups: { create: [{ groupId: taskForceGroup.id }] },
        phoneNumbers: { create: [{ type: 'mobile', number: '0904 512 889' }] },
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Số 45 Phố Phúc Tân, Phường Phúc Tân',
              locality: 'Quận Hoàn Kiếm',
              region: 'Hà Nội',
              latitude: 21.0378,
              longitude: 105.8588,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29B1-234.56',
              vehicleType: 'Xe máy',
              brandModel: 'Yamaha Exciter 150',
              color: 'Xanh GP',
              identifyingFeatures: 'Bô độ nổ giòn, mất chắn bùn sau',
              isSuspicious: true,
            },
          ],
        },
        physicalMarks: {
          create: [
            {
              type: 'MOLE',
              location: 'Đuôi mắt trái',
              description: 'Nốt ruồi đen nổi rõ cách đuôi mắt 1cm',
            },
            {
              type: 'SCAR',
              location: 'Mu bàn tay phải',
              description: 'Sẹo bỏng chì hàn hình tròn đường kính 2cm',
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Trộm cắp tài sản',
              recordType: 'CONVICTION',
              sentenceDetail: '2 năm tù giam (TAND quận Ba Đình)',
              verdictDate: new Date('2020-04-10'),
            },
          ],
        },
      },
    });

    // Subject 3: Phạm Quốc Tuấn ("Tuấn Xế") - Driver / Lookout
    const tuanXe = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Phạm',
        middleName: 'Quốc',
        name: 'Tuấn',
        nickname: 'Tuấn Xế',
        organization: 'Lái xe dịch vụ tự do',
        citizenId: '001091008873',
        residenceStatus: 'PERMANENT',
        managementLevel: 'SURVEILLANCE',
        threatLevel: 'MEDIUM',
        heightCm: 172,
        weightKg: 70,
        modusOperandi: 'Lái xe bán tải gắn biển giả chở đồng bọn và tẩu tán tang vật lúc nửa đêm, cảnh giới từ xa qua bộ đàm.',
        groups: { create: [{ groupId: taskForceGroup.id }] },
        phoneNumbers: { create: [{ type: 'mobile', number: '0978 654 321' }] },
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Ngõ 12 Phố Hàng Buồm, Phường Hàng Buồm',
              locality: 'Quận Hoàn Kiếm',
              region: 'Hà Nội',
              latitude: 21.0355,
              longitude: 105.8512,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29H-512.68',
              vehicleType: 'Ô tô bán tải',
              brandModel: 'Ford Ranger XLS',
              color: 'Đen mờ',
              identifyingFeatures: 'Thùng sau có nắp cuộn kéo, dán decal Offroad',
              isSuspicious: true,
            },
            {
              plateNumber: '29E1-456.78',
              vehicleType: 'Xe máy',
              brandModel: 'Honda Wave Alpha',
              color: 'Đỏ cờ',
              isSuspicious: false,
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Gây rối trật tự công cộng',
              recordType: 'ADMIN_VIOLATION',
              sentenceDetail: 'Phạt hành chính 3.500.000 VNĐ',
              verdictDate: new Date('2023-08-14'),
            },
          ],
        },
      },
    });

    // Subject 4: Đặng Thị Mai ("Mai Vàng") - Pawnshop / Stolen Assets Fence
    const maiVang = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Đặng',
        middleName: 'Thị',
        name: 'Mai',
        nickname: 'Mai Vàng',
        organization: 'Dịch vụ Cầm đồ Ánh Mai',
        jobTitle: 'Chủ cơ sở cầm đồ',
        citizenId: '001185002234',
        residenceStatus: 'PERMANENT',
        managementLevel: 'KEY_TARGET',
        threatLevel: 'MEDIUM',
        heightCm: 160,
        weightKg: 55,
        modusOperandi: 'Nhận vàng trộm cắp nấu chảy thành thỏi nhỏ ngay trong đêm; cho vay lãi nặng siết nợ.',
        groups: { create: [{ groupId: fenceRingGroup.id }] },
        phoneNumbers: { create: [{ type: 'work', number: '0913 222 888' }] },
        addresses: {
          create: [
            {
              type: 'work',
              streetLine1: 'Số 215 Phố Huế, Phường Phố Huế',
              locality: 'Quận Hai Bà Trưng',
              region: 'Hà Nội',
              latitude: 21.0165,
              longitude: 105.8515,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29A-999.88',
              vehicleType: 'Ô tô 5 chỗ',
              brandModel: 'Mercedes-Benz C200',
              color: 'Trắng ngọc trai',
              isSuspicious: false,
            },
          ],
        },
        bankAccounts: {
          create: [
            {
              bankName: 'Vietcombank',
              accountNumber: '0011004455667',
              accountHolder: 'DANG THI MAI',
              accountType: 'OWNER',
              isPrimary: true,
              notes: 'Tài khoản chính chủ tiệm cầm đồ Ánh Mai',
            },
            {
              bankName: 'ACB',
              accountNumber: '8888999922',
              accountHolder: 'NGUYEN VAN TRUONG',
              accountType: 'SUSPICIOUS',
              isPrimary: false,
              notes: 'Nghi vấn nhận tiền chuyển khoản thanh toán vàng tang vật không hóa đơn',
            },
            {
              bankName: 'TPBank',
              accountNumber: '03344556677',
              accountHolder: 'LE THI LIEN',
              accountType: 'MULE',
              isPrimary: false,
              notes: 'Tài khoản gom tiền mua crypto chuyển ra nước ngoài',
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Chứa chấp hoặc tiêu thụ tài sản do người khác phạm tội mà có',
              recordType: 'CONVICTION',
              sentenceDetail: '18 tháng tù treo (TAND quận Hai Bà Trưng)',
              verdictDate: new Date('2022-11-05'),
            },
          ],
        },
      },
    });

    // Subject 5: Vũ Đình Khánh ("Khánh Chột") - Enforcer & Warehouse Cutter
    const khanhChot = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Vũ',
        middleName: 'Đình',
        name: 'Khánh',
        nickname: 'Khánh Chột',
        organization: 'Bảo kê tự do',
        citizenId: '001088006655',
        residenceStatus: 'TEMPORARY',
        managementLevel: 'KEY_TARGET',
        threatLevel: 'ARMED_DANGEROUS',
        heightCm: 178,
        weightKg: 82,
        modusOperandi: 'Dùng kìm cộng lực thủy lực cắt khóa cửa cuốn kho hàng; manh động chống trả khi bị vây bắt.',
        groups: { create: [{ groupId: taskForceGroup.id }] },
        phoneNumbers: { create: [{ type: 'mobile', number: '0966 888 999' }] },
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Ngõ 165 Đường Cầu Giấy, Phường Dịch Vọng',
              locality: 'Quận Cầu Giấy',
              region: 'Hà Nội',
              latitude: 21.0335,
              longitude: 105.7925,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29X1-678.90',
              vehicleType: 'Xe máy',
              brandModel: 'Honda Winner X',
              color: 'Đen nhám',
              identifyingFeatures: 'Bọc tem rằn ri quân đội, mâm sơn vàng đồng',
              isSuspicious: true,
            },
          ],
        },
        physicalMarks: {
          create: [
            {
              type: 'SCAR',
              location: 'Khóe mắt trái',
              description: 'Vết chém dài làm hỏng một phần mí mắt trái (chột mắt)',
            },
            {
              type: 'TATTOO',
              location: 'Ngực trước',
              description: 'Xăm hình mặt hổ vằn nhe nanh',
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Cố ý gây thương tích',
              recordType: 'CONVICTION',
              sentenceDetail: '4 năm tù giam (TAND quận Cầu Giấy)',
              verdictDate: new Date('2017-03-12'),
            },
            {
              charge: 'Cướp tài sản',
              recordType: 'CONVICTION',
              sentenceDetail: '5 năm tù giam (TAND TP Hà Nội)',
              verdictDate: new Date('2021-08-25'),
            },
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
        organization: 'Cửa hàng Điện thoại Đức Mobile',
        citizenId: '001092003344',
        residenceStatus: 'PERMANENT',
        managementLevel: 'SURVEILLANCE',
        threatLevel: 'LOW',
        groups: { create: [{ groupId: fenceRingGroup.id }] },
        phoneNumbers: { create: [{ type: 'work', number: '0936 123 789' }] },
        addresses: {
          create: [
            {
              type: 'work',
              streetLine1: 'Số 78 Phố Chùa Bộc, Phường Quang Trung',
              locality: 'Quận Đống Đa',
              region: 'Hà Nội',
              latitude: 21.0085,
              longitude: 105.8285,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29D1-345.67',
              vehicleType: 'Xe máy tay ga',
              brandModel: 'Vespa Sprint',
              color: 'Xám xi măng',
              isSuspicious: false,
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Tiêu thụ tài sản không rõ nguồn gốc',
              recordType: 'ADMIN_VIOLATION',
              sentenceDetail: 'Xử phạt hành chính 15.000.000 VNĐ',
              verdictDate: new Date('2024-02-18'),
            },
          ],
        },
      },
    });

    // Subject 7: Hoàng Văn Nam ("Nam Béo") - Ruled Out Suspect
    const namBeo = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Hoàng',
        middleName: 'Văn',
        name: 'Nam',
        nickname: 'Nam Béo',
        citizenId: '001087009988',
        residenceStatus: 'PERMANENT',
        managementLevel: 'SURVEILLANCE',
        threatLevel: 'LOW',
        notes: 'Có tiền án trộm cắp nhưng đã hoàn lương, được loại trừ nghi vấn vụ Kim Bảo do đang nằm viện mổ ruột thừa.',
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Số 88 Phố Ngô Gia Tự, Phường Đức Giang',
              locality: 'Quận Long Biên',
              region: 'Hà Nội',
              latitude: 21.0585,
              longitude: 105.8895,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29K1-789.01',
              vehicleType: 'Xe máy',
              brandModel: 'Honda Lead',
              color: 'Vàng cát',
              isSuspicious: false,
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Trộm cắp tài sản',
              recordType: 'CONVICTION',
              sentenceDetail: '18 tháng tù (đã chấp hành xong năm 2019)',
              isPardoned: true,
              verdictDate: new Date('2018-01-10'),
            },
          ],
        },
      },
    });

    // Subject 8: Bùi Thanh Thảo ("Thảo Ngân") - Jewelry Store Teller (Victim / Coerced)
    const thaoNgan = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Bùi',
        middleName: 'Thanh',
        name: 'Thảo',
        nickname: 'Thảo Ngân',
        organization: 'Tiệm vàng Kim Bảo',
        jobTitle: 'Thu ngân chính',
        citizenId: '001198005566',
        residenceStatus: 'PERMANENT',
        managementLevel: 'NORMAL',
        threatLevel: 'LOW',
        notes: 'Thu ngân tiệm vàng, nợ tiền lãi của Mai Vàng, nghi vấn bị ép buộc cung cấp mã bảo trì báo động.',
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Số 52 Phố Hàng Bạc, Phường Hàng Bạc',
              locality: 'Quận Hoàn Kiếm',
              region: 'Hà Nội',
              latitude: 21.0342,
              longitude: 105.8528,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        bankAccounts: {
          create: [
            {
              bankName: 'VPBank',
              accountNumber: '198888776655',
              accountHolder: 'BUI THANH THAO',
              accountType: 'OWNER',
              isPrimary: true,
              notes: 'Tài khoản nhận lương thu ngân tiệm vàng và trả tiền lãi nợ nóng',
            },
          ],
        },
      },
    });

    // Subject 9: Đỗ Văn Bình ("Bình Xe Ôm") - Eyewitness
    const binhXeOm = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Đỗ',
        middleName: 'Văn',
        name: 'Bình',
        nickname: 'Bình Xe Ôm',
        organization: 'Tài xế xe ôm công nghệ',
        citizenId: '001075001122',
        residenceStatus: 'PERMANENT',
        managementLevel: 'NORMAL',
        threatLevel: 'LOW',
        notes: 'Nhân chứng cung cấp camera hành trình ghi lại chiếc Ford Ranger đón 2 đối tượng rời tiệm vàng.',
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Ngã tư Đinh Liệt - Hàng Bạc',
              locality: 'Quận Hoàn Kiếm',
              region: 'Hà Nội',
              latitude: 21.0338,
              longitude: 105.8522,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
      },
    });

    // Subject 10: Trịnh Công Vinh ("Vinh Bạc") - Wanted Lock Decoder Smuggler
    const vinhBac = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Trịnh',
        middleName: 'Công',
        name: 'Vinh',
        nickname: 'Vinh Bạc',
        citizenId: '001084007799',
        residenceStatus: 'WANTED',
        managementLevel: 'KEY_TARGET',
        threatLevel: 'HIGH',
        notes: 'Đang trốn nã tội Buôn lậu thiết bị công nghệ mở khóa. Cung cấp bộ giải mã két sắt cho Hải Cận.',
        addresses: {
          create: [
            {
              type: 'other',
              streetLine1: 'Khu nhà trọ cũ Bến xe Nước Ngầm',
              locality: 'Quận Hoàng Mai',
              region: 'Hà Nội',
              latitude: 20.9755,
              longitude: 105.8415,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29F1-888.66',
              vehicleType: 'Xe máy',
              brandModel: 'Honda AirBlade',
              color: 'Đỏ đen',
              isSuspicious: true,
            },
          ],
        },
        physicalMarks: {
          create: [
            {
              type: 'TATTOO',
              location: 'Cánh tay phải',
              description: 'Xăm hình đại bàng tung cánh quắp quả địa cầu',
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Buôn lậu',
              recordType: 'CONVICTION',
              sentenceDetail: '3 năm 6 tháng tù (TAND TP Hải Phòng)',
              verdictDate: new Date('2019-10-15'),
            },
          ],
        },
      },
    });

    // Subject 11: Trần Văn Tặc ("Tặc Mắt Lé") - Key Proximity Burglary Suspect (50m from Kim Bảo!)
    const tacMatLe = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Trần',
        middleName: 'Văn',
        name: 'Tặc',
        nickname: 'Tặc Mắt Lé',
        citizenId: '001089011223',
        residenceStatus: 'TEMPORARY',
        managementLevel: 'KEY_TARGET',
        threatLevel: 'HIGH',
        heightCm: 165,
        weightKg: 58,
        modusOperandi: 'Chuyên cạy cửa sổ, leo tum các phố cổ trộm cắp trang sức và tiền mặt.',
        notes: 'Cư trú cách Tiệm vàng Kim Bảo chỉ 50 mét. Rất trùng khớp với hệ loại tội phạm của vụ án.',
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Số 22 Phố Hàng Bạc, Phường Hàng Bạc',
              locality: 'Quận Hoàn Kiếm',
              region: 'Hà Nội',
              latitude: 21.0346,
              longitude: 105.8530,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29C1-555.55',
              vehicleType: 'Xe máy',
              brandModel: 'Honda Wave Alpha',
              color: 'Xanh nhớt',
              identifyingFeatures: 'Biển số ngũ quý 5 giả, pô cắt ngắn',
              isSuspicious: true,
            },
          ],
        },
        physicalMarks: {
          create: [
            {
              type: 'TATTOO',
              location: 'Bắp tay phải',
              description: 'Hình xăm rồng quấn thanh kiếm dài 20cm',
            },
            {
              type: 'DEFORMITY',
              location: 'Mắt trái',
              description: 'Mắt trái bị lác ngoài bẩm sinh',
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Trộm cắp tài sản',
              recordType: 'CONVICTION',
              sentenceDetail: '2 năm tù giam (TAND quận Hoàn Kiếm)',
              verdictDate: new Date('2022-04-18'),
            },
          ],
        },
      },
    });

    // Subject 12: Nguyễn Tiến Đạt ("Đạt Cỏ") - Drug Addict & Petty Thief (Near Crime Scene)
    const datCo = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Nguyễn',
        middleName: 'Tiến',
        name: 'Đạt',
        nickname: 'Đạt Cỏ',
        citizenId: '001095007788',
        residenceStatus: 'PERMANENT',
        managementLevel: 'SURVEILLANCE',
        threatLevel: 'MEDIUM',
        heightCm: 170,
        weightKg: 52,
        modusOperandi: 'Trộm cắp vặt, sơ hở là bẻ khóa xe máy hoặc mò vào nhà dân lấy tài sản ban đêm để có tiền hút chích.',
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Số 34 Phố Hàng Mắm, Phường Hàng Buồm',
              locality: 'Quận Hoàn Kiếm',
              region: 'Hà Nội',
              latitude: 21.0340,
              longitude: 105.8550,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29M1-987.65',
              vehicleType: 'Xe máy',
              brandModel: 'Yamaha Sirius',
              color: 'Đen bạc',
              isSuspicious: true,
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Sử dụng trái phép chất ma túy & Trộm cắp tài sản',
              recordType: 'ADMIN_VIOLATION',
              sentenceDetail: 'Cai nghiện bắt buộc 12 tháng tại Trung tâm số 2',
              verdictDate: new Date('2023-01-20'),
            },
          ],
        },
      },
    });

    // Subject 13: Lương Văn Lợi ("Lợi Búa") - Violent Robbery & Snatches
    const loiBua = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Lương',
        middleName: 'Văn',
        name: 'Lợi',
        nickname: 'Lợi Búa',
        citizenId: '001083002211',
        residenceStatus: 'TEMPORARY',
        managementLevel: 'KEY_TARGET',
        threatLevel: 'ARMED_DANGEROUS',
        heightCm: 176,
        weightKg: 78,
        modusOperandi: 'Chạy xe phân khối lớn ép sát cướp giật túi xách, dây chuyền của du khách; mang theo búa đinh để chống trả.',
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Số 15 Phố Cầu Gỗ, Phường Hàng Bạc',
              locality: 'Quận Hoàn Kiếm',
              region: 'Hà Nội',
              latitude: 21.0325,
              longitude: 105.8535,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29T1-112.23',
              vehicleType: 'Xe máy',
              brandModel: 'Yamaha Exciter 135',
              color: 'Đỏ đen',
              identifyingFeatures: 'Tháo gương, gập biển số lên gầm',
              isSuspicious: true,
            },
          ],
        },
        physicalMarks: {
          create: [
            {
              type: 'SCAR',
              location: 'Cằm dưới bên trái',
              description: 'Vết sẹo lồi to bằng hạt ngô do bị ngã xe rượt đuổi',
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Cướp giật tài sản',
              recordType: 'CONVICTION',
              sentenceDetail: '4 năm tù giam (TAND quận Ba Đình)',
              verdictDate: new Date('2019-07-22'),
            },
          ],
        },
      },
    });

    // Subject 14: Vũ Mạnh Thắng ("Thắng Choắt") - Auto Parts & Mirrors Thief
    const thangChoat = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Vũ',
        middleName: 'Mạnh',
        name: 'Thắng',
        nickname: 'Thắng Choắt',
        citizenId: '001096003322',
        residenceStatus: 'PERMANENT',
        managementLevel: 'SURVEILLANCE',
        threatLevel: 'LOW',
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Số 80 Phố Mã Mây, Phường Hàng Buồm',
              locality: 'Quận Hoàn Kiếm',
              region: 'Hà Nội',
              latitude: 21.0352,
              longitude: 105.8532,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29P1-334.45',
              vehicleType: 'Xe máy',
              brandModel: 'Honda Wave RSX',
              color: 'Trắng đen',
              isSuspicious: false,
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Trộm cắp phụ tùng ô tô',
              recordType: 'ADMIN_VIOLATION',
              sentenceDetail: 'Xử phạt hành chính 2.500.000 VNĐ',
              verdictDate: new Date('2024-05-10'),
            },
          ],
        },
      },
    });

    // Subject 15: Dương Tuấn Kiệt ("Kiệt Lùn") - Cầu Giấy Gang Core Member
    const kietLun = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Dương',
        middleName: 'Tuấn',
        name: 'Kiệt',
        nickname: 'Kiệt Lùn',
        citizenId: '001086009944',
        residenceStatus: 'PERMANENT',
        managementLevel: 'KEY_TARGET',
        threatLevel: 'HIGH',
        heightCm: 162,
        weightKg: 65,
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Ngõ 68 Phố Cầu Giấy, Phường Quan Hoa',
              locality: 'Quận Cầu Giấy',
              region: 'Hà Nội',
              latitude: 21.0320,
              longitude: 105.7980,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29S1-778.89',
              vehicleType: 'Xe máy',
              brandModel: 'Honda SH 150i',
              color: 'Đen nhám',
              isSuspicious: true,
            },
          ],
        },
        physicalMarks: {
          create: [
            {
              type: 'TATTOO',
              location: 'Lưng',
              description: 'Xăm hình Kỳ lân đạp mây phủ kín lưng',
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Cướp tài sản có tổ chức',
              recordType: 'CONVICTION',
              sentenceDetail: '5 năm tù giam (TAND quận Cầu Giấy)',
              verdictDate: new Date('2018-09-09'),
            },
          ],
        },
      },
    });

    // Subject 16: Lê Văn Long ("Long Rồng") - Violent Ex-Convict
    const longRong = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Lê',
        middleName: 'Văn',
        name: 'Long',
        nickname: 'Long Rồng',
        citizenId: '001082006611',
        residenceStatus: 'PERMANENT',
        managementLevel: 'KEY_TARGET',
        threatLevel: 'ARMED_DANGEROUS',
        heightCm: 180,
        weightKg: 85,
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Số 12 Phố Dịch Vọng Hậu, Phường Dịch Vọng Hậu',
              locality: 'Quận Cầu Giấy',
              region: 'Hà Nội',
              latitude: 21.0305,
              longitude: 105.7890,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29L1-666.99',
              vehicleType: 'Mô tô phân khối lớn',
              brandModel: 'Kawasaki Z1000',
              color: 'Xanh đen',
              isSuspicious: true,
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Cố ý gây thương tích dẫn đến chết người',
              recordType: 'CONVICTION',
              sentenceDetail: '10 năm tù giam (đã chấp hành xong năm 2022)',
              verdictDate: new Date('2012-10-12'),
            },
          ],
        },
      },
    });

    // Subject 17: Nguyễn Thị Hồng Vân ("Vân Tín Dụng") - Loan Shark Phố Huế
    const vanTinDung = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Nguyễn',
        middleName: 'Thị Hồng',
        name: 'Vân',
        nickname: 'Vân Tín Dụng',
        citizenId: '001188004477',
        residenceStatus: 'PERMANENT',
        managementLevel: 'SURVEILLANCE',
        threatLevel: 'LOW',
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Số 180 Phố Huế, Phường Phố Huế',
              locality: 'Quận Hai Bà Trưng',
              region: 'Hà Nội',
              latitude: 21.0150,
              longitude: 105.8510,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29B2-998.89',
              vehicleType: 'Xe máy',
              brandModel: 'Piaggio Liberty',
              color: 'Trắng',
              isSuspicious: false,
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Cho vay lãi nặng trong giao dịch dân sự',
              recordType: 'ADMIN_VIOLATION',
              sentenceDetail: 'Phạt tiền 30.000.000 VNĐ',
              verdictDate: new Date('2023-12-02'),
            },
          ],
        },
      },
    });

    // Subject 18: Đỗ Hoàng Phong ("Phong Đua") - Street Snatcher
    const phongDua = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Đỗ',
        middleName: 'Hoàng',
        name: 'Phong',
        nickname: 'Phong Đua',
        citizenId: '001099001155',
        residenceStatus: 'TEMPORARY',
        managementLevel: 'SURVEILLANCE',
        threatLevel: 'MEDIUM',
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Số 242 Phố Huế, Phường Phố Huế',
              locality: 'Quận Hai Bà Trưng',
              region: 'Hà Nội',
              latitude: 21.0180,
              longitude: 105.8520,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29V1-445.56',
              vehicleType: 'Xe máy',
              brandModel: 'Honda Wave độ kiểng',
              color: 'Tím mộng mơ',
              identifyingFeatures: 'Pô nổ đanh, đèn LED chớp nháy',
              isSuspicious: true,
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Gây rối trật tự công cộng (đua xe trái phép)',
              recordType: 'ADMIN_VIOLATION',
              sentenceDetail: 'Tạm giữ phương tiện 30 ngày',
              verdictDate: new Date('2024-06-25'),
            },
          ],
        },
      },
    });

    // Subject 19: Phạm Văn Hùng ("Hùng Còi") - Motorbike Thief Đống Đa
    const hungCoi = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Phạm',
        middleName: 'Văn',
        name: 'Hùng',
        nickname: 'Hùng Còi',
        citizenId: '001093005544',
        residenceStatus: 'PERMANENT',
        managementLevel: 'SURVEILLANCE',
        threatLevel: 'LOW',
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Ngõ Thổ Quan, Phố Khâm Thiên',
              locality: 'Quận Đống Đa',
              region: 'Hà Nội',
              latitude: 21.0190,
              longitude: 105.8340,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
        vehicles: {
          create: [
            {
              plateNumber: '29X3-889.90',
              vehicleType: 'Xe máy',
              brandModel: 'Honda Dream Thái',
              color: 'Nâu mận',
              isSuspicious: false,
            },
          ],
        },
        criminalRecords: {
          create: [
            {
              charge: 'Trộm cắp xe máy',
              recordType: 'CONVICTION',
              sentenceDetail: '18 tháng tù treo',
              verdictDate: new Date('2023-04-10'),
            },
          ],
        },
      },
    });

    // Subject 20: Nguyễn Bảo An - Normal Honest Citizen (Doctor)
    const baoAn = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Nguyễn',
        middleName: 'Bảo',
        name: 'An',
        organization: 'Bệnh viện Bạch Mai',
        jobTitle: 'Bác sĩ Tim mạch',
        citizenId: '001090001234',
        residenceStatus: 'PERMANENT',
        managementLevel: 'NORMAL',
        threatLevel: 'LOW',
        notes: 'Dân cư bình thường, không có tiền án tiền sự.',
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Số 78 Đường Giải Phóng, Phường Phương Mai',
              locality: 'Quận Đống Đa',
              region: 'Hà Nội',
              latitude: 21.0020,
              longitude: 105.8420,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
      },
    });

    // Subject 21: Trần Thị Thu Trang - Normal Citizen (Teacher near Hoàn Kiếm)
    const thuTrang = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Trần',
        middleName: 'Thị Thu',
        name: 'Trang',
        organization: 'Trường Tiểu học Hoàn Kiếm',
        jobTitle: 'Giáo viên',
        citizenId: '001192004567',
        residenceStatus: 'PERMANENT',
        managementLevel: 'NORMAL',
        threatLevel: 'LOW',
        notes: 'Dân cư lương thiện cư trú gần hiện trường phố Hàng Bạc.',
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Số 10 Phố Hàng Bạc, Phường Hàng Bạc',
              locality: 'Quận Hoàn Kiếm',
              region: 'Hà Nội',
              latitude: 21.0345,
              longitude: 105.8520,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
      },
    });

    // Subject 22: Vũ Đức Thịnh - Normal Citizen (Software Engineer Cầu Giấy)
    const ducThinh = await prisma.person.create({
      data: {
        userId: user.id,
        surname: 'Vũ',
        middleName: 'Đức',
        name: 'Thịnh',
        organization: 'Tập đoàn Công nghệ FPT',
        jobTitle: 'Kỹ sư Phần mềm',
        citizenId: '001085009876',
        residenceStatus: 'PERMANENT',
        managementLevel: 'NORMAL',
        threatLevel: 'LOW',
        addresses: {
          create: [
            {
              type: 'home',
              streetLine1: 'Tòa nhà Detech, Số 8 Tôn Thất Thuyết',
              locality: 'Quận Cầu Giấy',
              region: 'Hà Nội',
              latitude: 21.0350,
              longitude: 105.7850,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
      },
    });

    console.log('✓ Đã tạo 22 đối tượng & nhân chứng với hồ sơ nghiệp vụ đầy đủ');

    // 6. Link Gang Memberships
    await prisma.gangMembership.createMany({
      data: [
        { gangId: gangLongBien.id, personId: hungSoi.id, role: 'Cầm đầu / Chủ mưu' },
        { gangId: gangLongBien.id, personId: haiCan.id, role: 'Kỹ thuật khóa & Báo động' },
        { gangId: gangLongBien.id, personId: tuanXe.id, role: 'Tài xế vận chuyển' },
        { gangId: gangLongBien.id, personId: tacMatLe.id, role: 'Thành viên trực tiếp đột nhập' },

        { gangId: gangCauGiay.id, personId: khanhChot.id, role: 'Cầm đầu ổ nhóm' },
        { gangId: gangCauGiay.id, personId: kietLun.id, role: 'Đàn em đắc lực' },
        { gangId: gangCauGiay.id, personId: longRong.id, role: 'Bảo kê / Đâm thuê chém mướn' },

        { gangId: gangPhoHue.id, personId: maiVang.id, role: 'Bà trùm đường dây cầm đồ' },
        { gangId: gangPhoHue.id, personId: ducDen.id, role: 'Đầu mối tiêu thụ điện tử' },
        { gangId: gangPhoHue.id, personId: vanTinDung.id, role: 'Thu hồi nợ & Cho vay lãi nặng' },
        { gangId: gangPhoHue.id, personId: phongDua.id, role: 'Vận chuyển hàng lậu' },
      ],
    });

    console.log('✓ Đã kết nạp các đối tượng vào các băng nhóm tội phạm');

    // 7. Create Inter-Personal Relationships (Mối quan hệ đối tượng)
    await prisma.relationship.createMany({
      data: [
        { personId: hungSoi.id, relatedPersonId: haiCan.id, relationshipTypeId: bossType.id },
        { personId: haiCan.id, relatedPersonId: hungSoi.id, relationshipTypeId: subordinateType.id },

        { personId: hungSoi.id, relatedPersonId: tuanXe.id, relationshipTypeId: bossType.id },
        { personId: tuanXe.id, relatedPersonId: hungSoi.id, relationshipTypeId: subordinateType.id },

        { personId: hungSoi.id, relatedPersonId: tacMatLe.id, relationshipTypeId: accompliceType.id },
        { personId: tacMatLe.id, relatedPersonId: hungSoi.id, relationshipTypeId: accompliceType.id },

        { personId: hungSoi.id, relatedPersonId: maiVang.id, relationshipTypeId: fenceType.id },
        { personId: maiVang.id, relatedPersonId: hungSoi.id, relationshipTypeId: fenceType.id },

        { personId: khanhChot.id, relatedPersonId: kietLun.id, relationshipTypeId: bossType.id },
        { personId: kietLun.id, relatedPersonId: khanhChot.id, relationshipTypeId: subordinateType.id },

        { personId: khanhChot.id, relatedPersonId: longRong.id, relationshipTypeId: accompliceType.id },
        { personId: longRong.id, relatedPersonId: khanhChot.id, relationshipTypeId: accompliceType.id },

        { personId: maiVang.id, relatedPersonId: ducDen.id, relationshipTypeId: accompliceType.id },
        { personId: ducDen.id, relatedPersonId: maiVang.id, relationshipTypeId: accompliceType.id },
      ],
    });

    console.log('✓ Đã tạo mạng lưới quan hệ xã hội & tội phạm');

    // 8. Create 5 Cases (Events) with Crime Scene GPS Coordinates
    // ========================================================
    // CASE 1: [ÁN MỜ] Đột nhập Tiệm vàng Kim Bảo - Phố Hàng Bạc
    // ========================================================
    const caseKimBao = await prisma.event.create({
      data: {
        userId: user.id,
        title: 'Vụ án #2026-01: Đột nhập Tiệm vàng Kim Bảo - Phố Hàng Bạc',
        caseCode: 'TH-2026-01/HK',
        crimeType: 'Trộm cắp tài sản',
        caseStatus: 'UNRESOLVED',
        category: 'Tội phạm có tổ chức',
        status: 'ONGOING',
        startDate: new Date('2026-03-05T02:10:00.000Z'),
        hasTime: true,
        incidentTimeNotes: 'Khoảng 02h10 - 02h45 sáng ngày 05/03/2026 (trời mưa phùn, tầm nhìn hạn chế)',
        damageAssessment: '85 lượng vàng SJC và trang sức các loại (ước tính thiệt hại 7,2 tỷ VNĐ)',
        description:
          '### Tóm tắt nội dung vụ án\nRạng sáng ngày 05/03/2026, kẻ gian đột nhập từ tum tầng 3 xuống Tiệm vàng Kim Bảo (Số 68 Hàng Bạc, Hoàn Kiếm). Đối tượng đã ngắt nguồn dự phòng của hệ thống báo động hồng ngoại và dùng thiết bị chuyên dụng mở khóa 02 két sắt chứa khoảng **85 lượng vàng SJC và trang sức** (ước tính 7,2 tỷ VNĐ).\n\n### Dấu vết & Thủ đoạn (MO)\n- Không có dấu hiệu cạy phá cửa chính; hệ thống báo động bị vô hiệu hóa bằng mã kỹ thuật nội bộ.\n- Camera nhà dân ghi nhận 02 đối tượng áo mưa rời hiện trường lên xe bán tải Ford Ranger đen.',
        groups: { create: [{ groupId: taskForceGroup.id }] },
        addresses: {
          create: [
            {
              type: 'work',
              streetLine1: 'Số 68 Phố Hàng Bạc, Phường Hàng Bạc',
              locality: 'Quận Hoàn Kiếm',
              region: 'Hà Nội',
              latitude: 21.0341,
              longitude: 105.8525,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
      },
    });

    // ========================================================
    // CASE 2: [ĐANG ĐIỀU TRA] Trộm kho linh kiện điện tử Cầu Giấy
    // ========================================================
    const caseCauGiay = await prisma.event.create({
      data: {
        userId: user.id,
        title: 'Vụ án #2026-02: Trộm kho linh kiện điện tử công nghệ cao Cầu Giấy',
        caseCode: 'TH-2026-02/CG',
        crimeType: 'Trộm cắp tài sản',
        caseStatus: 'INVESTIGATING',
        category: 'Hình sự / Trật tự xã hội',
        status: 'ONGOING',
        startDate: new Date('2026-02-19T01:30:00.000Z'),
        hasTime: true,
        incidentTimeNotes: '01h30 sáng ngày 19/02/2026',
        damageAssessment: '120 máy tính xách tay ThinkPad & 200 điện thoại iPhone nguyên hộp (trị giá 6,5 tỷ VNĐ)',
        description:
          '### Tóm tắt nội dung vụ án\nKho hàng Công ty Thiết bị Số Hà Thành bị cắt khóa cửa cuốn bằng kìm thủy lực và ngắt camera. Nhóm đối tượng bốc dỡ lô hàng công nghệ lên xe bán tải tối màu chở đi tẩu tán.',
        groups: { create: [{ groupId: taskForceGroup.id }] },
        addresses: {
          create: [
            {
              type: 'work',
              streetLine1: 'Số 36 Phố Duy Tân, Phường Dịch Vọng Hậu',
              locality: 'Quận Cầu Giấy',
              region: 'Hà Nội',
              latitude: 21.0312,
              longitude: 105.7845,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
      },
    });

    // ========================================================
    // CASE 3: [ÁN MỜ] Cướp giật tài sản trước Tràng Tiền Plaza
    // ========================================================
    const caseCuopTrangTien = await prisma.event.create({
      data: {
        userId: user.id,
        title: 'Vụ án #2026-03: Cướp giật tài sản du khách trước Tràng Tiền Plaza',
        caseCode: 'CG-2026-05/HK',
        crimeType: 'Cướp giật tài sản',
        caseStatus: 'UNRESOLVED',
        category: 'Hình sự / Trật tự xã hội',
        status: 'ONGOING',
        startDate: new Date('2026-03-14T21:15:00.000Z'),
        hasTime: true,
        incidentTimeNotes: '21h15 tối ngày 14/03/2026',
        damageAssessment: '01 túi xách Chanel chứa 50 triệu VNĐ tiền mặt và 01 điện thoại iPhone 16 Pro Max',
        description:
          '### Tóm tắt vụ việc\n02 đối tượng đi xe máy Exciter côn tay không gương, tháo biển số, áp sát giật túi xách của nữ du khách quốc tế đang chụp ảnh tại ngã tư Hai Bà Trưng - Hàng Bài rồi phóng nhanh tẩu thoát về hướng cầu Chương Dương.',
        addresses: {
          create: [
            {
              type: 'work',
              streetLine1: 'Số 24 Phố Hai Bà Trưng, Phường Tràng Tiền',
              locality: 'Quận Hoàn Kiếm',
              region: 'Hà Nội',
              latitude: 21.0255,
              longitude: 105.8530,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
      },
    });

    // ========================================================
    // CASE 4: [ĐANG ĐIỀU TRA] Đường dây tiêu thụ tài sản gian Phố Huế
    // ========================================================
    const caseTieuThu = await prisma.event.create({
      data: {
        userId: user.id,
        title: 'Vụ án #2026-04: Đường dây tiêu thụ tài sản gian & Cho vay nặng lãi Phố Huế',
        caseCode: 'KT-2026-03/HBT',
        crimeType: 'Lừa đảo / Tiêu thụ tài sản gian',
        caseStatus: 'INVESTIGATING',
        category: 'Kinh tế / Tín dụng đen',
        status: 'PLANNED',
        startDate: new Date('2026-03-08T09:00:00.000Z'),
        hasTime: false,
        incidentTimeNotes: 'Hoạt động liên tục từ quý 4/2025 đến nay',
        damageAssessment: 'Dòng tiền giao dịch phi pháp ước tính trên 15 tỷ VNĐ',
        description:
          '### Chuyên án trinh sát\nCơ sở cầm đồ Ánh Mai tại 215 Phố Huế do Đặng Thị Mai làm chủ thu mua vàng trộm cắp nấu chảy và cho vay nặng lãi siết nợ người dân.',
        groups: { create: [{ groupId: fenceRingGroup.id }] },
        addresses: {
          create: [
            {
              type: 'work',
              streetLine1: 'Số 215 Phố Huế, Phường Phố Huế',
              locality: 'Quận Hai Bà Trưng',
              region: 'Hà Nội',
              latitude: 21.0165,
              longitude: 105.8515,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
      },
    });

    // ========================================================
    // CASE 5: [ĐÃ LÀM RÕ] Vụ cạy két sắt Công ty Vận tải Bắc Hà
    // ========================================================
    const caseLongBienClosed = await prisma.event.create({
      data: {
        userId: user.id,
        title: 'Vụ án #2025-11: Cạy két sắt Công ty Vận tải Bắc Hà (Đã kết luận)',
        caseCode: 'TH-2025-88/LB',
        crimeType: 'Trộm cắp tài sản',
        caseStatus: 'SOLVED',
        category: 'Hình sự / Trật tự xã hội',
        status: 'COMPLETED',
        startDate: new Date('2025-11-12T03:00:00.000Z'),
        endDate: new Date('2025-12-20T17:00:00.000Z'),
        hasTime: true,
        incidentTimeNotes: '03h00 sáng ngày 12/11/2025',
        damageAssessment: 'Đã thu hồi nguyên vẹn 1,2 tỷ VNĐ tiền mặt và 03 sổ tiết kiệm',
        description:
          'Vụ cạy két sắt tại Long Biên tháng 11/2025. Đã bắt giữ các đối tượng và thu hồi toàn bộ tang vật trao trả doanh nghiệp.',
        addresses: {
          create: [
            {
              type: 'work',
              streetLine1: 'Số 410 Phố Nguyễn Văn Cừ, Phường Ngọc Lâm',
              locality: 'Quận Long Biên',
              region: 'Hà Nội',
              latitude: 21.0468,
              longitude: 105.8795,
              geocodeStatus: 'success',
              geocodedAt: new Date(),
            },
          ],
        },
      },
    });

    console.log('✓ Đã tạo 5 hồ sơ Vụ án (2 Án mờ chưa rõ đối tượng, 2 Đang điều tra, 1 Đã kết luận)');

    // 9. Link Cross-Case Relationships
    await prisma.eventRelationship.createMany({
      data: [
        {
          fromEventId: caseKimBao.id,
          toEventId: caseCauGiay.id,
          relationshipType: 'Cùng phương thức thủ đoạn (MO)',
          notes: 'Cả 2 vụ đều ngắt nguồn dự phòng báo động hồng ngoại và dùng xe bán tải Ford Ranger đen tẩu thoát lúc rạng sáng.',
        },
        {
          fromEventId: caseKimBao.id,
          toEventId: caseTieuThu.id,
          relationshipType: 'Đường dây tiêu thụ tang vật',
          notes: 'Vàng SJC lấy cắp tại Tiệm vàng Kim Bảo nghi vấn chuyển về Tiệm cầm đồ Ánh Mai để nấu chảy.',
        },
      ],
    });

    // 10. Link Suspects & People to Cases (PersonEvent with Hypotheses, Reasons, and Alibis)
    await prisma.personEvent.createMany({
      data: [
        // Case 1: Tiệm vàng Kim Bảo
        {
          eventId: caseKimBao.id,
          personId: hungSoi.id,
          involvementType: 'SUSPECT',
          verificationStatus: 'INVESTIGATING',
          confidence: 'HIGH',
          role: 'Chủ mưu trực tiếp đột nhập',
          reasonForSuspicion: 'Dấu giày cỡ 42 khớp tại hiện trường, trạm BTS ghi nhận số điện thoại phụ lúc 02h15',
          alibi: 'Khai ở nhà ngủ tại Bồ Đề nhưng không có người làm chứng',
          notes: 'Cần trích xuất thêm camera ngã tư Đào Duy Từ',
        },
        {
          eventId: caseKimBao.id,
          personId: haiCan.id,
          involvementType: 'SUSPECT',
          verificationStatus: 'INVESTIGATING',
          confidence: 'HIGH',
          role: 'Kỹ thuật ngắt báo động & giải mã két',
          reasonForSuspicion: 'Mã kỹ thuật nội bộ của hộp báo động bị vô hiệu hóa chính xác, chuyên môn của Hải Cận',
          alibi: 'Khai sửa đồ điện tử qua đêm tại tiệm',
        },
        {
          eventId: caseKimBao.id,
          personId: tuanXe.id,
          involvementType: 'ACCOMPLICE',
          verificationStatus: 'CONFIRMED',
          confidence: 'HIGH',
          role: 'Tài xế cảnh giới & Tẩu thoát',
          reasonForSuspicion: 'Xe Ford Ranger 29H-512.68 xuất hiện trên camera ngã tư Đinh Liệt lúc 02h42',
          alibi: 'Đã xác minh lời khai ngoại phạm là giả mạo',
        },
        {
          eventId: caseKimBao.id,
          personId: thaoNgan.id,
          involvementType: 'PERSON_OF_INTEREST',
          verificationStatus: 'HYPOTHESIS',
          confidence: 'MEDIUM',
          role: 'Nghi vấn nội gián cung cấp mã kỹ thuật',
          reasonForSuspicion: 'Nợ tiền lãi 350 triệu của Mai Vàng trước ngày xảy ra vụ án',
          alibi: 'Khai ở phòng trọ ngủ cùng bạn gái',
        },
        {
          eventId: caseKimBao.id,
          personId: binhXeOm.id,
          involvementType: 'WITNESS',
          verificationStatus: 'CONFIRMED',
          confidence: 'HIGH',
          role: 'Nhân chứng cung cấp camera hành trình',
        },
        {
          eventId: caseKimBao.id,
          personId: namBeo.id,
          involvementType: 'SUSPECT',
          verificationStatus: 'RULED_OUT',
          confidence: 'HIGH',
          role: 'Nghi vấn ban đầu (Đã loại trừ)',
          reasonForSuspicion: 'Có tiền án trộm cắp tài sản trên địa bàn',
          alibi: 'Đang nằm viện cấp cứu mổ ruột thừa tại BV Đức Giang từ 03/03 đến 07/03/2026',
        },

        // Case 2: Kho linh kiện Cầu Giấy
        {
          eventId: caseCauGiay.id,
          personId: khanhChot.id,
          involvementType: 'SUSPECT',
          verificationStatus: 'CONFIRMED',
          confidence: 'HIGH',
          role: 'Chỉ đạo cắt khóa & Bốc dỡ hàng',
          reasonForSuspicion: 'Camera nhận diện vết sẹo khóe mắt và dáng đi khập khiễng',
          alibi: 'Khai đi ăn đêm tại Xuân Thủy',
        },
        {
          eventId: caseCauGiay.id,
          personId: kietLun.id,
          involvementType: 'ACCOMPLICE',
          verificationStatus: 'INVESTIGATING',
          confidence: 'HIGH',
          role: 'Bốc xếp lô máy tính ThinkPad',
          reasonForSuspicion: 'Đi xe SH đen nhám 29S1-778.89 đón Khánh Chột',
        },
        {
          eventId: caseCauGiay.id,
          personId: ducDen.id,
          involvementType: 'ACCOMPLICE',
          verificationStatus: 'INVESTIGATING',
          confidence: 'HIGH',
          role: 'Đầu mối tiêu thụ iPhone và Laptop',
          reasonForSuspicion: 'Phát hiện 05 máy iPhone tang vật đang được rao bán tại tiệm Đức Mobile',
        },

        // Case 3: Cướp giật Tràng Tiền
        {
          eventId: caseCuopTrangTien.id,
          personId: loiBua.id,
          involvementType: 'SUSPECT',
          verificationStatus: 'HYPOTHESIS',
          confidence: 'MEDIUM',
          role: 'Nghi vấn điều khiển xe Exciter cướp giật',
          reasonForSuspicion: 'Nhân dạng sẹo lồi ở cằm và phương tiện Exciter đỏ đen trùng khớp lời khai bị hại',
          alibi: 'Chưa có người làm chứng cho khoảng thời gian 21h-22h ngày 14/03',
        },

        // Case 4: Tiêu thụ tài sản gian Phố Huế
        {
          eventId: caseTieuThu.id,
          personId: maiVang.id,
          involvementType: 'SUSPECT',
          verificationStatus: 'INVESTIGATING',
          confidence: 'HIGH',
          role: 'Chủ mưu thu mua vàng trộm cắp',
          reasonForSuspicion: 'Lò nấu kim hoàn hoạt động bí mật sau nửa đêm',
        },
        {
          eventId: caseTieuThu.id,
          personId: vanTinDung.id,
          involvementType: 'ACCOMPLICE',
          verificationStatus: 'INVESTIGATING',
          confidence: 'HIGH',
          role: 'Thu nợ lãi cao và đe dọa các con nợ',
        },

        // Case 5: Cạy két sắt Bắc Hà Long Biên (Solved)
        {
          eventId: caseLongBienClosed.id,
          personId: hungSoi.id,
          involvementType: 'SUSPECT',
          verificationStatus: 'CONFIRMED',
          confidence: 'HIGH',
          role: 'Thủ phạm đã thừa nhận hành vi',
        },
      ],
    });

    console.log('✓ Đã tạo 14 liên kết đối tượng vào các vụ án kèm căn cứ nghi vấn & ngoại phạm');

    // 11. Create Sample Investigation Log (JournalEntry)
    await prisma.journalEntry.create({
      data: {
        userId: user.id,
        title: 'Báo cáo trinh sát thực địa: Khoanh vùng các ổ nhóm nghi vấn quanh phố Hàng Bạc',
        date: new Date('2026-03-06T10:00:00.000Z'),
        hasTime: true,
        body: `### Kết quả rà soát địa bàn quanh Tiệm vàng Kim Bảo\n1. Sử dụng công cụ **Smart Matcher (Khoanh vùng nghi phạm)** trong bán kính 1.5km:\n- Phát hiện đối tượng **Trần Văn Tặc (Tặc Mắt Lé)** cư trú tại 22 Hàng Bạc (cách hiện trường 50m), có tiền án trộm cắp cạy khóa.\n- Đối tượng **Nguyễn Văn Hùng (Hùng Sói)** và **Lê Hoàng Hải (Hải Cận)** có nhiều dấu hiệu nghi vấn về kỹ thuật mở két và phương tiện bán tải.\n\n2. Đề xuất: Phối hợp Công an phường Hàng Buồm và Hàng Bạc gọi hỏi răn đe, xác minh di biến động trong đêm 05/03/2026.`,
        people: {
          create: [{ personId: hungSoi.id }, { personId: haiCan.id }, { personId: tacMatLe.id }],
        },
        events: {
          create: [{ eventId: caseKimBao.id }],
        },
      },
    });

    console.log('✓ Đã tạo nhật ký điều tra liên kết Vụ án và Đối tượng');
  }

  console.log('\n🎉 Hoàn thành nạp dữ liệu mẫu điều tra chuyên nghiệp (5 vụ án & 22 đối tượng)!');
  console.log('\nThông tin đăng nhập Demo:');
  console.log('📧 Email:    demo@nametag.one');
  console.log('🔑 Mật khẩu: password123');
  console.log('🌐 Ngôn ngữ: Tiếng Việt (vi-VN)');

  // Disconnect after successful seed
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Lỗi khi khởi tạo dữ liệu mẫu:', e);
  process.exit(1);
});
