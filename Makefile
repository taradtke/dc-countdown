# DC Migration System - Makefile
# Simplifies common development and deployment tasks

.PHONY: help install dev prod build test clean backup restore migrate

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Default target
help:
	@echo "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
	@echo "${BLUE}║          DC Migration System - Make Commands           ║${NC}"
	@echo "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
	@echo ""
	@echo "${GREEN}Development:${NC}"
	@echo "  make install          - Install dependencies"
	@echo "  make dev              - Start local development server"
	@echo "  make dev-docker       - Start development with Docker"
	@echo "  make dev-full         - Start with all development services"
	@echo ""
	@echo "${GREEN}Production:${NC}"
	@echo "  make prod             - Start production server"
	@echo "  make prod-build       - Build production Docker image"
	@echo "  make prod-up          - Start production with Docker"
	@echo ""
	@echo "${GREEN}Remote/Staging:${NC}"
	@echo "  make remote-up        - Start remote development environment"
	@echo "  make remote-sync      - Sync code to remote environment"
	@echo "  make staging          - Deploy to staging environment"
	@echo ""
	@echo "${GREEN}Database:${NC}"
	@echo "  make migrate          - Run database migrations"
	@echo "  make seed             - Seed database with sample data"
	@echo "  make backup           - Create database backup"
	@echo "  make restore          - Restore database from backup"
	@echo ""
	@echo "${GREEN}Testing:${NC}"
	@echo "  make test             - Run test suite"
	@echo "  make test-email       - Test email configuration"
	@echo "  make test-load        - Run load tests"
	@echo ""
	@echo "${GREEN}Utilities:${NC}"
	@echo "  make clean            - Clean build artifacts and logs"
	@echo "  make logs             - View application logs"
	@echo "  make shell            - Access container shell"
	@echo "  make status           - Check system status"
	@echo "  make stop             - Stop all services"

# Installation
install:
	@echo "${BLUE}Installing dependencies...${NC}"
	npm install
	@echo "${GREEN}✓ Dependencies installed${NC}"

# Development environments
dev:
	@echo "${BLUE}Starting local development server...${NC}"
	npm run dev

dev-docker:
	@echo "${BLUE}Starting Docker development environment...${NC}"
	docker-compose -f docker-compose.dev.yml up

dev-docker-build:
	@echo "${BLUE}Building Docker development environment...${NC}"
	docker-compose -f docker-compose.dev.yml up --build

dev-full:
	@echo "${BLUE}Starting full development environment with all services...${NC}"
	docker-compose -f docker-compose.dev.yml --profile with-postgres --profile with-redis --profile with-mailhog --profile with-adminer up

dev-with-nginx:
	@echo "${BLUE}Starting development with Nginx Proxy Manager...${NC}"
	docker-compose -f docker-compose.dev.yml --profile with-nginx up

# Production
prod:
	@echo "${YELLOW}Starting production server...${NC}"
	NODE_ENV=production npm start

prod-build:
	@echo "${BLUE}Building production Docker image...${NC}"
	docker build -t dc-countdown:latest .
	@echo "${GREEN}✓ Production image built${NC}"

prod-up:
	@echo "${BLUE}Starting production environment...${NC}"
	docker-compose up -d
	@echo "${GREEN}✓ Production environment started${NC}"

prod-up-nginx:
	@echo "${BLUE}Starting production with Nginx...${NC}"
	docker-compose --profile with-nginx up -d

# Remote/Staging
remote-up:
	@echo "${BLUE}Starting remote development environment...${NC}"
	docker-compose -f docker-compose.remote.yml up -d

remote-sync:
	@echo "${BLUE}Starting code sync service...${NC}"
	docker-compose -f docker-compose.remote.yml --profile with-sync up -d

remote-monitoring:
	@echo "${BLUE}Starting remote environment with monitoring...${NC}"
	docker-compose -f docker-compose.remote.yml --profile monitoring up -d

staging:
	@echo "${BLUE}Deploying to staging...${NC}"
	docker-compose -f docker-compose.remote.yml up -d
	docker-compose -f docker-compose.remote.yml exec app npm run migrate
	@echo "${GREEN}✓ Deployed to staging${NC}"

# Database operations
migrate:
	@echo "${BLUE}Running database migrations...${NC}"
	npm run migrate
	@echo "${GREEN}✓ Migrations completed${NC}"

migrate-create:
	@echo "${BLUE}Creating new migration...${NC}"
	@read -p "Migration name: " name; \
	node src/database/migrate.js create $$name

seed:
	@echo "${BLUE}Seeding database...${NC}"
	npm run seed
	@echo "${GREEN}✓ Database seeded${NC}"

backup:
	@echo "${BLUE}Creating database backup...${NC}"
	npm run backup
	@echo "${GREEN}✓ Backup created${NC}"

restore:
	@echo "${YELLOW}Restoring database from backup...${NC}"
	npm run restore

# Testing
test:
	@echo "${BLUE}Running test suite...${NC}"
	npm test

test-email:
	@echo "${BLUE}Testing email configuration...${NC}"
	npm run test:email

test-load:
	@echo "${BLUE}Running load tests...${NC}"
	npm run test:load

test-integration:
	@echo "${BLUE}Running integration tests...${NC}"
	npm run test:integration

# Docker operations
docker-logs:
	docker-compose logs -f --tail=100

docker-logs-app:
	docker-compose logs -f --tail=100 app

docker-shell:
	docker-compose exec app sh

docker-stop:
	@echo "${YELLOW}Stopping all containers...${NC}"
	docker-compose down
	docker-compose -f docker-compose.dev.yml down
	docker-compose -f docker-compose.remote.yml down
	@echo "${GREEN}✓ All containers stopped${NC}"

docker-clean:
	@echo "${YELLOW}Cleaning Docker resources...${NC}"
	docker-compose down -v
	docker system prune -f
	@echo "${GREEN}✓ Docker resources cleaned${NC}"

# Utility commands
clean:
	@echo "${YELLOW}Cleaning build artifacts...${NC}"
	rm -rf node_modules
	rm -rf dist
	rm -rf logs/*.log
	rm -rf uploads/*
	npm cache clean --force
	@echo "${GREEN}✓ Cleaned${NC}"

logs:
	tail -f logs/*.log

status:
	@echo "${BLUE}Checking system status...${NC}"
	@curl -s http://localhost:3000/health | jq '.' || echo "${RED}✗ Service not responding${NC}"

stop:
	@echo "${YELLOW}Stopping all services...${NC}"
	-pkill node
	-docker-compose down
	@echo "${GREEN}✓ Services stopped${NC}"

# Environment setup
env-dev:
	@echo "${BLUE}Setting up development environment...${NC}"
	cp .env.development .env
	@echo "${GREEN}✓ Development environment configured${NC}"

env-prod:
	@echo "${BLUE}Setting up production environment...${NC}"
	cp .env.production .env
	@echo "${YELLOW}⚠ Remember to update production secrets in .env${NC}"

# Security
security-check:
	@echo "${BLUE}Running security audit...${NC}"
	npm audit
	npm audit fix --dry-run

security-fix:
	@echo "${YELLOW}Fixing security vulnerabilities...${NC}"
	npm audit fix

# Performance
optimize:
	@echo "${BLUE}Optimizing application...${NC}"
	npm run build
	npm prune --production

# Monitoring
monitor:
	@echo "${BLUE}Opening monitoring dashboard...${NC}"
	open http://localhost:3001  # Grafana
	open http://localhost:8080  # Traefik
	open http://localhost:8025  # Mailhog (development)

# Quick commands
up: dev-docker
down: docker-stop
restart: docker-stop dev-docker
rebuild: docker-stop dev-docker-build

# CI/CD helpers
ci-test:
	npm ci
	npm run lint
	npm test

ci-build:
	docker build -t dc-countdown:${BUILD_NUMBER:-latest} .

ci-deploy:
	docker tag dc-countdown:${BUILD_NUMBER:-latest} dc-countdown:production
	docker push dc-countdown:production

.DEFAULT_GOAL := help