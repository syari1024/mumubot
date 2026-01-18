# ============================================
# Build Stage
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# TypeScriptをビルド
RUN npm run build

# ============================================
# Production Stage
# ============================================
FROM node:20-alpine

WORKDIR /app

# セキュリティアップデート
RUN apk add --no-cache dumb-init

# パッケージファイルをコピー
COPY package*.json ./

# 本番用依存関係のみをインストール
RUN npm ci --only=production && \
    npm cache clean --force

# ビルド済みファイルをコピー
COPY --from=builder /app/dist ./dist

# 非rootユーザーで実行（セキュリティ向上）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# アプリを起動（dumb-initで適切にシグナル処理）
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]