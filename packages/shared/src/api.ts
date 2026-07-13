export type ID = string;
export type ISODate = string;

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Money {
  amount: number;
  currency: 'IRR' | 'IRT';
}

export interface HealthResponse {
  status: 'ok';
  service: 'nazr-emam-api';
  timestamp: ISODate;
}

export interface ProjectInfo {
  name: 'Nazr Emam';
  description: string;
  workflow: string[];
}
