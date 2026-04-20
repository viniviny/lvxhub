# Auditoria de Segurança RLS — LVX Hub / Publify

## Como rodar

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione o projeto **lvxhub** (ID: `vfvdhidfjokxeqeenlrj`)
3. No menu lateral, clique em **SQL Editor**
4. Abra o arquivo `rls-audit.sql` e execute cada bloco separadamente (selecione o bloco e clique em **Run**)

---

## Como interpretar os resultados

### Bloco 1 — Policies "allow all"
| Resultado | Significado |
|-----------|-------------|
| 0 linhas | OK — nenhuma policy aberta encontrada |
| 1+ linhas | **CRÍTICO** — existe policy que libera acesso irrestrito. Execute o bloco `FIX IF NEEDED` imediatamente. |

### Bloco 2 — Tabelas sem RLS
| Resultado | Significado |
|-----------|-------------|
| 0 linhas | OK — todas as tabelas têm RLS habilitado |
| 1+ linhas | **RISCO** — tabelas listadas ficam acessíveis sem restrição de linha. Habilite com `ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;` |

### Bloco 3 — Lista geral de policies
Revise se cada policy faz sentido:
- Policies de `SELECT/INSERT/UPDATE/DELETE` devem filtrar por `auth.uid() = user_id` (ou coluna equivalente)
- Policies com `qual = 'true'` ou `with_check = 'true'` são abertas — veja Bloco 1

### Bloco 4 — shopify_connections
| O que verificar |
|-----------------|
| Deve haver policy de `SELECT` com `qual` contendo `auth.uid()` |
| Deve haver policy de `INSERT` com `with_check` contendo `auth.uid()` |
| Não deve haver nenhuma policy com `qual = 'true'` |

---

## O que fazer se encontrar problemas

### Policy aberta encontrada (Bloco 1 ou Bloco 4)
Execute o bloco `FIX IF NEEDED` do arquivo `rls-audit.sql` no SQL Editor.

### Tabela sem RLS (Bloco 2)
```sql
ALTER TABLE public.<nome_da_tabela> ENABLE ROW LEVEL SECURITY;
```
Depois crie as policies adequadas para a tabela.

### Policy sem filtro de usuário (Bloco 3)
Remova a policy aberta e recrie com filtro correto. Exemplo para `shopify_connections`:
```sql
-- Remover policy insegura
DROP POLICY IF EXISTS "<nome_da_policy>" ON public.shopify_connections;

-- Recriar com filtro de usuário
CREATE POLICY "Users can only access their own shopify connections"
ON public.shopify_connections
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## Referências
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/row-level-security)
- [pg_policies reference](https://www.postgresql.org/docs/current/view-pg-policies.html)
