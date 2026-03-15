#!/bin/bash
# Urban Bird — Production Deployment Script
# Images are cached; all other content is pulled live from the server.
set -e

echo "=== Urban Bird Deployment Started ==="

# 1. Pull latest code
echo "[1/4] Pulling latest code from GitHub..."
git pull origin main

# 2. Rebuild all containers without Docker layer cache so new code is always picked up
echo "[2/4] Rebuilding containers (no cache)..."
docker-compose build --no-cache

# 3. Restart containers, forcing recreation of all services
echo "[3/4] Restarting all services..."
docker-compose up -d --force-recreate

# 4. Flush search/product Redis cache keys so updated content is served immediately.
#    Auth tokens (refresh:*, blacklist:*, pwd_reset:*) are intentionally preserved.
echo "[4/4] Flushing stale Redis cache (search & product keys)..."
REDIS_PASS="${REDIS_PASSWORD:-}"
if [ -n "$REDIS_PASS" ]; then
    KEYS=$(docker-compose exec -T redis redis-cli -a "$REDIS_PASS" --no-auth-warning --scan --pattern "search:*" 2>/dev/null)
else
    KEYS=$(docker-compose exec -T redis redis-cli --scan --pattern "search:*" 2>/dev/null)
fi

if [ -n "$KEYS" ]; then
    echo "$KEYS" | while read -r key; do
        if [ -n "$REDIS_PASS" ]; then
            docker-compose exec -T redis redis-cli -a "$REDIS_PASS" --no-auth-warning DEL "$key" > /dev/null
        else
            docker-compose exec -T redis redis-cli DEL "$key" > /dev/null
        fi
    done
    echo "  Flushed search cache keys."
else
    echo "  No search cache keys found — nothing to flush."
fi

echo ""
echo "=== Deployment Complete ==="
echo "  - JS/CSS: no-cache (always fresh)"
echo "  - Images (/uploads/): cached 1 year"
echo "  - API responses: no-store (always live from server)"
