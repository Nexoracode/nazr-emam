import type { ID, ISODate } from './api';

export type TicketStatus = 'open' | 'answered' | 'closed';

export interface CreateTicketRequest {
  subject: string;
  body: string;
  guestMobile?: string | null;
  nazrRequestTrackingCode?: string | null;
}

export interface Ticket {
  id: ID;
  userId: ID | null;
  guestMobile: string | null;
  subject: string;
  status: TicketStatus;
  nazrRequestId: ID | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: ID;
  body: string;
  authorType: 'user' | 'support';
  createdAt: ISODate;
}

export interface NotificationItem {
  id: ID;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: ISODate;
}

export interface CreateNotificationRequest {
  userId?: ID | null;
  title: string;
  body: string;
  link?: string | null;
}
