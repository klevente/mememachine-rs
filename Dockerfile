FROM rust:latest as builder

RUN apt update && apt install -y cmake

WORKDIR /usr/src/app
COPY . .
# Will build and cache the binary and dependent crates in release mode
RUN --mount=type=cache,target=/usr/local/cargo,from=rust:latest,source=/usr/local/cargo \
    --mount=type=cache,target=target \
    cargo build --release && mv ./target/release/mememachine-rs ./mememachine-rs

# Runtime image
FROM debian:bullseye-slim

RUN apt update && apt install -y ffmpeg

WORKDIR /app

# Get compiled binaries from builder's cargo install directory
COPY --from=builder /usr/src/app/mememachine-rs /app/mememachine-rs

# Run the app
CMD ./mememachine-rs