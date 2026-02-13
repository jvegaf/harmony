.PHONY: all install clean clean/deps clean/data dev run lint check build/linux build/win build/mac

PNPM_CMD = pnpm
CONFIG_DIR = ~/.config/harmony

all: clean install

install: clean clean/deps
	@echo "Installing dependencies..."
	@$(PNPM_CMD) install

clean:
	@echo "Cleaning up..."
	@rm -rf out dist

clean/data:
	@echo "Cleaning up data ..."
	@rm -rf $(CONFIG_DIR)

clean/deps:
	@echo "Cleaning up deps..."
	@rm -rf node_modules

dev:
	@echo "Running development environment..."
	@$(PNPM_CMD) dev

run:
	@echo "Running application..."
	@$(PNPM_CMD) start

lint:
	@echo "Linting code..."
	@$(PNPM_CMD) lint

check:
	@echo "Linting code..."
	@$(PNPM_CMD) typecheck

build/linux: clean
	@echo "Building Linux application..."
	@$(PNPM_CMD) build:linux

build/win: clean
	@echo "Building Windows application..."
	@$(PNPM_CMD) build:win

build/mac: clean
	@echo "Building Mac application..."
	@$(PNPM_CMD) build:mac
