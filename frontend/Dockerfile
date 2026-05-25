FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runner: minimal standalone image (Cloud Run friendly) ──
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0
RUN addgroup -S compound && adduser -S compound -G compound
COPY --from=build /app/public ./public
COPY --from=build --chown=compound:compound /app/.next/standalone ./
COPY --from=build --chown=compound:compound /app/.next/static ./.next/static
USER compound
EXPOSE 3000
# Cloud Run sets PORT; default to 3000 locally.
CMD ["sh", "-c", "PORT=${PORT:-3000} node server.js"]
