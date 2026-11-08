export type CustomFieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT';

export interface CustomFieldValueInput {
  templateId: string;
  value: string;
}

export interface CustomFieldTemplateCount {
  values: number;
}

export interface CustomFieldTemplate {
  id: string;
  name: string;
  slug: string;
  type: CustomFieldType;
  options: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  _count?: CustomFieldTemplateCount;
}

export interface CreateCustomFieldTemplateRequest {
  name: string;
  type: CustomFieldType;
  options?: string[];
}

export interface UpdateCustomFieldTemplateRequest {
  name?: string;
  options?: string[];
}

export interface ReorderCustomFieldTemplatesRequest {
  ids: string[];
}

export interface CustomFieldTemplateListResponse {
  templates: CustomFieldTemplate[];
}

export interface SingleCustomFieldTemplateResponse {
  template: CustomFieldTemplate;
}

