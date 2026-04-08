# Changelog — App Clientes Ágil Seguros

## Histórico de Desenvolvimento

---

### [v2.0] — Ciclo de Melhorias (Sessões anteriores + Sessão atual — 2026-04-08)

---

## Banco de Dados (SQL executado no Supabase)

```sql
-- Tabela de apólices
CREATE TABLE public.apolices (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  segmento TEXT NOT NULL CHECK (segmento IN (
    'SAUDE_VIDA_ODONTO','AUTO_FROTA','VIAGEM','RESIDENCIAL',
    'PET_SAUDE','EMPRESARIAL','CARGAS','EQUIPAMENTOS'
  )),
  numero_apolice TEXT, seguradora TEXT,
  vigencia_inicio DATE, vigencia_fim DATE,
  valor_premio NUMERIC(12,2), descricao TEXT, contrato_url TEXT,
  ativo BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.apolices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON public.apolices FOR ALL USING (true) WITH CHECK (true);

-- Flag de primeiro acesso
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
```

---

## Autenticação & Segurança

- **Primeiro acesso obrigatório**: ao criar qualquer usuário (CLIENTE, ADM, CEO), o campo `must_change_password = true` é salvo. No login, se verdadeiro, o sistema redireciona para `/force-change-password`
- **Requisitos de senha** (validados em todos os modais de senha — CEO, ADM, CLIENTE):
  - Mínimo 6 caracteres
  - 1 letra maiúscula
  - 1 letra minúscula
  - 1 número
  - 1 caractere especial
  - Requisitos exibidos **sempre visíveis** com ✓/○ em tempo real
- **Somente CEO pode criar outra conta CEO** — seletor de perfil no modal de criação mostra `ADM` e `CEO`
- **Senhas em bcrypt**: todas as senhas são hasheadas com `bcryptjs`. Login com senha plain text migra automaticamente para bcrypt no primeiro acesso

---

## Páginas Novas

### `ForceChangePassword.jsx` (`/force-change-password`)
- Exibida no primeiro login de qualquer conta nova
- Fundo degradê, logo, card com requisitos de senha em tempo real (CheckCircle2/XCircle)
- Ao salvar: atualiza senha + seta `must_change_password = false`
- Redireciona para o dashboard correto por perfil

---

## Painel ADM (`/admin`) — `AdminDashboard.jsx`

- **Cadastro de cliente Pessoa Física (CPF)**:
  - Auto-detecção CPF vs CNPJ por contagem de dígitos (11 = CPF, 14 = CNPJ)
  - Campo data de nascimento (PF)
  - CEP com busca automática ViaCEP (preenche rua, bairro, cidade, estado automaticamente)
  - Campos número e complemento
- **Botão Filial**: oculto para Pessoa Física; exibe texto "Filial" sem ícone para PJ
- **Cards de clientes**: label CPF/CNPJ automático conforme tipo
- **Criação de usuário**: `must_change_password: true` definido automaticamente

---

## Painel Segmento — Admin (`/admin/cliente/:id/segmento/:seg`) — `AdminSegmentoPage.jsx`

- **Todos os segmentos** (incluindo Saúde, Vida e Odonto) agora carregam apólices do banco ao entrar na página — resolvendo o bug de apólice "sumindo" ao voltar
- **Saúde, Vida e Odonto (SVD)**: fluxo alterado para apólice-primeiro:
  - Lista apólices cadastradas com botão **Acessar** → navega para `/apolice/:id`
  - Sem apólice: mensagem clara + botão "Registrar Apólice"
  - Beneficiários, Solicitações e Coparticipação ficam **dentro** da apólice
- **Segmentos não-SVD**: exibem lista de apólices com status de vigência, contrato PDF, editar/excluir
- **Cards de segmento** redesenhados com estilo do site: `rounded-3xl`, ícone `bg-[#003580]/10`, botão azul

---

## Painel do Cliente — Admin (`/admin/cliente/:id`) — `AdminClientePage.jsx`

- Label CPF/CNPJ com detecção automática e aplicação de máscara correta
- Seção de filiais oculta para Pessoa Física
- Cards de segmento redesenhados (estilo site)

---

## Apólice Dashboard (`/apolice/:id`) — `ApoliceDashboard.jsx`

- **Tabs para todos os perfis** (CEO, ADM, CLIENTE):
  - **Apólice**: dados completos (número, seguradora, vigência, valor, contrato PDF)
  - **Beneficiários**: lista prévia com status Ativo/Inativo + botão "Gerenciar" (admin) ou "Ver" (cliente)
  - **Solicitações**: lista prévia com badge de status + contador de pendentes
  - **Coparticipação**: acesso direto à página de coparticipação
- Dados de beneficiários e solicitações carregados por `empresa_id` da apólice
- Admin: botões navegam para páginas de gestão completa
- Cliente: botões navegam para `/cliente/:id` e `/cliente/:id/coparticipacao`

---

## Seleção de Segmento — Cliente (`/select-segmento`) — `SelectSegmento.jsx`

- **Fundo degradê** (`bg-soft-gradient`) em toda a página
- **Header transparente** integrado ao degradê (sem borda/shadow)
- **Logo 3× maior** (h-24)
- **Nome da empresa** exibido no lugar do email
- **Segmentos disponíveis**: exibe apenas segmentos que possuem apólices cadastradas
- **Novos segmentos adicionados**: CARGAS e EQUIPAMENTOS
- **Navegação SVD**: corrigida para `/select-apolice/SAUDE_VIDA_ODONTO` (igual aos outros segmentos)
- **Suporte a PF**: usa `user.empresa_id || user.empresa_matriz_id` para localizar empresa (resolve "Nenhuma empresa vinculada")
- **Menu "Minha Conta"** com:
  - Alterar Senha (modal com requisitos sempre visíveis)
  - Dados Pessoais/Empresa (modal com busca de CEP por ViaCEP)
  - Sair
- **Textos brancos** (título, subtítulo, botões)

---

## Seleção de Apólice — Cliente (`/select-apolice/:segmento`) — `SelectApolice.jsx`

- **Suporte a PF**: usa `user.empresa_id || user.empresa_matriz_id`
- Fundo degradê, header transparente, logo h-24
- Cards `rounded-3xl` com status de vigência, badge, botão Acessar

---

## Layout Global — `DashboardLayout.jsx`

- **Fundo**: `bg-soft-gradient` em toda a aplicação
- **Header**: transparent + `z-40` (sem sticky, sem shadow, integrado ao degradê)
- **Logo**: imagem correta `storage.googleapis.com/...`
- **CLIENTE**: logo leva para `/select-segmento` (corrigido de `/select-company`)
- **Trocar CNPJ**: visível apenas para CLIENTE em dashboard de cliente
- **Modal Alterar Senha**: requisitos de senha sempre visíveis, validação com `validatePasswordStrength()`
- **Data/hora** de Brasília visível no header (desktop)

---

## Gerenciamento de Usuários — CEO (`CEODashboard.jsx`)

- **Seletor de perfil** no modal de criação: ADM | CEO
- **Lista de usuários**: exibe tanto ADMs quanto CEOs (badge de perfil)
- `must_change_password: true` para todos os usuários criados
- **Password strength** visível no modal de criação de usuário

---

## Utilitários

### `src/lib/userValidator.js`
- `validatePasswordStrength(password)`: retorna array de erros por requisito
- `cleanUserData()`: inclui campo `must_change_password`

### `src/lib/masks.js`
- `applyCpfMask`, `applyCnpjMask`, `applyCepMask`

---

## Rotas (`App.jsx`)

```
/login                            → LoginPage
/force-change-password            → ForceChangePassword (todos os perfis)
/ceo                              → CEODashboard (CEO)
/admin                            → AdminDashboard (CEO, ADM)
/admin/cliente/:matrizId          → AdminClientePage (CEO, ADM)
/admin/cliente/:matrizId/segmento/:segmento → AdminSegmentoPage (CEO, ADM)
/solicitacoes                     → SolicitacoesPage (CEO, ADM)
/coparticipacao                   → CoparticipacaoPage (CEO, ADM)
/cliente/:empresaId               → ClientDashboard (CEO, ADM, CLIENTE)
/cliente/:empresaId/coparticipacao → CoparticipacaoClientePage (CEO, ADM, CLIENTE)
/select-segmento                  → SelectSegmento (CLIENTE)
/select-apolice/:segmento         → SelectApolice (CLIENTE)
/apolice/:apoliceId               → ApoliceDashboard (CEO, ADM, CLIENTE)
/select-company                   → SelectCompanyPage (ADM, CEO)
```

---

## Identidade Visual

- **Cor primária**: `#003580` (azul escuro Ágil)
- **Gradiente de fundo**: `bg-soft-gradient` → `linear-gradient(135deg, #003580 0%, #1a5599 100%)`
- **Logo**: `https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png`
- **Cards**: `bg-white border border-gray-100 rounded-3xl shadow-md`
- **Ícones de segmento**: `w-12 h-12 rounded-2xl bg-[#003580]/10`
- **Textos sobre degradê**: `text-white` / `text-white/80` / `text-white/70`
