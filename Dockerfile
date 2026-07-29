FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/cms/package.json apps/cms/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
# NEXT_PUBLIC_API_URL: آدرسی که مرورگر صدا می‌زند (در production نسبیِ «/api»).
# INTERNAL_API_URL: مقصدِ rewrite و fetchهای سمت‌سرور؛ داخل routes-manifest بیک می‌شود
# پس باید در زمان build موجود باشد. CapRover env varهای اپ را به‌صورت build-arg پاس می‌دهد.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG INTERNAL_API_URL=http://localhost:3001
ENV INTERNAL_API_URL=$INTERNAL_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# پیش‌فرضِ آدرسِ داخلی برای fetchهای سمت‌سرور در زمان اجرا (CapRover می‌تواند override کند).
ENV INTERNAL_API_URL=http://localhost:3001
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/turbo.json ./turbo.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages
EXPOSE 3000 3001
CMD ["npm", "run", "start"]
