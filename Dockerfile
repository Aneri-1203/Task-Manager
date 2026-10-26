# ============================================================================
# Backend Dockerfile - Node.js Express API
# Practical 11: Containerization with Docker and Docker Compose
# ============================================================================

FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy dependency manifests first to take advantage of Docker layer caching
COPY package*.json ./

# Install dependencies inside the container environment
RUN npm install

# Copy backend source code (node_modules and .env excluded via .dockerignore)
COPY . .

# Expose the API server port (documentation and internal container communication)
EXPOSE 5000

# Default environment configuration
ENV PORT=5000
ENV NODE_ENV=production

# Command to launch the Express backend
CMD ["node", "server.js"]
