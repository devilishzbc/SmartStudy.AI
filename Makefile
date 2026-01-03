# SmartStudy.AI Makefile

.PHONY: help up down migrate seed test clean

help:
	@echo "SmartStudy.AI - Available Commands:"
	@echo "  make up      - Start all services (postgres, redis, backend, frontend)"
	@echo "  make down    - Stop all services"
	@echo "  make migrate - Run database migrations"
	@echo "  make seed    - Load demo seed data"
	@echo "  make test    - Run all tests"
	@echo "  make clean   - Clean up containers and volumes"

up:
	@echo "Starting services..."
	docker-compose up -d postgres redis
	@echo "Waiting for services to be healthy..."
	@sleep 5
	@echo "Services started!"

down:
	@echo "Stopping services..."
	docker-compose down

migrate:
	@echo "Running database migrations..."
	cd backend && alembic upgrade head

seed:
	@echo "Loading seed data..."
	cd backend && python seed.py

test:
	@echo "Running tests..."
	cd backend && pytest
	cd frontend && yarn test --watchAll=false

clean:
	@echo "Cleaning up..."
	docker-compose down -v
