FROM rust:slim-bookworm AS bot-builder

RUN apt update && apt install -y cmake

WORKDIR /usr/src/app
COPY . .
# Will build and cache the binary and dependent crates in release mode
RUN --mount=type=cache,target=/usr/local/cargo,from=rust:latest,source=/usr/local/cargo \
    --mount=type=cache,target=target \
    cargo build --release && mv ./target/release/mememachine-rs ./mememachine-rs

# Runtime image
FROM debian:bookworm-slim AS runtime

RUN apt-get update  \
    && apt-get install -y --no-install-recommends ffmpeg \
    # Cleanup
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Get compiled binaries from builder's cargo install directory
COPY --from=builder /usr/src/app/mememachine-rs /app/mememachine-rs

# Run the app
ENTRYPOINT ["./mememachine-rs"]
