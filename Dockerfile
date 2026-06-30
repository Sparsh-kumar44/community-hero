# ==========================================
# STAGE 1: Build React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Build Node Backend & Run
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

# Copy built frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Install backend dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production

# Copy backend server files
COPY backend/ ./

# Expose standard Cloud Run PORT (8080)
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

# Run command
CMD ["node", "server.js"]
