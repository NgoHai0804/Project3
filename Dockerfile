# Multi-stage build cho Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY backend/ .

# Multi-stage build cho Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Build arguments cho frontend
ARG VITE_API_URL=https://baitaplonweb20251.onrender.com
ARG VITE_SOCKET_URL=https://baitaplonweb20251.onrender.com

# Set environment variables cho build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ .

# Build frontend với production URL
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install production dependencies cho backend
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/src ./backend/src

# Copy built frontend (dist folder)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose ports
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Set working directory to backend
WORKDIR /app/backend

# Start backend server
CMD ["node", "src/server.js"]
