# Clone and install dependencies
pnpm install

# Start development environment (Tilt)
tilt up

# Optional: stop Tilt
tilt down

# Build for production
pnpm build

# Deploy with Docker
docker-compose up -d