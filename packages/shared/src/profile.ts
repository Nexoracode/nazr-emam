import type { ID, ISODate, Money, Paginated } from './api';
import type { Payment } from './payments';

export type UserPlatform =
  | 'eitaa'
  | 'instagram'
  | 'telegram'
  | 'whatsapp'
  | 'website'
  | 'other';

export interface UserProfileDetails {
  id: ID;
  fullName: string;
  mobile: string;
  eitaNumber: string | null;
  activePlatforms: UserPlatform[];
  motivationalTarget: string | null;
  createdAt: ISODate;
}

export interface UpdateUserProfileDetailsRequest {
  fullName?: string;
  mobile?: string;
  eitaNumber?: string | null;
  activePlatforms?: UserPlatform[];
}

export interface UpdateMotivationalTargetRequest {
  motivationalTarget: string | null;
}

export interface UserContributionByNazrType {
  nazrTypeId: ID;
  title: string;
  count: number;
  totalAmount: Money;
  sharePercent: number;
}

export interface UserContributionSummary {
  totalRequests: number;
  completedRequests: number;
  awaitingPaymentRequests: number;
  totalAmount: Money;
  byNazrType: UserContributionByNazrType[];
}

export interface UserProfileSummary {
  profile: UserProfileDetails;
  contributions: UserContributionSummary;
  payments: {
    totalPaidAmount: Money;
    totalPayments: number;
    recentPayments: Payment[];
  };
  club: UserClubStatus;
  unreadNotifications: number;
  openTickets: number;
}

export interface UserPaymentHistoryQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  from?: ISODate;
  to?: ISODate;
}

export type GalleryAssetType = 'image' | 'video';

export interface GalleryAsset {
  id: ID;
  nazrTypeId: ID | null;
  title: string;
  type: GalleryAssetType;
  fileUrl: string;
  thumbnailUrl: string | null;
  createdAt: ISODate;
}

export type WalletTransactionType = 'charge' | 'deduction' | 'payment' | 'refund';
export type WalletTransactionStatus = 'pending' | 'completed' | 'failed';

export interface Wallet {
  id: ID;
  userId: ID;
  balance: Money;
  isMonthlyDeductionEnabled: boolean;
  monthlyDeductionAmount: Money | null;
  nextMonthlyDeductionAt: ISODate | null;
  lastMonthlyDeductionAt: ISODate | null;
  updatedAt: ISODate;
}

export interface UpdateWalletSettingsRequest {
  isMonthlyDeductionEnabled: boolean;
  monthlyDeductionAmount?: Money | null;
}

export interface CreateWalletChargeRequest {
  amount: Money;
}

export interface StartWalletChargeResponse {
  transactionId: ID;
  paymentUrl: string;
  authority: string;
}

export interface WalletTransaction {
  id: ID;
  walletId: ID;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  amount: Money;
  description: string;
  transactionReference: string | null;
  createdAt: ISODate;
}

export type UserMissionStatus = 'available' | 'completed' | 'locked';

export interface UserMission {
  id: string;
  title: string;
  description: string;
  points: number;
  status: UserMissionStatus;
}

export interface UserClubStatus {
  level: string;
  points: number;
  joinedDays: number;
  missions: UserMission[];
}

export interface CreateInvitationCardRequest {
  friendName: string;
  friendMobile?: string | null;
}

export interface InvitationCard {
  id: ID;
  userId: ID;
  friendName: string;
  friendMobile: string | null;
  message: string;
  downloadText: string;
  createdAt: ISODate;
}

export type UserPaymentsResponse = Paginated<Payment>;
