FROM node:22-slim

WORKDIR /app

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files first for layer caching
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source
COPY tsconfig.json agents.yaml ./
COPY src ./src

# Build TypeScript
RUN npx tsc

# Copy prompts (needed at runtime)
COPY src/prompts ./dist/prompts

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Run with tsx for ESM support (prisma imports need it)
CMD ["npx", "tsx", "src/main.ts", "serve"]
