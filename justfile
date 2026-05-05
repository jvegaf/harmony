set shell := ["powershell.exe", "-NoProfile", "-Command"]

npm_cmd := "pnpm"
config_dir := "$HOME/.config/harmony"

# Default target to list all available recipes
default:
    @just --list

# Clean and install dependencies
all: clean install

# Install dependencies
install: clean clean-deps
    @echo "Installing dependencies..."
    @{{npm_cmd}} install

# Clean up build directories
clean:
    @echo "Cleaning up..."
    @Remove-Item -Recurse -Force out -ErrorAction SilentlyContinue
    @Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue

# Clean up application data
clean-data:
    @echo "Cleaning up data ..."
    @Remove-Item -Recurse -Force {{config_dir}} -ErrorAction SilentlyContinue

# Clean up node_modules
clean-deps:
    @echo "Cleaning up deps..."
    @Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# Run development environment
dev:
    @echo "Running development environment..."
    @{{npm_cmd}} run dev

# Run application
run:
    @echo "Running application..."
    @{{npm_cmd}} start

# Lint code
lint:
    @echo "Linting code..."
    @{{npm_cmd}} run lint

# Lint and typecheck code
check: lint
    @echo "Linting code..."
    @{{npm_cmd}} run typecheck

# Build Linux application
build-linux: clean
    @echo "Building Linux application..."
    @{{npm_cmd}} run build:linux

# Build Windows application
build-win: clean
    @echo "Building Windows application..."
    @{{npm_cmd}} run build:win

# Build Mac application
build-mac: clean
    @echo "Building Mac application..."
    @{{npm_cmd}} run build:mac
