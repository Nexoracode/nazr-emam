#!/bin/sh
set -e

# ─────────────────────────────────────────────────────────────
# پین‌کردنِ هاستِ سرویسِ پیامک در /etc/hosts
# سرورِ ایران (DNSِ شکن/…) روی lookupِ api.iranpayamak.com به‌صورت
# متناوب تایم‌اوت می‌دهد؛ خودِ endpoint سالم و سریع است. با pinِ IP،
# هر درخواستِ خروجی دیگر سراغِ resolverِ ناپایدارِ زمانِ اجرا نمی‌رود.
# اگر روزی IP سرویس عوض شد، مقدارِ زیر را با dig/getent به‌روز کنید.
# (همان الگوی اثبات‌شده‌ی پروژه‌ی rshop.)
# ─────────────────────────────────────────────────────────────
pin_host() {
  host="$1"; fallback="$2"
  grep -q "[[:space:]]${host}\$" /etc/hosts 2>/dev/null && return 0
  ip="$(getent hosts "$host" 2>/dev/null | awk '{print $1}' | head -1)"
  [ -z "$ip" ] && ip="$fallback"
  if [ -n "$ip" ]; then
    echo "$ip $host" >> /etc/hosts
    echo "📌 pinned $host -> $ip"
  fi
}

pin_host "api.iranpayamak.com" "188.121.115.52"
# زرین‌پال هاستِ بزرگ‌تری است؛ فقط اگر بوت resolve کرد pin می‌شود (بدون IPِ ثابت).
pin_host "payment.zarinpal.com" ""

exec npm run start
