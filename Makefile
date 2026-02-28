.PHONY: all install clean clean/deps clean/data dev run lint check build/linux build/win build/mac

PM_CMD = pnpm
CONFIG_DIR = ~/.config/harmony

all: clean install

install: clean clean/deps
	@echo "Installing dependencies..."
	@$(PM_CMD) install

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
	@$(PM_CMD) run dev

run:
	@echo "Running application..."
	@$(PM_CMD) start

lint:
	@echo "Linting code..."
	@$(PM_CMD) run lint

check: lint
	@echo "Linting code..."
	@$(PM_CMD) run typecheck

build/linux: clean
	@echo "Building Linux application..."
	@$(PM_CMD) run build:linux

build/win: clean
	@echo "Building Windows application..."
	@$(PM_CMD) run build:win

build/mac: clean
	@echo "Building Mac application..."
	@$(PM_CMD) run build:mac
