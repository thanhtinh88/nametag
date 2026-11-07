export interface PersonSummary {
  id: string;
  name: string;
  surname?: string | null;
  nickname?: string | null;
  displayNameOverride?: string | null;
  photo?: string | null;
}

export interface PersonGroupMember {
  personId: string;
  groupId: string;
  addedAt: string;
  person?: PersonSummary | null;
}

export interface Group {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  people?: PersonGroupMember[];
}

export interface GroupListResponse {
  groups: Group[];
}

export interface GroupResponse {
  group: Group;
}

export interface CreateGroupRequest {
  name: string;
  description?: string | null;
  color?: string | null;
  peopleIds?: string[];
}

export interface UpdateGroupRequest {
  name: string;
  description?: string | null;
  color?: string | null;
}

export interface AddGroupMemberRequest {
  personId: string;
}

export interface GroupDeleteResponse {
  message: string;
}

export interface GroupPermanentDeleteResponse {
  success: boolean;
}

