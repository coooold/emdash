.DEFAULT_GOAL := help

PNPM ?= pnpm
ARCH ?= $(shell uname -m | sed 's/x86_64/x64/')
DESKTOP_DIR := apps/ply-desktop

.PHONY: help dev build

help:
	@printf '%s\n' \
	  'make dev                Start Electron with DevTools and hot reload' \
	  'make build              Build a local macOS DMG for this Mac' \
	  'make build ARCH=arm64   Build for Apple Silicon (or ARCH=x64 for Intel)' \
	  'Prerequisite: pnpm install'

dev:
	$(PNPM) --dir $(DESKTOP_DIR) run dev -- --auto-open-devtools-for-tabs

build:
	@test "$$(uname -s)" = Darwin || { echo 'make build requires macOS.' >&2; exit 1; }
	@case "$(ARCH)" in arm64|x64) ;; *) echo 'ARCH must be arm64 or x64.' >&2; exit 1 ;; esac
	$(PNPM) exec nx build @ply/ply-desktop
	$(PNPM) --dir $(DESKTOP_DIR) exec node --experimental-strip-types scripts/release/build.ts --platform mac --arch $(ARCH) --targets dmg --package-only
	@printf '%s\n' 'DMG output: $(DESKTOP_DIR)/release/'
