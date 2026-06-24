#!/bin/bash

# ─── HTN Pilot — One-Click Launcher ───────────────────────────────────────────

cd "$(dirname "$0")"

# Fix PATH — double-clicked .command files don't inherit the full shell PATH
export PATH="/usr/local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/bin:/bin:$PATH"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║         HTN Pilot — Starting Up        ║"
echo "╚════════════════════════════════════════╝"
echo ""

# ── Check Node.js ─────────────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo "❌  Node.js not found."
  echo ""
  echo "    Install it from: https://nodejs.org  (LTS version)"
  echo "    Then double-click this file again."
  echo ""
  read -p "Press Enter to close..."
  exit 1
fi
echo "✓  Node.js $(node --version)"

# ── Remove legacy config (replaced by next.config.mjs) ───────────────────────
[ -f "next.config.ts" ] && rm -f "next.config.ts" && echo "✓  Removed legacy next.config.ts"

# ── Check .env ────────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo ""
  echo "❌  No .env file found."
  echo "    Open the HTN Pilot folder and create a file named .env"
  echo "    Copy the contents of .env.example and fill in your DATABASE_URL."
  echo ""
  read -p "Press Enter to close..."
  exit 1
fi
echo "✓  .env found"

# ── Install / update packages ─────────────────────────────────────────────────
echo ""
echo "📦  Checking packages..."

# Detect major version mismatch — wipe node_modules so npm installs fresh
INSTALLED_NEXT=$(node -e "try{const p=require('./node_modules/next/package.json');console.log(p.version);}catch(e){console.log('none');}" 2>/dev/null)
REQUIRED_MAJOR=$(node -e "const p=require('./package.json');const v=p.dependencies.next.replace(/[^0-9.]/g,'');console.log(v.split('.')[0]);" 2>/dev/null)
INSTALLED_MAJOR=$(echo "$INSTALLED_NEXT" | cut -d. -f1)

if [ "$INSTALLED_NEXT" != "none" ] && [ "$INSTALLED_MAJOR" != "$REQUIRED_MAJOR" ]; then
  echo "🔄  Upgrading Next.js ($INSTALLED_NEXT → $REQUIRED_MAJOR.x) — reinstalling packages..."
  rm -rf node_modules package-lock.json .next
elif [ -d ".next" ]; then
  # Always clear build cache to avoid stale CSS/module issues
  rm -rf .next
  echo "✓  Cleared build cache"
fi

npm install --silent
if [ $? -ne 0 ]; then
  echo "❌  npm install failed. Check your internet connection."
  read -p "Press Enter to close..."
  exit 1
fi
echo "✓  Packages ready"

# ── Generate Prisma client ────────────────────────────────────────────────────
echo ""
echo "⚙️   Generating database client..."
npx prisma generate --silent 2>/dev/null
echo "✓  Database client ready"

# ── Run migrations ────────────────────────────────────────────────────────────
echo ""
echo "🗄️   Running database migrations..."
npx prisma migrate deploy 2>&1
if [ $? -ne 0 ]; then
  # migrate deploy fails on dev DB — fall back to migrate dev
  npx prisma migrate dev --name init 2>&1
  if [ $? -ne 0 ]; then
    echo ""
    echo "❌  Database setup failed."
    echo "    Check that your DATABASE_URL in .env is correct."
    echo ""
    read -p "Press Enter to close..."
    exit 1
  fi
fi
echo "✓  Database ready"

# ── Seed demo data (only once) ────────────────────────────────────────────────
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.user.count()
  .then(n => { console.log(n); db.\$disconnect(); })
  .catch(() => { console.log(0); db.\$disconnect(); });
" 2>/dev/null)

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
  echo ""
  echo "🌱  Loading demo data..."
  npm run db:seed 2>&1
  echo "✓  Demo data loaded"
fi

# ── Wait for server then open browser ────────────────────────────────────────
(
  echo "Waiting for server to start..."
  for i in $(seq 1 30); do
    sleep 2
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
      open http://localhost:3000
      break
    fi
  done
) &

# ── Start ─────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   HTN Pilot is starting at http://localhost:3000             ║"
echo "║                                                              ║"
echo "║   Login:    dr.interventional@metro-cardiology.demo          ║"
echo "║   Password: HTNpilot2024!                                    ║"
echo "║                                                              ║"
echo "║   Browser will open automatically when ready.                ║"
echo "║   Close this window to stop the app.                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

npm run dev
