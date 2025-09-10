FROM node:18-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Create app directory
WORKDIR /usr/src/app

# Create necessary directories
RUN mkdir -p uploads logs backups data

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Bundle app source
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /usr/src/app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Run the application
CMD [ "node", "src/app.js" ]