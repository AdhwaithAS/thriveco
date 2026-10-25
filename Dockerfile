# ==============================================================================
# THRIVE&CO - Multi-stage Dockerfile for Render Web Service
# Java 21 + Spring Boot 3.3.5
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build JAR using Maven and JDK 21
# ------------------------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Copy Maven POM first for dependency caching
COPY pom.xml .

# Pre-fetch dependencies (cached across builds if pom.xml doesn't change)
RUN mvn dependency:go-offline -B || true

# Copy source code
COPY src ./src

# Build production JAR (tests are skipped here for fast deployment)
RUN mvn clean package -DskipTests

# ------------------------------------------------------------------------------
# Stage 2: Lean runtime using JRE 21 Alpine
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Install bash and curl for container health checks
RUN apk add --no-cache bash curl

# Create non-root system user for secure execution
RUN addgroup -S thrivegroup && adduser -S thriveuser -G thrivegroup

# Copy executable jar from builder stage
COPY --from=builder /build/target/thriveco-*.jar /app/app.jar

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh && chown -R thriveuser:thrivegroup /app

# Run as non-root user
USER thriveuser

# Render dynamically injects PORT; default is 8080
ENV PORT=8080
EXPOSE 8080

# Configure JVM memory ergonomics for Render's 512MB RAM free tier:
# - MaxRAMPercentage=75 gives ~384MB heap max, leaving headroom for off-heap and OS
# - ExitOnOutOfMemoryError ensures container restarts cleanly if memory limits are exceeded
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
