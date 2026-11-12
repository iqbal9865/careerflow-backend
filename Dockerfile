# syntax=docker/dockerfile:1

# ---------- Build stage: install all deps, generate Prisma client, compile TS ----------
FROM node:22-slim AS build
WORKDIR /app

# Prisma needs OpenSSL at generate/runtime on Debian slim
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Schema and Prisma config are needed by the `postinstall` (prisma generate) hook
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# Compile src/ into dist/ using the same build as everywhere else

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Drop devDependencies; the generated Prisma client in node_modules/.prisma is kept
RUN npm prune --omit=dev

# ---------- Runtime stage: small image, non-root user ----------
FROM node:22-slim AS runtime
WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||5000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
