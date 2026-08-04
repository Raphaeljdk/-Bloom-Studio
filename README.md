# Bloom Studio 🌸

**Estúdio de criação literária colaborativa com coautora IA.**

O Bloom Studio é uma aplicação fullstack onde escritores criam e desenvolvem histórias com a colaboração de uma coautora de IA chamada **Flora** 🌸. A Flora tem acesso ao contexto completo da história (personagens, capítulos, cronologia, acontecimentos importantes e anotações) e pode sugerir eventos importantes que o autor aprova ou recusa.

## ✨ Funcionalidades

### 🌷 Coautoria com a Flora
- Chat em tempo real com a coautora de IA (powered by z-ai-web-dev-sdk)
- A Flora tem acesso ao **contexto completo** da história a cada mensagem (Context Builder)
- System prompt estruturado define regras: coerência total, respeito ao tom, nunca criar eventos sem aprovação
- **Suggestion Guard** analisa a resposta da Flora em busca do marcador `[SUGESTÃO_DE_EVENTO]`
- Quando detecta, extrai o evento e o salva como pendente (`isApproved: false`, `suggestedBy: 'COAUTHOR'`)
- Renderiza card com botões **Aprovar** 🌸 / **Recusar** ✕
- Ao aprovar, o evento é marcado como aprovado e aparece no painel de Acontecimentos em tempo real

### 📖 Estúdio de escrita
- **5 seções por história**: Personagens, Capítulos, Cronologia, Acontecimentos, Anotações
- Editor de capítulos com **auto-save** (debounce de 2 segundos)
- Cronologia visual em linha do tempo
- Acontecimentos importantes divididos entre aprovados e sugestões pendentes
- Anotações categorizadas: Ideias, Perguntas, Decisões, Observações
- Exportação da história completa em **Markdown estruturado**

### 🎀 Tema "Jardim Romântico"
Paleta rosa aplicada consistentemente em toda a aplicação:
- Fundo principal: bege rosado `#FDF2F0`
- Sidebar e cabeçalhos: rosa queimado antigo `#C48D9E`
- CTAs: vinho rosado `#B24C63`
- Detalhes florais: 🌸 🎀 🌷 💮

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (Next.js 16 + App Router + TypeScript)             │
│                                                             │
│  ┌────────────┐  ┌─────────────┐  ┌────────────────────┐  │
│  │  Zustand   │  │ TanStack    │  │  Componentes Bloom │  │
│  │  Stores    │  │ Query Cache │  │  (3-col layout)    │  │
│  └────────────┘  └─────────────┘  └────────────────────┘  │
│         ↕                 ↕                                │
│  ┌────────────────────────────────────────────────────┐   │
│  │  API Client (fetch wrapper tipado)                 │   │
│  └────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           ↕ HTTP + cookies
┌─────────────────────────────────────────────────────────────┐
│ BACKEND (Next.js Route Handlers + Server-side)              │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐  │
│  │  Auth    │  │  Stories │  │  Coauthor Pipeline     │  │
│  │  Cookie  │  │  CRUD    │  │  ┌─────────────────┐   │  │
│  │  Session │  │  + sub-  │  │  │ Context Builder │   │  │
│  └──────────┘  │  recursos│  │  └────────┬────────┘   │  │
│                └──────────┘  │           ↓            │  │
│                              │  ┌─────────────────┐   │  │
│                              │  │ Prompt Templates│   │  │
│                              │  └────────┬────────┘   │  │
│                              │           ↓            │  │
│                              │  ┌─────────────────┐   │  │
│                              │  │  z-ai-web-dev-  │   │  │
│                              │  │      sdk        │   │  │
│                              │  └────────┬────────┘   │  │
│                              │           ↓            │  │
│                              │  ┌─────────────────┐   │  │
│                              │  │ Suggestion Guard│   │  │
│                              │  └─────────────────┘   │  │
│                              └────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           ↕ Prisma Client
┌─────────────────────────────────────────────────────────────┐
│ DATABASE (SQLite via Prisma ORM)                            │
│                                                             │
│  User → Story → ┬─ Character                                │
│                 ├─ Chapter                                  │
│                 ├─ TimelineEvent                            │
│                 ├─ ImportantEvent (suggestedBy: USER|COAUTHOR)│
│                 ├─ Annotation                               │
│                 └─ ChatSession → ChatMessage                │
└─────────────────────────────────────────────────────────────┘
```

### 📂 Estrutura de pastas

```
src/
├── app/
│   ├── api/
│   │   ├── auth/{login,register,logout,me}/
│   │   ├── stories/
│   │   │   ├── route.ts                    # GET, POST (lista + cria)
│   │   │   └── [id]/
│   │   │       ├── route.ts                # GET, PATCH, DELETE
│   │   │       ├── characters/[charId]/
│   │   │       ├── chapters/[chapId]/
│   │   │       ├── timeline/[evId]/
│   │   │       ├── events/[evId]/
│   │   │       ├── annotations/[annId]/
│   │   │       ├── chat/route.ts           # GET history + POST message
│   │   │       └── export/route.ts         # GET markdown export
│   │   ├── suggestions/[eventId]/{approve,reject}/
│   │   └── seed/route.ts                   # POST cria história de exemplo
│   ├── layout.tsx
│   └── page.tsx                            # SPA router (auth/dashboard/story)
├── components/
│   ├── bloom/
│   │   ├── auth-screen.tsx
│   │   ├── dashboard.tsx
│   │   ├── story-editor.tsx                # Layout 3 colunas
│   │   ├── story-sidebar.tsx
│   │   ├── coauthor-chat.tsx               # Chat com Flora
│   │   └── panels/
│   │       ├── characters-panel.tsx
│   │       ├── chapters-panel.tsx
│   │       ├── timeline-panel.tsx
│   │       ├── events-panel.tsx
│   │       └── annotations-panel.tsx
│   └── providers/
│       ├── auth-provider.tsx
│       └── query-provider.tsx
├── hooks/
│   ├── use-stories.ts                      # React Query hooks
│   └── use-chat.ts                         # Chat + suggestions
├── lib/
│   ├── api-client.ts                       # Wrapper fetch tipado
│   ├── auth.ts                             # Sessão cookie + HMAC
│   ├── db.ts                               # Prisma client
│   └── coauthor/
│       ├── context-builder.ts              # Serializa história → prompt
│       ├── prompt-templates.ts             # System prompt da Flora
│       ├── suggestion-guard.ts             # Extrai [SUGESTÃO_DE_EVENTO]
│       └── coauthor.service.ts             # Orquestra pipeline
├── stores/
│   ├── ui-store.ts                         # View atual, seção, sidebar
│   ├── story-store.ts                      # Cache de histórias
│   └── chat-store.ts                       # Mensagens + typing state
└── app/globals.css                         # Tema Jardim Romântico
```

## 🎀 Pipeline da Coautora Flora

1. **Cliente envia mensagem** via POST `/api/stories/[id]/chat`
2. **CoauthorService** é invocado com `storyId` + `userMessage`
3. **Context Builder** carrega do banco:
   - Título, descrição, status, gênero, tom
   - Todos os personagens (nome, descrição, função, traços)
   - Todos os capítulos (número, título, resumo, status)
   - Linha do tempo completa em ordem
   - Acontecimentos importantes aprovados + pendentes
   - Anotações agrupadas por categoria
   - Últimas 20 mensagens do chat
4. **Prompt Templates** monta o system prompt com o contexto injetado
5. **z-ai-web-dev-sdk** chama a IA com system + mensagens
6. **Suggestion Guard** analisa a resposta:
   - Detecta blocos `[SUGESTÃO_DE_EVENTO]...[/SUGESTÃO_DE_EVENTO]`
   - Também detecta marcadores inline órfãos
   - Suporta 3 formatos: pipe (`título | descrição | impacto`), estruturado (`Título: ... Descrição: ...`) e livre (primeira linha = título)
   - Persiste cada sugestão como `ImportantEvent` com `isApproved: false`, `suggestedBy: 'COAUTHOR'`
7. **Retorno**: `displayContent` (texto limpo) + `suggestions[]` (lista de sugestões persistidas)
8. **Cliente** renderiza mensagem + card de sugestão com botões Aprovar/Recusar
9. **Aprovação**: PATCH no evento → `isApproved: true` → React Query invalida cache → painel atualiza

## 🚀 Como executar localmente

```bash
# Instalar dependências
bun install

# Push do schema Prisma para SQLite
bun run db:push

# Iniciar dev server
bun run dev
```

Acesse `http://localhost:3000`.

### Credenciais demo
- Email: `demo@bloom.studio`
- Senha: `bloom-demo`

Ou clique em **"explorar com uma conta demo"** na tela de login.

### Criar história de exemplo
No dashboard, clique em **"História de exemplo"** para criar uma história completa com:
- 3 personagens (Helena, Tia Rosa, Miguel)
- 4 eventos cronológicos
- 2 capítulos (1 com conteúdo completo)
- 1 acontecimento importante aprovado
- 3 anotações (ideia, decisão, pergunta)
- Sessão de chat pronta para conversar com a Flora

## 🛠️ Stack técnico

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Linguagem | TypeScript 5 strict |
| Styling | Tailwind CSS 4 + tokens CSS customizados |
| Componentes | shadcn/ui (estilo New York) |
| Estado cliente | Zustand 5 |
| Cache servidor | TanStack Query 5 |
| Banco de dados | SQLite via Prisma ORM 6 |
| IA | z-ai-web-dev-sdk (chat completions) |
| Animações | Framer Motion |
| Ícones | Lucide React |
| Notificações | Sonner |
| Auth | Sessão cookie + HMAC SHA-256 |

## 📋 Modelagem de dados

9 modelos Prisma: `User`, `Story`, `Character`, `Chapter`, `TimelineEvent`, `ImportantEvent`, `Annotation`, `ChatSession`, `ChatMessage`.

**Destaques:**
- `ImportantEvent.suggestedBy`: `USER` ou `COAUTHOR` — rastreia origem da sugestão
- `ImportantEvent.isApproved`: `false` para sugestões pendentes da Flora
- `ChatMessage.suggestionRef`: vincula mensagem do assistente ao evento sugerido
- `ChatMessage.suggestionType`: tipo da sugestão (`IMPORTANT_EVENT`, etc.)

## 🎨 Aplicação da paleta Jardim Romântico

| Elemento | Cor |
|---|---|
| Sidebar | `#C48D9E` (rosa queimado antigo) com texto branco |
| Cards de história | `#FADADD` (pêssego rosado) com borda `#E6C2C7` |
| Botões primários / CTAs | Gradient `#C48D9E → #B24C63` |
| Títulos | `#4A2C3A` (vinho escuro) |
| Texto secundário | `#8B6B7A` (rosa acinzentado) |
| Background da página | `#FDF2F0` (bege rosado) com padrão floral sutil |
| Balão do usuário (chat) | `#D4818B` (rosa médio) com texto branco |
| Balão da Flora | `#FADADD` com borda decorativa |
| Sucesso (aprovar) | `#7EB8A2` (verde sálvia) |
| Erro (recusar) | `#D4818B` (rosa médio) |

## 📄 Licença

Projeto demonstrativo. Use livremente.

---

🌸 *Onde histórias florescem com gentileza* 🌷
