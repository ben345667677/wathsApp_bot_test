# Use official Node.js runtime as base image
FROM node:20-alpine

# Set working directory in container
WORKDIR /app

# Create necessary directories
RUN mkdir -p people qr auth

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application files
COPY simple_bot.js ./
COPY database/ ./database/

# Create volumes for persistent data
VOLUME ["/app/people", "/app/qr", "/app/auth"]

# Expose any ports if needed (optional)
# EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S botuser && \
    adduser -S botuser -u 1001

# Change ownership of app directory
RUN chown -R botuser:botuser /app

# Switch to non-root user
USER botuser

# Health check - simplified
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
    CMD ps aux | grep -q '[n]ode.*simple_bot.js' || exit 1

# Start the application
CMD ["node", "simple_bot.js"]
