'use client';

import { useEffect } from 'react';

/**
 * اعداد فارسی در سراسر سایت:
 *  - نمایش: ارقامِ لاتینِ متنِ صفحه به فارسی تبدیل می‌شوند (به‌جز input/کد/...).
 *  - ورودی: ارقامِ فارسی/عربیِ تایپ‌شده در فیلدها به لاتین نرمال می‌شوند تا
 *    اعتبارسنجی (شماره، کد یکبار مصرف، مبلغ) درست کار کند.
 * اجرای سمت‌کلاینت بعد از mount است؛ محتوای SSR هم پوشش داده می‌شود.
 */

const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';

const toFa = (s: string) => s.replace(/[0-9]/g, (d) => FA[Number(d)]);

const toEn = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));

// عناصری که نباید متنشان تبدیل شود.
const SKIP_TAGS = new Set([
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'OPTION',
  'SCRIPT',
  'STYLE',
  'CODE',
  'PRE',
  'KBD',
]);

function skip(el: Element | null): boolean {
  if (!el) return true;
  if (SKIP_TAGS.has(el.tagName)) return true;
  return Boolean(el.closest('[data-latin]'));
}

function convertTextNode(node: Text) {
  const parent = node.parentElement;
  if (!parent || skip(parent)) return;
  const value = node.nodeValue;
  if (value && /[0-9]/.test(value)) {
    node.nodeValue = toFa(value);
  }
}

function convertTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    convertTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  if (skip(root as Element)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  nodes.forEach(convertTextNode);
}

export default function PersianNumerals() {
  useEffect(() => {
    convertTree(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          convertTextNode(mutation.target as Text);
        } else {
          mutation.addedNodes.forEach((n) => convertTree(n));
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // نرمال‌سازیِ ورودی‌ها: فارسی/عربی → لاتین (به‌شکلِ سازگار با React).
    const onInput = (event: Event) => {
      const el = event.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!el) return;
      const tag = el.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') return;
      const value = el.value;
      const normalized = toEn(value);
      if (normalized === value) return;
      const caret = el.selectionStart;
      const proto =
        tag === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) {
        setter.call(el, normalized);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        el.value = normalized;
      }
      if (caret !== null) {
        try {
          el.setSelectionRange(caret, caret);
        } catch {
          /* برخی نوع‌های input از انتخابِ محدوده پشتیبانی نمی‌کنند. */
        }
      }
    };
    document.addEventListener('input', onInput, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('input', onInput, true);
    };
  }, []);

  return null;
}
