# ============================================================================
# Frontend Dockerfile - React (Vite) SPA
# Practical 11: Containerization with Docker and Docker Compose
# Supplementary Problem: Multi-stage build to reduce final image size
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Build Environment
# Compiles React JSX and assets into optimized static bundle
# ----------------------------------------------------------------------------
FROM node:18-alpine AS build

WORKDIR /app

# Copy package specifications first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies inside Linux container
RUN npm install

# Copy frontend source files (node_modules excluded via .dockerignore)
COPY . .

# Build production bundle into /app/dist
RUN npm run build

# ----------------------------------------------------------------------------
# Stage 2: Production Runtime
# Serves the built assets using Vite preview with minimal footprint
# ----------------------------------------------------------------------------
FROM node:18-alpine AS runner

WORKDIR /app

# Copy package definitions and install runtime preview tooling
COPY package*.json ./
RUN npm install

# Copy compiled static assets and Vite server configuration from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/vite.config.js ./vite.config.js

# Expose Vite default port
EXPOSE 5173

# Run Vite preview listening on all host interfaces (0.0.0.0)
CMD ["npm", "run", "preview", "--", "--host"]
