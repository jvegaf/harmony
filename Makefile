.PHONY: all install clean clean/deps clean/data dev run lint check build/linux build/win build/mac

YARN_CMD = yarn
CONFIG_DIR = ~/.config/harmony

all: clean install

install: clean clean/deps
	@echo "Installing dependencies..."
	@$(YARN_CMD) install

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
	@$(YARN_CMD) dev

run:
	@echo "Running application..."
	@$(YARN_CMD) start

lint:
	@echo "Linting code..."
	@$(YARN_CMD) lint

check:
	@echo "Linting code..."
	@$(YARN_CMD) typecheck

build/linux: clean
	@echo "Building Linux application..."
	@$(YARN_CMD) build:linux

build/win: clean
	@echo "Building Windows application..."
	@$(YARN_CMD) build:win

build/mac: clean
	@echo "Building Mac application..."
	@$(YARN_CMD) build:mac
