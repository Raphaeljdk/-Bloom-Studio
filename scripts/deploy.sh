#!/bin/bash
# ========================================================
# Bloom Studio — Script de deploy para GitHub + Vercel
# ========================================================
#
# ⚠️  ANTES DE RODAR:
# 1. Revogue TODOS os tokens que você compartilhou publicamente
# 2. Gere novos tokens em:
#    - GitHub: https://github.com/settings/tokens
#    - Vercel: https://vercel.com/account/tokens
# 3. Exporte os novos tokens como variáveis de ambiente:
#
#    export GH_TOKEN="seu_novo_token_github"
#    export VERCEL_TOKEN="seu_novo_token_vercel"
#
# 4. Configure o remote do Git (se ainda não configurou):
#    git remote add origin https://github.com/Raphaeljdk/-Bloom-Studio.git
#
# 5. Rode este script:
#    bash scripts/deploy.sh
# ========================================================

set -e

echo "🌸 Bloom Studio — Deploy"
echo "========================"

# Verifica tokens
if [ -z "$GH_TOKEN" ]; then
  echo "❌ GH_TOKEN não definido. Exporte antes de rodar:"
  echo "   export GH_TOKEN=seu_token"
  exit 1
fi

if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ VERCEL_TOKEN não definido. Exporte antes de rodar:"
  echo "   export VERCEL_TOKEN=seu_token"
  exit 1
fi

# Verifica remote do git
if ! git remote get-url origin &>/dev/null; then
  echo "❌ Remote 'origin' não configurado. Rode:"
  echo "   git remote add origin https://github.com/Raphaeljdk/-Bloom-Studio.git"
  exit 1
fi

echo ""
echo "📋 Passo 1/3: Lint check"
if ! bun run lint; then
  echo "❌ Lint falhou. Corrija os erros antes de commitar."
  exit 1
fi
echo "✅ Lint OK"

echo ""
echo "📋 Passo 2/3: Commit para GitHub"

# Configura git com token
REMOTE_URL=$(git remote get-url origin)
if [[ "$REMOTE_URL" == *"github.com"* ]] && [[ "$REMOTE_URL" != *"$GH_TOKEN"* ]]; then
  NEW_URL=$(echo "$REMOTE_URL" | sed "s|https://github.com|https://$GH_TOKEN@github.com|")
  git remote set-url origin "$NEW_URL"
fi

git add -A
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MSG="🌸 Bloom Studio update — $TIMESTAMP

- Responsividade mobile-first completa
- PWA instalável (manifest + service worker)
- Ditado por voz no chat (Web Speech API pt-BR)
- Modo Foco com Pomodoro
- Painel de Analytics (palavras, ritmo, legibilidade, repetições)
- Busca inteligente full-text
- 4 temas visuais (Rosa, Noturno, Bosque, Oceano)
- Exportação em 5 formatos (PDF, MD, HTML, TXT, JSON)
- Flora mais inteligente (responde qualquer pergunta sobre a história)
- Efeitos e animações aprimoradas"

if git diff --staged --quiet; then
  echo "ℹ️  Nenhuma mudança para commitar"
else
  git commit -m "$COMMIT_MSG" --allow-empty
  git push origin HEAD
  echo "✅ Commitado e enviado para GitHub"
fi

echo ""
echo "📋 Passo 3/3: Deploy para Vercel"

if ! command -v vercel &>/dev/null; then
  echo "📦 Instalando Vercel CLI..."
  npm install -g vercel
fi

vercel --prod --yes --token "$VERCEL_TOKEN"

echo ""
echo "🌸 Deploy concluído!"
echo "==================="
echo "✅ GitHub: atualizado"
echo "✅ Vercel: deploy de produção enviado"
echo ""
echo "🔗 Seu site estará disponível em alguns minutos na URL da Vercel."
