export interface UpcomingEvent {
  id: string;
  personId: string;
  personName: string;
  type: 'important_date' | 'contact_reminder';
  title: string | null;
  titleKey: 'timeToCatchUp' | null;
  date: string;
  daysUntil: number;
  isYearUnknown: boolean;
  personPhoto?: string | null;
}

export interface DashboardStats {
  upcomingEvents: UpcomingEvent[];
  peopleCount: number;
  groupsCount: number;
}

export interface DashboardCaseLink {
  eventId: string;
  eventTitle: string;
  eventStatus: string;
  involvementType?: string;
  verificationStatus?: string;
  confidence?: string | null;
  role?: string | null;
}

export interface DashboardGraphNode {
  id: string;
  label: string;
  groups: string[];
  colors: string[];
  isCenter: boolean;
  photo?: string | null;
  nodeType?: 'person' | 'event' | 'user';
  eventStatus?: string;
  managementLevel?: string | null;
  threatLevel?: string | null;
  residenceStatus?: string | null;
  gender?: string | null;
  hasCriminalRecord?: boolean;
  criminalRecordCharges?: string[];
  hasActiveConviction?: boolean;
  gangIds?: string[];
  gangRoles?: string[];
  hasSuspiciousVehicle?: boolean;
  vehicleTypes?: string[];
  markTypes?: string[];
  hasMuleAccount?: boolean;
  caseLinks?: DashboardCaseLink[];
}

export interface DashboardGraphEdge {
  source: string;
  target: string;
  type: string;
  color: string;
  sourceLabel?: string;
  targetLabel?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  verificationStatus?: string;
  confidence?: string;
  category?: string;
  directionType?: 'BIDIRECTIONAL' | 'DIRECTED';
  involvementType?: string;
}

export interface DashboardGraph {
  nodes: DashboardGraphNode[];
  edges: DashboardGraphEdge[];
}

