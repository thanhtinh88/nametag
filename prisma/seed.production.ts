import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Construct DATABASE_URL from individual DB_* variables if not set
if (!process.env.DATABASE_URL) {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (DB_HOST && DB_PORT && DB_NAME && DB_USER) {
    const password = DB_PASSWORD ? `:${DB_PASSWORD}` : '';
    process.env.DATABASE_URL = `postgresql://${DB_USER}${password}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  }
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

// Default relationship types configuration for criminal investigation
const DEFAULT_RELATIONSHIP_TYPES = [
  // 1. Tội phạm / Băng nhóm
  { name: 'LEADER', label: 'Cầm đầu / Chỉ đạo', category: 'CRIMINAL', directionType: 'DIRECTED', color: '#DC2626', inverseName: 'SUBORDINATE' },
  { name: 'SUBORDINATE', label: 'Đàn em / Thuộc cấp', category: 'CRIMINAL', directionType: 'DIRECTED', color: '#EA580C', inverseName: 'LEADER' },
  { name: 'ACCOMPLICE', label: 'Đồng phạm', category: 'CRIMINAL', directionType: 'BIDIRECTIONAL', color: '#7C3AED', inverseName: 'ACCOMPLICE' },
  { name: 'PROTECTOR', label: 'Bảo kê', category: 'CRIMINAL', directionType: 'DIRECTED', color: '#D97706', inverseName: 'PROTECTED' },
  { name: 'PROTECTED', label: 'Được bảo kê', category: 'CRIMINAL', directionType: 'DIRECTED', color: '#F59E0B', inverseName: 'PROTECTOR' },
  { name: 'BROKER', label: 'Môi giới / Chân rết', category: 'CRIMINAL', directionType: 'BIDIRECTIONAL', color: '#9333EA', inverseName: 'BROKER' },

  // 2. Dòng tiền / Tài sản
  { name: 'FUNDER', label: 'Cung cấp vốn / Chuyển tiền', category: 'FINANCIAL', directionType: 'DIRECTED', color: '#15803D', inverseName: 'RECEIVER' },
  { name: 'RECEIVER', label: 'Nhận tiền', category: 'FINANCIAL', directionType: 'DIRECTED', color: '#0D9488', inverseName: 'FUNDER' },
  { name: 'NOMINEE', label: 'Đứng tên hộ tài sản / Mượn tài khoản', category: 'FINANCIAL', directionType: 'DIRECTED', color: '#0284C7', inverseName: 'BENEFICIAL_OWNER' },
  { name: 'BENEFICIAL_OWNER', label: 'Chủ thực tế tài sản', category: 'FINANCIAL', directionType: 'DIRECTED', color: '#0369A1', inverseName: 'NOMINEE' },
  { name: 'MONEY_LAUNDERER', label: 'Rửa tiền cho', category: 'FINANCIAL', directionType: 'DIRECTED', color: '#047857', inverseName: 'LAUNDERED_FOR' },
  { name: 'LAUNDERED_FOR', label: 'Được rửa tiền bởi', category: 'FINANCIAL', directionType: 'DIRECTED', color: '#065F46', inverseName: 'MONEY_LAUNDERER' },

  // 3. Gia đình / Thân tộc
  { name: 'SPOUSE', label: 'Vợ / Chồng', category: 'FAMILY', directionType: 'BIDIRECTIONAL', color: '#DB2777', inverseName: 'SPOUSE' },
  { name: 'PARENT', label: 'Cha / Mẹ', category: 'FAMILY', directionType: 'DIRECTED', color: '#EAB308', inverseName: 'CHILD' },
  { name: 'CHILD', label: 'Con cái', category: 'FAMILY', directionType: 'DIRECTED', color: '#CA8A04', inverseName: 'PARENT' },
  { name: 'SIBLING', label: 'Anh / Chị / Em', category: 'FAMILY', directionType: 'BIDIRECTIONAL', color: '#4F46E5', inverseName: 'SIBLING' },
  { name: 'RELATIVE', label: 'Họ hàng / Thân tộc', category: 'FAMILY', directionType: 'BIDIRECTIONAL', color: '#8B5CF6', inverseName: 'RELATIVE' },

  // 4. Tố tụng / Vụ án
  { name: 'VICTIM', label: 'Bị hại', category: 'LEGAL_CASE', directionType: 'DIRECTED', color: '#991B1B', inverseName: 'PERPETRATOR' },
  { name: 'PERPETRATOR', label: 'Đối tượng gây hại', category: 'LEGAL_CASE', directionType: 'DIRECTED', color: '#EF4444', inverseName: 'VICTIM' },
  { name: 'WITNESS', label: 'Người làm chứng', category: 'LEGAL_CASE', directionType: 'BIDIRECTIONAL', color: '#0284C7', inverseName: 'WITNESS' },
  { name: 'INFORMANT', label: 'Người tố giác', category: 'LEGAL_CASE', directionType: 'DIRECTED', color: '#D97706', inverseName: 'ACCUSED' },
  { name: 'ACCUSED', label: 'Bị tố giác', category: 'LEGAL_CASE', directionType: 'DIRECTED', color: '#B45309', inverseName: 'INFORMANT' },

  // 5. Xã hội / Tiền án
  { name: 'PRISON_MATE', label: 'Cùng chấp hành án tù', category: 'SOCIAL', directionType: 'BIDIRECTIONAL', color: '#4B5563', inverseName: 'PRISON_MATE' },
  { name: 'SUBSTANCE_PEER', label: 'Cùng sử dụng ma túy / Bạn nghiện', category: 'SOCIAL', directionType: 'BIDIRECTIONAL', color: '#374151', inverseName: 'SUBSTANCE_PEER' },
  { name: 'ONLINE_CONTACT', label: 'Quen biết qua mạng', category: 'SOCIAL', directionType: 'BIDIRECTIONAL', color: '#2563EB', inverseName: 'ONLINE_CONTACT' },
  { name: 'NEIGHBOR', label: 'Đồng hương / Hàng xóm', category: 'SOCIAL', directionType: 'BIDIRECTIONAL', color: '#059669', inverseName: 'NEIGHBOR' },
  { name: 'FRIEND', label: 'Bạn bè', category: 'SOCIAL', directionType: 'BIDIRECTIONAL', color: '#3B82F6', inverseName: 'FRIEND' },
  { name: 'OTHER', label: 'Quan hệ khác', category: 'SOCIAL', directionType: 'BIDIRECTIONAL', color: '#6B7280', inverseName: 'OTHER' },
];

async function createDefaultRelationshipTypes(userId: string, userEmail: string) {
  console.log(`  Creating investigation relationship types for user: ${userEmail}`);

  // Create all relationship types first
  const createdTypes = new Map<string, string>(); // name -> id

  for (const type of DEFAULT_RELATIONSHIP_TYPES) {
    const created = await prisma.relationshipType.create({
      data: {
        userId,
        name: type.name,
        label: type.label,
        category: type.category,
        directionType: type.directionType,
        lineStyle: 'SOLID',
        color: type.color,
      },
    });
    createdTypes.set(type.name, created.id);
  }

  // Set inverse relationships
  for (const type of DEFAULT_RELATIONSHIP_TYPES) {
    const typeId = createdTypes.get(type.name);
    const inverseId = createdTypes.get(type.inverseName);

    if (typeId && inverseId) {
      await prisma.relationshipType.update({
        where: { id: typeId },
        data: { inverseId },
      });
    }
  }

  console.log(`  ✓ Created ${DEFAULT_RELATIONSHIP_TYPES.length} investigation relationship types`);
}

async function main() {
  console.log('🌱 Starting production seed - relationship types...\n');

  // Find all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      relationshipTypes: {
        select: { id: true },
      },
    },
  });

  if (users.length === 0) {
    console.log('ℹ️  No users found in database. Relationship types will be created when users register.');
    return;
  }

  console.log(`Found ${users.length} user(s) in database\n`);

  let processedCount = 0;
  let skippedCount = 0;

  // Process each user
  for (const user of users) {
    if (user.relationshipTypes.length > 0) {
      console.log(`  Skipping user ${user.email} - already has ${user.relationshipTypes.length} relationship types`);
      skippedCount++;
      continue;
    }

    await createDefaultRelationshipTypes(user.id, user.email);
    processedCount++;
  }

  console.log('\n🎉 Production seed completed!');
  console.log(`   Users processed: ${processedCount}`);
  console.log(`   Users skipped: ${skippedCount}`);

  if (processedCount > 0) {
    console.log(`\n✅ Created default relationship types for ${processedCount} user(s)`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
