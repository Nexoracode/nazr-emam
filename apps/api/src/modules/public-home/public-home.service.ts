import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  GalleryAsset,
  Money,
  PublicHomeData,
  PublicHomeFaqItem,
  PublicHomeWhyCard,
} from '@nazr-emam/shared';
import { Repository } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { NazrRequestEntity } from '../nazr-requests/entities/nazr-request.entity';
import { NazrTypeEntity } from '../nazr-types/entities/nazr-type.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { GalleryAssetEntity } from '../profile/entities/gallery-asset.entity';

const TOMAN: Money['currency'] = 'IRT';

const WHY_CARDS: PublicHomeWhyCard[] = [
  {
    title: 'شفاف و قابل پیگیری',
    text: 'هر نذر کد رهگیری دارد و گزارش اجرای آن در دسترس مشارکت‌کننده قرار می‌گیرد.',
    icon: 'shield',
  },
  {
    title: 'انتخاب مسیر با خودت',
    text: 'طرح‌های مشخص به‌همراه باکس آزاد؛ مبلغ و مقصد نذر با انتخاب توست.',
    icon: 'compass',
    featured: true,
  },
  {
    title: 'اثری ماندگار و معنوی',
    text: 'مشارکت در باقیات الصالحات؛ سرمایه‌گذاری روی ذهن و نسل آینده.',
    icon: 'legacy',
  },
  {
    title: 'پرداخت آسان و منظم',
    text: 'درگاه، کارت‌به‌کارت و کیف پول برای مشارکت ماهانه و بدون دردسر.',
    icon: 'wallet',
  },
  {
    title: 'همراهی و پشتیبانی',
    text: 'تیم پاسخگویی و پیگیری کنار توست تا مسیر نذر همیشه روشن بماند.',
    icon: 'support',
  },
  {
    title: 'باشگاه مشارکت‌کنندگان',
    text: 'با تداوم مشارکت، امتیاز و ماموریت‌های ویژه برایت فعال می‌شود.',
    icon: 'club',
  },
];

const FAQS: PublicHomeFaqItem[] = [
  {
    question: 'نذر امام دقیقاً چیست؟',
    answer:
      'نذر امام یعنی اختصاص درصدی از درآمدت یا مبلغ دلخواه به مسیرهای فرهنگی مشخص، به نیت سربازی امام زمان (عج). این مبلغ در طرحی که خودت انتخاب می‌کنی هزینه و گزارش می‌شود.',
  },
  {
    question: 'پول من دقیقاً خرج چه می‌شود؟',
    answer:
      'هر طرح مسیر مصرف روشنی دارد؛ از نشر کلام امیرالمؤمنین در کشورهای دیگر تا چاپ و گردش کتاب میان نوجوانان مناطق محروم. گزارش اجرای هر طرح در دسترس قرار می‌گیرد.',
  },
  {
    question: 'بعد از پرداخت چطور پیگیری کنم؟',
    answer:
      'پس از پرداخت موفق، کد رهگیری دریافت می‌کنی و از پنل کاربری، وضعیت نذر و ریز واریزهایت را می‌بینی.',
  },
  {
    question: 'می‌توانم به صورت ماهانه مشارکت کنم؟',
    answer:
      'بله؛ با کیف پول یک‌بار شارژ می‌کنی و مبلغ نذر هر ماه به صورت منظم کسر می‌شود تا نیازی به پرداخت دستی هر ماه نباشد.',
  },
  {
    question: 'اگر هزینه یک طرح تکمیل شود چه می‌شود؟',
    answer:
      'طرح تکمیل‌شده از حالت مشارکت خارج و خاموش می‌شود و طرح‌های فعال دیگر برای انتخاب نمایش داده می‌شوند.',
  },
  {
    question: 'اگر نخواهم مسیر مشخصی انتخاب کنم؟',
    answer:
      'باکس آزاد برای همین است؛ مبلغ را می‌سپاری و تیم آن را در اولویت‌دارترین مسیرهای فرهنگی هزینه می‌کند.',
  },
];

@Injectable()
export class PublicHomeService {
  constructor(
    @InjectRepository(UserEntity) private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(NazrRequestEntity) private readonly requestsRepo: Repository<NazrRequestEntity>,
    @InjectRepository(NazrTypeEntity) private readonly nazrTypesRepo: Repository<NazrTypeEntity>,
    @InjectRepository(PaymentEntity) private readonly paymentsRepo: Repository<PaymentEntity>,
    @InjectRepository(GalleryAssetEntity) private readonly galleryRepo: Repository<GalleryAssetEntity>,
  ) {}

  async getHome(): Promise<PublicHomeData> {
    const [users, requests, paidPayments, nazrTypes, introMedia, galleryMedia] =
      await Promise.all([
        this.usersRepo.count({ where: { role: 'donor' } }),
        this.requestsRepo.find({ relations: { nazrType: true } }),
        this.paymentsRepo.find({
          where: { status: 'paid' },
          relations: { nazrRequest: true },
        }),
        this.nazrTypesRepo.find({ order: { createdAt: 'ASC' } }),
        this.galleryRepo.find({
          where: { placement: 'intro' },
          order: { createdAt: 'DESC' },
        }),
        this.galleryRepo.find({
          where: { placement: 'gallery' },
          order: { createdAt: 'DESC' },
        }),
      ]);

    const activePlans = nazrTypes.filter((item) => item.isActive).length;
    const completedRequests = requests.filter((item) =>
      ['confirmed', 'in_progress', 'completed'].includes(item.status),
    ).length;
    const paidAmount = this.sumMoney(paidPayments.map((item) => item.amount));
    const galleryVideos = galleryMedia.filter(
      (item) => item.type === 'video' && Boolean(item.fileUrl),
    );
    const galleryImages = galleryMedia
      .filter((item) => item.type === 'image' && Boolean(item.fileUrl))
      .slice(0, 4);

    return {
      hero: {
        eyebrow: 'سامانه‌ی شفافِ ثبت و پیگیریِ نذر',
        titleLines: ['نذرِ امام؛', 'مسیرِ روشن برای نیت‌های ماندگار'],
        lead:
          'در نذر امام، درصدی از درآمدت را به مسیرهای فرهنگیِ مشخص می‌سپاری؛ از انتخاب طرح تا پرداخت، کد رهگیری و گزارشِ اجرا، همه‌چیز شفاف و قابل پیگیری است.',
        percentOptions: ['۱٪', '۳٪', '۵٪'],
      },
      whyCards: WHY_CARDS,
      stats: [
        { value: this.formatNumber(users), label: 'مخاطب ثبت‌نام‌شده' },
        { value: this.formatNumber(activePlans), label: 'طرح فعال' },
        { value: this.formatNumber(requests.length), label: 'نذر ثبت‌شده' },
        { value: this.formatNumber(completedRequests), label: 'نذر تاییدشده' },
        { value: this.formatMoney(paidAmount), label: 'مجموع واریزی تاییدشده' },
        { value: this.formatNumber(galleryMedia.length), label: 'گزارش تصویری و ویدئویی' },
      ],
      faqs: FAQS,
      plans: nazrTypes.map((type) => {
        const planRequests = requests.filter((item) => item.nazrTypeId === type.id);
        const planPaid = paidPayments.filter(
          (payment) => payment.nazrRequest?.nazrTypeId === type.id,
        );
        const confirmed = planRequests.filter((item) =>
          ['confirmed', 'in_progress', 'completed'].includes(item.status),
        ).length;
        const progressPercent =
          planRequests.length === 0
            ? 0
            : Math.min(100, Math.round((confirmed / planRequests.length) * 100));
        return {
          id: type.id,
          slug: type.slug,
          title: type.title,
          description: type.description,
          suggestedAmount: type.suggestedAmount,
          isActive: type.isActive,
          createdAt: type.createdAt.toISOString(),
          updatedAt: type.updatedAt.toISOString(),
          requestCount: planRequests.length,
          paidAmount: this.sumMoney(planPaid.map((item) => item.amount)),
          progressPercent,
        };
      }),
      media: {
        introVideo: introMedia[0] ? this.toGalleryAsset(introMedia[0]) : null,
        galleryVideos: galleryVideos.map((item) => this.toGalleryAsset(item)),
        galleryImages: galleryImages.map((item) => this.toGalleryAsset(item)),
      },
      activePlans,
      updatedAt: new Date().toISOString(),
    };
  }

  private sumMoney(items: Money[]): Money {
    return {
      amount: items.reduce((sum, item) => sum + item.amount, 0),
      currency: items[0]?.currency ?? TOMAN,
    };
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('fa-IR').format(value);
  }

  private formatMoney(value: Money): string {
    const amount = new Intl.NumberFormat('fa-IR').format(value.amount);
    return `${amount} تومان`;
  }

  private toGalleryAsset(item: GalleryAssetEntity): GalleryAsset {
    return {
      id: item.id,
      nazrTypeId: item.nazrTypeId,
      title: item.title,
      type: item.type,
      placement: item.placement,
      fileUrl: item.fileUrl,
      thumbnailUrl: item.thumbnailUrl,
      createdAt: item.createdAt.toISOString(),
    };
  }
}
