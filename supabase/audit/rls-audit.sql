-- =============================================================
-- LVX Hub / Publify — Auditoria de Segurança RLS
-- Rodar manualmente no SQL Editor do Supabase Dashboard
-- =============================================================


-- ---------------------------------------------------------------
-- BLOCO 1: Verificar policies "allow all" ainda ativas
-- Resultado esperado: 0 linhas. Qualquer linha aqui é risco crítico.
-- ---------------------------------------------------------------
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual::text = 'true' OR with_check::text = 'true');


-- ---------------------------------------------------------------
-- BLOCO 2: Tabelas sem RLS habilitado
-- Resultado esperado: 0 linhas. Tabelas aqui ficam expostas para
-- qualquer usuário autenticado (ou anônimo, dependendo das grants).
-- ---------------------------------------------------------------
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;


-- ---------------------------------------------------------------
-- BLOCO 3: Listar todas as policies ativas por tabela
-- Use para inspecionar se as regras fazem sentido para cada tabela.
-- ---------------------------------------------------------------
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ---------------------------------------------------------------
-- BLOCO 4: Verificar proteção específica de shopify_connections
-- Deve ter policies que filtram por auth.uid() = user_id (ou similar).
-- Policies sem filtro de usuário são risco crítico.
-- ---------------------------------------------------------------
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'shopify_connections';


-- =============================================================
-- FIX IF NEEDED
-- EXECUTAR APENAS SE A AUDITORIA ACIMA MOSTRAR POLICIES ABERTAS
-- =============================================================

-- Remover policy aberta em shopify_connections (se ainda existir)
DROP POLICY IF EXISTS "Allow all access to shopify_connections" ON public.shopify_connections;
DROP POLICY IF EXISTS "Allow all access" ON public.shopify_connections;
