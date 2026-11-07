export interface GangMemberPerson {
  id: string;
  name: string;
  surname?: string | null;
  nickname?: string | null;
  photo?: string | null;
  managementLevel?: string | null;
  threatLevel?: string | null;
}

export interface GangMember {
  id: string;
  gangId: string;
  personId: string;
  role: string;
  notes?: string | null;
  joinedAt?: string | null;
  leftAt?: string | null;
  createdAt: string;
  person?: GangMemberPerson | null;
}

export interface Gang {
  id: string;
  name: string;
  description?: string | null;
  turf?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
  members: GangMember[];
}

export interface CreateGangRequest {
  name: string;
  description?: string | null;
  turf?: string | null;
  color?: string | null;
}

export interface UpdateGangRequest {
  name?: string;
  description?: string | null;
  turf?: string | null;
  color?: string | null;
}

export interface AddGangMemberRequest {
  personId: string;
  role?: string;
  notes?: string | null;
  joinedAt?: string | null;
  leftAt?: string | null;
}

export interface GangListResponse {
  gangs: Gang[];
}

export interface SingleGangResponse {
  gang: Gang;
}

export interface GangMemberResponse {
  membership: GangMember;
}

