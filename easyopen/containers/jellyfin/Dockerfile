ARG JELLYFIN_IMAGE=ghcr.io/jellyfin/jellyfin@sha256:c3efa69a22f2691fc88d6bb035e87a8560e395a6047f062fb381c61c3185e8f5
FROM ${JELLYFIN_IMAGE}

USER root

# Keep Jellyfin itself unchanged and upgrade only the Debian packages reported
# as fixed HIGH or CRITICAL findings for the locked upstream image.
RUN apt-get update \
    && apt-get install --only-upgrade --yes --no-install-recommends \
        curl \
        libbrotli1 \
        libcurl4t64 \
        libexpat1 \
        libpcre2-8-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

LABEL org.opencontainers.image.source="https://github.com/ParkSuJeong74/my_own_note"
LABEL org.opencontainers.image.title="EasyOpen Jellyfin compatibility candidate"
LABEL org.opencontainers.image.description="Independent EasyOpen test candidate based on the locked official Jellyfin image"
