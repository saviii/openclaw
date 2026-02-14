.PHONY: install start env-link

# ── Env symlinks (from ~/.openclaw/.env and ~/.config/kairo-cloud/.env.local) ──
env-link:
	@[ -f ~/.openclaw/.env ] && [ ! -e .env ] && ln -s ~/.openclaw/.env .env && echo "Linked .env" || true
	@[ -f ~/.config/kairo-cloud/.env.local ] && [ ! -e kairo-cloud/.env.local ] && ln -s ~/.config/kairo-cloud/.env.local kairo-cloud/.env.local && echo "Linked kairo-cloud/.env.local" || true

# ── Install all deps + link env vars ──────────────────────────────────────────
install: env-link
	pnpm install

# ── Start the kairo-cloud dev server (Next.js — serves FE + BE together) ──────
start:
	cd kairo-cloud && pnpm dev
