const smallNumbers = [
  '', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه',
  'ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده',
  'هفده', 'هجده', 'نوزده',
];
const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const hundreds = [
  '', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد',
];
const scaleWords = ['', 'هزار', 'میلیون', 'میلیارد', 'هزار میلیارد'];

export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

export function formatAmountInput(value: string | number): string {
  const digits = normalizeDigits(String(value)).replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

export function parseAmountInput(value: string): number {
  return Number(normalizeDigits(value).replace(/[,\s]/g, ''));
}

function threeDigitsToWords(value: number): string {
  const parts: string[] = [];
  const hundred = Math.floor(value / 100);
  const rest = value % 100;

  if (hundred) parts.push(hundreds[hundred]);
  if (rest) {
    if (rest < 20) {
      parts.push(smallNumbers[rest]);
    } else {
      const ten = Math.floor(rest / 10);
      const one = rest % 10;
      parts.push(tens[ten]);
      if (one) parts.push(smallNumbers[one]);
    }
  }
  return parts.join(' و ');
}

export function amountToPersianWords(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  const groups: number[] = [];
  let remaining = Math.floor(value);
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }
  const words = groups
    .map((group, index) => {
      if (!group) return '';
      return [threeDigitsToWords(group), scaleWords[index]].filter(Boolean).join(' ');
    })
    .filter(Boolean)
    .reverse()
    .join(' و ');
  return `${words} تومان`;
}
