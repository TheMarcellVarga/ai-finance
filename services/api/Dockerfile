# syntax=docker/dockerfile:1.7
FROM golang:1.23.4-bookworm AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
    && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/worker ./cmd/worker

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates poppler-utils \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 aperture
USER aperture
WORKDIR /home/aperture

FROM runtime AS api
COPY --from=build /out/api /usr/local/bin/aperture-api
ENV APP_ENV=production HOST=0.0.0.0 PORT=8080
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/aperture-api"]

FROM runtime AS worker
COPY --from=build /out/worker /usr/local/bin/aperture-worker
ENV APP_ENV=production
ENTRYPOINT ["/usr/local/bin/aperture-worker"]
