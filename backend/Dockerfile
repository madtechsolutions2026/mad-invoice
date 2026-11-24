FROM node:20-alpine

WORKDIR /app

# Install OpenSSL required by Prisma engine on Alpine
RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY package.json ./
COPY prisma ./prisma/

# Install production dependencies and generate Prisma client
RUN npm install --omit=dev --no-audit --no-fund && \
    npx prisma generate && \
    npm cache clean --force && \
    rm -rf /root/.npm /tmp/*

COPY dist ./dist
COPY src/assets ./src/assets

RUN mkdir -p storage/invoices storage/batches

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
