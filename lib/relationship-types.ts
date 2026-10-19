import { prisma as prismaClient } from './prisma';

// Type that accepts the extended prisma client
type PrismaClientLike = typeof prismaClient;

export type RelationshipCategory =
  | 'CRIMINAL'
  | 'FINANCIAL'
  | 'FAMILY'
  | 'LEGAL_CASE'
  | 'SOCIAL';

export type RelationshipDirection = 'DIRECTED' | 'BIDIRECTIONAL';
export type RelationshipLineStyle = 'SOLID' | 'DASHED' | 'DOTTED';

export interface PreloadedTypeConfig {
  name: string;
  label: string;
  category: RelationshipCategory;
  directionType: RelationshipDirection;
  lineStyle?: RelationshipLineStyle;
  color: string;
  inverseName?: string;
  symmetric?: boolean;
}

/**
 * Pre-loaded relationship types designed specifically for criminal investigation,
 * intelligence analysis, and subject link analysis.
 */
export const PRELOADED_RELATIONSHIP_TYPES: PreloadedTypeConfig[] = [
  // 1. Tội phạm / Băng nhóm
  { name: 'LEADER', label: 'Cầm đầu / Chỉ đạo', category: 'CRIMINAL', directionType: 'DIRECTED', color: '#DC2626', inverseName: 'SUBORDINATE' },
  { name: 'SUBORDINATE', label: 'Đàn em / Thuộc cấp', category: 'CRIMINAL', directionType: 'DIRECTED', color: '#EA580C', inverseName: 'LEADER' },
  { name: 'ACCOMPLICE', label: 'Đồng phạm', category: 'CRIMINAL', directionType: 'BIDIRECTIONAL', color: '#7C3AED', symmetric: true },
  { name: 'PROTECTOR', label: 'Bảo kê', category: 'CRIMINAL', directionType: 'DIRECTED', color: '#D97706', inverseName: 'PROTECTED' },
  { name: 'PROTECTED', label: 'Được bảo kê', category: 'CRIMINAL', directionType: 'DIRECTED', color: '#F59E0B', inverseName: 'PROTECTOR' },
  { name: 'BROKER', label: 'Môi giới / Chân rết', category: 'CRIMINAL', directionType: 'BIDIRECTIONAL', color: '#9333EA', symmetric: true },

  // 2. Dòng tiền / Tài sản
  { name: 'FUNDER', label: 'Cung cấp vốn / Chuyển tiền', category: 'FINANCIAL', directionType: 'DIRECTED', color: '#15803D', inverseName: 'RECEIVER' },
  { name: 'RECEIVER', label: 'Nhận tiền', category: 'FINANCIAL', directionType: 'DIRECTED', color: '#0D9488', inverseName: 'FUNDER' },
  { name: 'NOMINEE', label: 'Đứng tên hộ tài sản / Mượn tài khoản', category: 'FINANCIAL', directionType: 'DIRECTED', color: '#0284C7', inverseName: 'BENEFICIAL_OWNER' },
  { name: 'BENEFICIAL_OWNER', label: 'Chủ thực tế tài sản', category: 'FINANCIAL', directionType: 'DIRECTED', color: '#0369A1', inverseName: 'NOMINEE' },
  { name: 'MONEY_LAUNDERER', label: 'Rửa tiền cho', category: 'FINANCIAL', directionType: 'DIRECTED', color: '#047857', inverseName: 'LAUNDERED_FOR' },
  { name: 'LAUNDERED_FOR', label: 'Được rửa tiền bởi', category: 'FINANCIAL', directionType: 'DIRECTED', color: '#065F46', inverseName: 'MONEY_LAUNDERER' },

  // 3. Gia đình / Thân tộc
  { name: 'SPOUSE', label: 'Vợ / Chồng', category: 'FAMILY', directionType: 'BIDIRECTIONAL', color: '#DB2777', symmetric: true },
  { name: 'PARENT', label: 'Cha / Mẹ', category: 'FAMILY', directionType: 'DIRECTED', color: '#EAB308', inverseName: 'CHILD' },
  { name: 'CHILD', label: 'Con cái', category: 'FAMILY', directionType: 'DIRECTED', color: '#CA8A04', inverseName: 'PARENT' },
  { name: 'SIBLING', label: 'Anh / Chị / Em', category: 'FAMILY', directionType: 'BIDIRECTIONAL', color: '#4F46E5', symmetric: true },
  { name: 'RELATIVE', label: 'Họ hàng / Thân tộc', category: 'FAMILY', directionType: 'BIDIRECTIONAL', color: '#8B5CF6', symmetric: true },

  // 4. Tố tụng / Vụ án
  { name: 'VICTIM', label: 'Bị hại', category: 'LEGAL_CASE', directionType: 'DIRECTED', color: '#991B1B', inverseName: 'PERPETRATOR' },
  { name: 'PERPETRATOR', label: 'Đối tượng gây hại', category: 'LEGAL_CASE', directionType: 'DIRECTED', color: '#EF4444', inverseName: 'VICTIM' },
  { name: 'WITNESS', label: 'Người làm chứng', category: 'LEGAL_CASE', directionType: 'BIDIRECTIONAL', color: '#0284C7', symmetric: true },
  { name: 'INFORMANT', label: 'Người tố giác', category: 'LEGAL_CASE', directionType: 'DIRECTED', color: '#D97706', inverseName: 'ACCUSED' },
  { name: 'ACCUSED', label: 'Bị tố giác', category: 'LEGAL_CASE', directionType: 'DIRECTED', color: '#B45309', inverseName: 'INFORMANT' },

  // 5. Xã hội / Tiền án
  { name: 'PRISON_MATE', label: 'Cùng chấp hành án tù', category: 'SOCIAL', directionType: 'BIDIRECTIONAL', color: '#4B5563', symmetric: true },
  { name: 'SUBSTANCE_PEER', label: 'Cùng sử dụng ma túy / Bạn nghiện', category: 'SOCIAL', directionType: 'BIDIRECTIONAL', color: '#374151', symmetric: true },
  { name: 'ONLINE_CONTACT', label: 'Quen biết qua mạng', category: 'SOCIAL', directionType: 'BIDIRECTIONAL', color: '#2563EB', symmetric: true },
  { name: 'NEIGHBOR', label: 'Đồng hương / Hàng xóm', category: 'SOCIAL', directionType: 'BIDIRECTIONAL', color: '#059669', symmetric: true },
  { name: 'FRIEND', label: 'Bạn bè', category: 'SOCIAL', directionType: 'BIDIRECTIONAL', color: '#3B82F6', symmetric: true },
  { name: 'OTHER', label: 'Quan hệ khác', category: 'SOCIAL', directionType: 'BIDIRECTIONAL', color: '#6B7280', symmetric: true },
];

/**
 * Creates the pre-loaded relationship types for a user.
 * This should be called when a new user is created.
 */
export async function createPreloadedRelationshipTypes(
  prisma: PrismaClientLike,
  userId: string
): Promise<void> {
  const typeIdMap = new Map<string, string>();

  // First pass: create all types without inverse relationships
  for (const typeConfig of PRELOADED_RELATIONSHIP_TYPES) {
    const existing = await prisma.relationshipType.findFirst({
      where: { userId, name: typeConfig.name, deletedAt: null },
      select: { id: true },
    });

    if (existing) {
      typeIdMap.set(typeConfig.name, existing.id);
      continue;
    }

    const createdType = await prisma.relationshipType.create({
      data: {
        userId,
        name: typeConfig.name,
        label: typeConfig.label,
        category: typeConfig.category,
        directionType: typeConfig.directionType,
        lineStyle: typeConfig.lineStyle || 'SOLID',
        color: typeConfig.color,
      },
    });
    typeIdMap.set(typeConfig.name, createdType.id);
  }

  // Second pass: set up inverse relationships
  for (const typeConfig of PRELOADED_RELATIONSHIP_TYPES) {
    const typeId = typeIdMap.get(typeConfig.name);
    if (!typeId) continue;

    let inverseId: string | undefined;

    if ('symmetric' in typeConfig && typeConfig.symmetric) {
      inverseId = typeId;
    } else if ('inverseName' in typeConfig && typeConfig.inverseName) {
      inverseId = typeIdMap.get(typeConfig.inverseName);
    }

    if (inverseId) {
      await prisma.relationshipType.update({
        where: { id: typeId },
        data: { inverseId },
      });
    }
  }
}
