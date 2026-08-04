#!/bin/bash
# ========================================================
# Bloom Studio — Script de deploy para GitHub + Vercel
# ========================================================
#
# ⚠️  SEGURANÇA EM PRIMEIRO LUGAR:
# 1. REVOTE TODOS os tokens que você compartilhou publicamente:
#    - GitHub: https://github.com/settings/tokens
#    - Vercel: https://vercel.com/account/tokens
#    - Groq:   https://console.groq.com/keys
#
# 2. Crie NOVOS tokens em:
#    - GitHub: https://github.com/settings/tokens (scope: repo, workflow)
#    - Vercel: https://vercel.com/account/tokens
#
# 3. Exporte os novos tokens como variáveis de ambiente:
#
#    export GH_TOKEN="ghp_novo_token_github"
#    export VERCEL_TOKEN="vlt_novo_token_vercel"
#
# 4. Configure o remote do Git (uma vez):
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
  echo "❌ GH_TOKEN não definido."
  echo "   Exporte antes de rodar: export GH_TOKEN=seu_novo_token"
  exit 1
fi

if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ VERCEL_TOKEN não definido."
  echo "   Exporte antes de rodar: export VERCEL_TOKEN=seu_novo_token"
  exit 1
fi

# Verifica remote do git
if ! git remote get-url origin &>/dev/null; then
  echo "❌ Remote 'origin' não configurado."
  echo "   Rode: git remote add origin https://github.com/Raphaeljdk/-Bloom-Studio.git"
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
if [[ "$REMOTE_URL" == *"github.com"* ]] && [[ "$REMOTE_URL" != *"$GH_TOKEN"* ]] && [[ "$REMOTE_URL" != *"@"* ]]; then
  NEW_URL=$(echo "$REMOTE_URL" | sed "s|https://github.com|https://$GH_TOKEN@github.com|")
  git remote set-url origin "$NEW_URL"
fi

git add -A
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MSG="🌸 Bloom Studio — Finalizar + Capas IA — $TIMESTAMP

Novidades:
- Aba 'Finalizar' com gerador de capa via IA (6 estilos)
- Capa aparece no card do dashboard e no PDF exportado
- Botão 'Marcar como concluída' para finalizar a história
- Exportação em 5 formatos: PDF, Markdown, HTML, TXT, JSON
- PDF polido com capa em página integral
- Responsividade mobile-first
- PWA instalável (baixar para tela inicial)
- Ditado por voz no chat
- Modo Foco com Pomodoro
- Painel de Analytics
- 4 temas visuais (Rosa, Noturno, Bosque, Oceano)
- Busca inteligente full-text
- Flora mais inteligente (responde qualquer pergunta)"

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
echo "🔗 Seu site estará disponível em minutos na URL da Vercel."
echo "📱 Para instalar no celular: acesse a URL → menu → 'Adicionar à tela inicial'"
