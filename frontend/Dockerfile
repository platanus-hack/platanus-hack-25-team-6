# Build stage - use full node image which includes build tools
FROM node:22 AS builder

# Set working directory
WORKDIR /app

# Copy only package.json (not the lock file to force fresh install for Linux)
COPY package.json ./

# Install dependencies - using install instead of ci to generate fresh lock file for Linux
RUN npm install

# Copy source code
COPY . .

# Build argument for API URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Production stage
FROM node:22

WORKDIR /app

# Install serve to run the built app
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Serve the application
CMD ["serve", "-s", "dist", "-l", "3000"]
