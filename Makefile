.PHONY: all install clean clean/deps clean/data dev run lint check build/linux build/win build/mac

NPM_CMD = npm
CONFIG_DIR = ~/.config/harmony

all: clean install

install: clean clean/deps
	@echo "Installing dependencies..."
	@$(NPM_CMD) install

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
	@$(NPM_CMD) run dev

run:
	@echo "Running application..."
	@$(NPM_CMD) start

lint:
	@echo "Linting code..."
	@$(NPM_CMD) run lint

check:
	@echo "Linting code..."
	@$(NPM_CMD) run typecheck

build/linux: clean
	@echo "Building Linux application..."
	@$(NPM_CMD) run build:linux

build/win: clean
	@echo "Building Windows application..."
	@$(NPM_CMD) run build:win

build/mac: clean
	@echo "Building Mac application..."
	@$(NPM_CMD) run build:mac
