FROM rust:slim-bookworm AS bot-builder

RUN apt update && apt install -y cmake

WORKDIR /usr/src/bot
COPY ./bot .
# Will build and cache the binary and dependent crates in release mode
RUN --mount=type=cache,target=/usr/local/cargo,from=rust:latest,source=/usr/local/cargo \
    --mount=type=cache,target=target \
    cargo build --release && mv ./target/release/mememachine-rs ./mememachine-rs

FROM node:20-bookworm-slim AS node-base

ENV NODE_ENV="production"

FROM node-base AS dashboard-all-deps

WORKDIR /usr/src/dashboard
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm ci --include=dev

FROM node-base AS dashboard-prod-deps

WORKDIR /usr/src/dashboard

COPY --from=dashboard-all-deps /usr/src/dashboard/node_modules /usr/src/dashboard/node_modules
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm prune --omit=dev

FROM node:20-bullseye-slim AS dashboard-builder

WORKDIR /usr/src/dashboard

COPY --from=dashboard-all-deps /usr/src/dashboard/node_modules /usr/src/dashboard/node_modules
COPY ./dashboard .

RUN npm run build

# Runtime image
FROM node:20-bookworm-slim AS runtime

EXPOSE 8080

ENV PORT="8080"
ENV NODE_ENV="production"

WORKDIR /app

# Get compiled binaries from builder's cargo install directory
COPY --from=bot-builder /usr/src/bot/mememachine-rs /app/mememachine-rs

# Get built dashboard from builder with production-only dependencies
COPY --from=dashboard-prod-deps /usr/src/dashboard/node_modules /app/dashboard/node_modules

COPY --from=dashboard-builder /usr/src/dashboard/build /app/dashboard/build
COPY --from=dashboard-builder /usr/src/dashboard/public /app/dashboard/public
COPY --from=dashboard-builder /usr/src/dashboard/package.json /app/dashboard/package.json
COPY --from=dashboard-builder /usr/src/dashboard/app/db/migrations /app/dashboard/app/db/migrations

# Get start script from repo
COPY start.sh .

# Run the app
ENTRYPOINT ["./start.sh"]
