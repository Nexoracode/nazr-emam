import type { ISODate, Money } from './api';
import type { NazrType } from './nazr';
import type { GalleryAsset } from './profile';

export type PublicHomeWhyIcon =
  | 'shield'
  | 'compass'
  | 'legacy'
  | 'wallet'
  | 'support'
  | 'club';

export interface PublicHomeHero {
  eyebrow: string;
  titleLines: string[];
  lead: string;
  percentOptions: string[];
}

export interface PublicHomeWhyCard {
  title: string;
  text: string;
  icon: PublicHomeWhyIcon;
  featured?: boolean;
}

export interface PublicHomeStat {
  value: string;
  label: string;
}

export interface PublicHomeFaqItem {
  question: string;
  answer: string;
}

export interface PublicHomePlan extends NazrType {
  requestCount: number;
  paidAmount: Money;
  progressPercent: number;
}

export interface PublicHomeMedia {
  introVideo: GalleryAsset | null;
  galleryVideo: GalleryAsset | null;
  galleryImages: GalleryAsset[];
}

export interface PublicHomeData {
  hero: PublicHomeHero;
  whyCards: PublicHomeWhyCard[];
  stats: PublicHomeStat[];
  faqs: PublicHomeFaqItem[];
  plans: PublicHomePlan[];
  media: PublicHomeMedia;
  activePlans: number;
  updatedAt: ISODate;
}
