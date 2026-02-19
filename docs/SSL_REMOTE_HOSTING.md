# SSL & Remote Hosting with Nginx + Certbot

This guide covers adding nginx as a reverse proxy with Let's Encrypt SSL certificates to the production `docker-compose.prod.yml` setup for secure remote access.

> **Prerequisites**: You have a domain name pointing to your server's public IP address and ports 80/443 open in your firewall.

---

## Overview

The default `docker-compose.prod.yml` exposes the API on port 3000 and the web UI on port 8080 over plain HTTP. For remote access you will add:

- **nginx** — reverse proxy that terminates SSL and routes traffic to the `api` and `web` containers
- **certbot** — obtains and automatically renews Let's Encrypt certificates

The `api` and `web` containers will no longer expose ports directly to the host; nginx becomes the single public entry point on ports 80 and 443.

---

## Step 1 — Create the nginx configuration

Create the directory structure on your host:

```bash
mkdir -p nginx/conf.d
mkdir -p certbot/www
mkdir -p certbot/conf
```

### `nginx/conf.d/mind-melder.conf`

Replace `your.domain.com` with your actual domain.

```nginx
# Redirect all HTTP traffic to HTTPS
server {
    listen 80;
    server_name your.domain.com;

    # Required for certbot ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
```

---

## Step 2 — Create the SSL-enabled docker-compose override

Create `docker-compose.ssl.yml` alongside your existing `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # Remove direct port exposure from api and web —
  # nginx handles all inbound traffic.
  api:
    ports: !reset []

  web:
    ports: !reset []

  nginx:
    image: nginx:alpine
    container_name: mind-melder-nginx
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - web
      - api
    networks:
      - mind-melder-network

  certbot:
    image: certbot/certbot
    container_name: mind-melder-certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    # Renews certificates if they are within 30 days of expiry.
    # Run this container on a schedule (see Step 5).
    entrypoint: /bin/sh -c "trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done"
    networks:
      - mind-melder-network
```

---

## Step 3 — Obtain the initial certificate

Before nginx can start with SSL enabled you need a certificate. Run certbot in standalone mode (temporarily) to get the first certificate.

**3a. Start only nginx with the minimal HTTP-only config** so the ACME challenge can be served:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d nginx
```

**3b. Request the certificate:**

The certbot service has a custom entrypoint for auto-renewal, so pass `--entrypoint certbot` to override it for initial issuance:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.ssl.yml run --rm \
  --entrypoint certbot certbot \
  certonly --webroot \
  --webroot-path /var/www/certbot \
  --email you@example.com \
  --agree-tos \
  --no-eff-email \
  -d your.domain.com
```

**3c. Add the ssl nginx config** add this block to the end of `nginx/conf.d/mind-melder.conf`:

```nginx
# HTTPS — web UI
server {
    listen 443 ssl;
    server_name your.domain.com;

    ssl_certificate     /etc/letsencrypt/live/your.domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your.domain.com/privkey.pem;

    # Recommended SSL settings
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;

    # Proxy API requests
    location /api/ {
        proxy_pass         http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # SSE / streaming support
        proxy_set_header   Connection '';
        proxy_buffering    off;
        proxy_cache        off;
        chunked_transfer_encoding on;
    }

    # All other requests go to the web UI
    location / {
        proxy_pass         http://web:80;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

**3d. Bring all the services back up:**

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d
```

---

## Step 4 — Update your `.env`

Remove or clear the port variables since nginx now owns 80/443. The internal ports still need to match what nginx proxies to (`api:3000`, `web:80`):

```env
# Remove these or leave empty — nginx handles external ports
# API_PORT=
# WEB_PORT=

# Everything else stays the same
DATABASE_URL=...
LLM_PROVIDER=...
```

---

## Step 5 — Automatic certificate renewal

Let's Encrypt certificates expire every 90 days. The `certbot` service in the compose file loops every 12 hours and renews if needed. nginx must reload after renewal to pick up the new certificate.

Add a cron job on the host to reload nginx after certbot runs:

```bash
# /etc/cron.d/mind-melder-certbot-reload
0 */12 * * * root docker exec mind-melder-nginx nginx -s reload
```

Or, if you prefer a single-command solution, replace the certbot entrypoint with a script that reloads nginx after renewal:

```yaml
  certbot:
    entrypoint: /bin/sh -c "trap exit TERM; while :; do certbot renew --post-hook 'docker exec mind-melder-nginx nginx -s reload'; sleep 12h & wait $${!}; done"
```

> **Note**: The `--post-hook` approach requires the certbot container to have access to the Docker socket, which adds complexity. The cron job on the host is simpler and preferred.

---

## Step 6 — Verify the setup

```bash
# All four containers should be running
docker compose -f docker-compose.prod.yml -f docker-compose.ssl.yml ps

# Check nginx logs for errors
docker logs mind-melder-nginx

# Verify SSL
curl -I https://your.domain.com
```

---

## Final file tree

```
.
├── docker-compose.prod.yml       # Unchanged base config
├── docker-compose.ssl.yml        # SSL overlay (new)
├── nginx/
│   └── conf.d/
│       └── mind-melder.conf      # nginx virtual host config (new)
└── certbot/
    ├── conf/                     # Let's Encrypt certs (auto-populated)
    └── www/                      # ACME challenge webroot (auto-populated)
```

---

## Troubleshooting

| Problem | Check |
|---|---|
| nginx fails to start | Confirm cert files exist under `certbot/conf/live/your.domain.com/` |
| 502 Bad Gateway | Ensure `api` and `web` containers are healthy (`docker compose ps`) |
| Certificate not renewing | Check certbot logs: `docker logs mind-melder-certbot` |
| ERR_TOO_MANY_REDIRECTS | The web container may be adding its own redirect; ensure `X-Forwarded-Proto` is forwarded correctly |
| SSE / streaming broken | Confirm `proxy_buffering off` and `proxy_cache off` are set in the `/api/` block |
