# Camisetaria — Frontend (Etapa 3: Base, Layout e Navegação)

Stack: **Vite + React + TypeScript + Tailwind CSS**, conectado ao projeto
Supabase `SistemaCamisetaria` (backend entregue na Etapa 2).

## O que esta etapa entrega

- Estrutura do projeto (Vite/TS/Tailwind) pronta para rodar.
- Client Supabase configurado (`src/lib/supabase.ts`).
- Tipos TypeScript do banco (`src/types/database.ts`) — sem `any`.
- Autenticação real via Supabase Auth (`src/contexts/AuthContext.tsx`),
  carregando o `profile` (nome, role, ativo) da tabela `profiles`.
- Proteção de rotas: `ProtectedRoute` (exige login) e `AdminRoute`
  (exige `role = admin`), refletindo as mesmas regras já aplicadas via RLS
  no banco — a UI apenas evita mostrar o que o banco já bloqueia.
- Layout base: sidebar de navegação (sensível ao papel do usuário) + topbar
  com nome/role/logout.
- Páginas de todas as seções do sistema, como placeholders com estado
  vazio explicativo — **sem dados reais ainda**, conforme o escopo desta
  etapa (Frontend Base, Layout e Navegação).

**Não implementado nesta etapa** (ficam para a Etapa 4): listagem/formulário
de pedidos, quadro Kanban funcional, cadastro de clientes/produtos/tamanhos,
upload de artes, lançamento de pagamentos.

## Como rodar localmente

Pré-requisitos: Node.js 18+ e npm.

```bash
cd camisetaria-frontend
cp .env.example .env
npm install
npm run dev
```

O app sobe em `http://localhost:5173`.

As variáveis em `.env.example` já apontam para o projeto Supabase real da
Etapa 2 (`SistemaCamisetaria`) e usam a **publishable key**, que é segura
para expor no frontend — o controle de acesso real está nas políticas de
RLS do banco, não nesta chave.

## Criando o primeiro usuário administrador

O banco não tem seed de senha (por design — ver Etapa 2). Para criar o
primeiro admin:

1. No painel do Supabase, vá em **Authentication → Users → Add user** e
   crie um usuário com e-mail/senha (ou peça para a pessoa se cadastrar,
   se você implementar uma tela de signup depois).
2. O trigger `handle_new_user()` cria automaticamente uma linha em
   `profiles` com `role = funcionario`.
3. Promova esse usuário a admin rodando no SQL Editor do Supabase:
   ```sql
   update public.profiles set role = 'admin' where email = 'voce@empresa.com';
   ```
4. Faça login normalmente na tela `/login` do app.

## Estrutura de pastas

```
src/
  lib/supabase.ts          client do Supabase
  types/database.ts        tipos das tabelas (Etapa 2)
  contexts/AuthContext.tsx sessão + perfil do usuário
  routes/                  guards de rota (autenticado / admin)
  layouts/AppLayout.tsx    shell com sidebar + topbar
  components/              Sidebar, Topbar, EmptyState
  pages/                   uma página por seção do sistema
```

## Próxima etapa

Aguardando aprovação para iniciar a **Etapa 4**, que deve substituir os
`EmptyState` de cada página pelos dados reais (listagens, formulários,
Kanban funcional), consumindo as tabelas via Supabase JS já tipado.
