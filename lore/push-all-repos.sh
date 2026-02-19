#!/bin/bash
# Push all LORE repositories to GitHub
# Run this script to create and push all repos in sequence

set -e

echo "🚀 LORE Multi-Client Repository Push"
echo "======================================"
echo
echo "This will create 7 GitHub repositories:"
echo "  1. rtgf-sage (public)"
echo "  2-7. 6 client knowledge repos (private)"
echo
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo
echo "📦 [1/7] Pushing rtgf-sage (tools, public)..."
cd /home/cbasta/rtgf-sage
gh repo create rtgf-sage \
  --public \
  --description "LORE - Session Archive & Governance Engine. Git-native LLM conversation management." \
  --source=. \
  --push || echo "⚠️  rtgf-sage may already exist or failed"

echo
echo "📦 [2/7] Pushing makanui-knowledge (private)..."
cd /home/cbasta/makanui-knowledge
gh repo create makanui-knowledge \
  --private \
  --description "Makanui LLC - LLM session knowledge base (LORE)" \
  --source=. \
  --push || echo "⚠️  makanui-knowledge may already exist or failed"

echo
echo "📦 [3/7] Pushing intenx-knowledge (private)..."
cd /home/cbasta/intenx-knowledge
gh repo create intenx-knowledge \
  --private \
  --description "INTenX Engineering - LLM session knowledge base (LORE)" \
  --source=. \
  --push || echo "⚠️  intenx-knowledge may already exist or failed"

echo
echo "📦 [4/7] Pushing sensit-knowledge (private)..."
cd /home/cbasta/sensit-knowledge
gh repo create sensit-knowledge \
  --private \
  --description "Sensit Technologies - LLM session knowledge base (LORE)" \
  --source=. \
  --push || echo "⚠️  sensit-knowledge may already exist or failed"

echo
echo "📦 [5/7] Pushing ratio11-knowledge (private)..."
cd /home/cbasta/ratio11-knowledge
gh repo create ratio11-knowledge \
  --private \
  --description "Ratio11 Electronics - LLM session knowledge base (LORE)" \
  --source=. \
  --push || echo "⚠️  ratio11-knowledge may already exist or failed"

echo
echo "📦 [6/7] Pushing beaglebone-knowledge (private)..."
cd /home/cbasta/beaglebone-knowledge
gh repo create beaglebone-knowledge \
  --private \
  --description "BeagleBone Projects - LLM session knowledge base (LORE)" \
  --source=. \
  --push || echo "⚠️  beaglebone-knowledge may already exist or failed"

echo
echo "📦 [7/7] Pushing test-knowledge (private, 23 sessions)..."
cd /home/cbasta/test-knowledge
gh repo create test-knowledge \
  --private \
  --description "Test knowledge base - LORE development (23 sessions)" \
  --source=. \
  --push || echo "⚠️  test-knowledge may already exist or failed"

echo
echo "✅ Done! All repositories pushed to GitHub."
echo
echo "Next steps:"
echo "  1. Visit GitHub to verify repositories"
echo "  2. Update config.yaml in each knowledge repo with your GitHub username"
echo "  3. Start importing sessions!"
echo
