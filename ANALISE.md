# Análise Técnica — app-clientes-agil

> Gerado em: 2026-04-01 | Atualizado: 2026-04-07

---

## Infraestrutura e Deploy

| Item | URL / Info |
|---|---|
| GitHub | https://github.com/GabrielMiranda16/agil-seguros |
| Domínio | https://segurosagil.app |
| Vercel (produção) | https://app-clientes-agil.vercel.app |
| Vercel (painel) | https://vercel.com/gabrielmiranda-webs-projects/app-clientes-agil |
| Banco de dados | Supabase — https://supabase.com (projeto: ersrbtyrwlljhkomqfpk) |

### Como fazer um novo deploy

Qualquer push para o branch `main` no GitHub já aciona o deploy automático no Vercel.

```bash
git add .
git commit -m "sua mensagem"
git push
```

### Variáveis de ambiente (Vercel)

Configuradas diretamente no painel do Vercel em Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Novo Fluxo do ADM (implementado em 2026-04-07)

### Visão geral do fluxo

```
/admin
  └── Busca de cliente (CNPJ, nome empresa, nome pessoa, CPF)
        └── [não encontrou] → Criar Novo Cliente (modal)
        └── [encontrou] → /admin/cliente/:matrizId
              └── Informações do cliente + filiais
              └── Grid de 8 segmentos
                    └── Clica no segmento → /admin/cliente/:matrizId/segmento/:segmento
```

### Tela 1 — `/admin` (AdminDashboard)

- **Campo de busca** no topo: busca por CNPJ, nome da empresa, nome do beneficiário, CPF
- **3 cards de métricas grandes** (interativos):
  - Total de Clientes
  - Apólices Ativas
  - Solicitações Pendentes (vermelho + clicável quando há pendências)
- **Lista de empresas/clientes** com:
  - Badge de alerta vermelho com contagem de solicitações pendentes (matriz + filiais)
  - Botão "Acessar" → vai para `/admin/cliente/:matrizId`
  - Botão de edição de credenciais do cliente
  - Botão de exclusão
- Botão **"Novo Cliente"** (cria empresa matriz + conta de acesso)

> As solicitações aparecem como alerta por empresa. Somente o ADM visualiza.

### Tela 2 — `/admin/cliente/:matrizId` (AdminClientePage)

- **Breadcrumb** de navegação
- **Card de informações** do cliente: razão social, nome fantasia, CNPJ, endereço, e-mail, filiais
- **Grid de 8 segmentos** (cards clicáveis):

| Segmento | Chave | Ícone | Cor |
|---|---|---|---|
| Saúde, Vida e Odonto | SAUDE_VIDA_ODONTO | HeartPulse | Azul |
| Auto e Frota | AUTO_FROTA | Car | Laranja |
| Viagem | VIAGEM | Plane | Céu |
| Residencial | RESIDENCIAL | Home | Verde |
| Pet Saúde | PET_SAUDE | PawPrint | Rosa |
| Empresarial | EMPRESARIAL | Building2 | Roxo |
| Cargas | CARGAS | Package | Âmbar |
| Equipamentos | EQUIPAMENTOS | Monitor | Cinza |

- Cada card exibe: contagem de apólices (ou beneficiários para Saúde/Vida/Odonto)
- Badge de alerta de solicitações pendentes (somente Saúde/Vida/Odonto)
- ADM pode adicionar filial a partir desta tela

### Tela 3A — Saúde, Vida e Odonto

**Rota:** `/admin/cliente/:matrizId/segmento/saude-vida-odonto`

- Mostra cards por empresa: **Matriz primeiro**, depois **Filiais**
- Cada card de empresa:
  - Nome + CNPJ
  - Contagem de beneficiários + badge de solicitações pendentes
  - Botão **"Beneficiários"** → `/cliente/:empresaId` (ClientDashboard existente)
    - Solicitações ficam **dentro de cada beneficiário** como já está
  - Botão **"Coparticipação"** → `/coparticipacao` (define empresa no contexto)
- ADM pode criar apólice (número + seguradora) para registrar a apólice do plano

> Saúde, Vida e Odonto **não tem** Valor do Prêmio nem PDF do contrato no formulário de apólice.

### Tela 3B — Outros segmentos

**Rota:** `/admin/cliente/:matrizId/segmento/:segmento`

- Apólices agrupadas: **Matriz primeiro**, depois **cada Filial**
- Cada apólice exibe: número, seguradora, vigência início/fim, status (verde/amarelo/vermelho)
- ADM pode: criar, editar, excluir apólices
- **Não tem** solicitações nem coparticipação (exclusivo de Saúde/Vida/Odonto)

### Regras de negócio por segmento

| Recurso | Saúde/Vida/Odonto | Outros segmentos |
|---|---|---|
| Beneficiários | ✅ (ClientDashboard) | ❌ |
| Solicitações | ✅ (dentro de cada beneficiário) | ❌ |
| Coparticipação | ✅ (aba por empresa) | ❌ |
| Apólice — Número + Seguradora | ✅ | ✅ |
| Apólice — Vigência + Valor + PDF | ❌ | ✅ |

---

## Database — Alterações necessárias

### Tabela `apolices` — atualizar CHECK constraint

A constraint atual não inclui os novos segmentos. Executar no Supabase SQL Editor:

```sql
ALTER TABLE apolices DROP CONSTRAINT IF EXISTS apolices_segmento_check;
ALTER TABLE apolices ADD CONSTRAINT apolices_segmento_check
  CHECK (segmento IN (
    'SAUDE_VIDA_ODONTO',
    'AUTO_FROTA',
    'VIAGEM',
    'RESIDENCIAL',
    'PET_SAUDE',
    'EMPRESARIAL',
    'CARGAS',
    'EQUIPAMENTOS'
  ));
```

---

## Feature: Segmentos e Apólices (branch feat/segmentos)

### Fluxo do cliente (sem alteração)
```
Login → Selecionar Segmento → Selecionar Apólice → Dashboard do segmento
```
- **Saúde, Vida e Odonto** → fluxo atual (select CNPJ → beneficiários)
- **Outros segmentos** → cards de apólices → detalhes da apólice

### Segmentos disponíveis
| Segmento | Chave | Ícone |
|---|---|---|
| Saúde, Vida e Odonto | SAUDE_VIDA_ODONTO | HeartPulse (azul) |
| Auto e Frota | AUTO_FROTA | Car (laranja) |
| Viagem | VIAGEM | Plane (céu) |
| Residencial | RESIDENCIAL | Home (verde) |
| Pet Saúde | PET_SAUDE | PawPrint (rosa) |
| Empresarial | EMPRESARIAL | Building2 (roxo) |
| Cargas | CARGAS | Package (âmbar) |
| Equipamentos | EQUIPAMENTOS | Monitor (cinza) |

### Novos arquivos criados
- `src/services/apolicesService.js` — CRUD de apólices + upload de PDF + status de vigência
- `src/pages/SelectSegmento.jsx` — seleção de segmento pós-login (cliente)
- `src/pages/SelectApolice.jsx` — listagem de apólices por segmento (cliente)
- `src/pages/ApoliceDashboard.jsx` — detalhes completos da apólice (cliente)
- `src/pages/AdminClientePage.jsx` — perfil do cliente + grid de segmentos (ADM)
- `src/pages/AdminSegmentoPage.jsx` — apólices por segmento agrupadas por empresa (ADM)

### Arquivos modificados
- `src/App.jsx` — novas rotas `/admin/cliente/:matrizId`, `/admin/cliente/:matrizId/segmento/:segmento`
- `src/pages/AdminDashboard.jsx` — refatorado: busca + métricas + lista de clientes com alertas

### Alertas automáticos de vencimento
- Verde: apólice ativa (mais de 30 dias)
- Amarelo: vencendo em ≤ 30 dias
- Vermelho: vencida

---

## Visão Geral

O **app-clientes-agil** é uma aplicação web de gestão de clientes para uma corretora de seguros chamada **Ágil Seguros**. Permite gerenciar empresas, beneficiários, planos (saúde, vida, odonto), solicitações e coparticipações. O sistema tem três níveis de acesso: CEO, Administrador e Cliente.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18.2.0 + Vite 4.4.5 |
| Roteamento | React Router DOM 6.16.0 |
| Backend / Banco | Supabase (PostgreSQL + BaaS) |
| UI | Shadcn/ui + Radix UI + Tailwind CSS 3.3.3 |
| Ícones | Lucide React |
| Animações | Framer Motion |
| Gráficos | Recharts |
| Exportação | jsPDF + jspdf-autotable + XLSX |
| Datas | date-fns |
| Máscaras de input | react-input-mask |

---

## Estrutura de Pastas

```
app-clientes-agil/
├── src/
│   ├── pages/           # Páginas principais
│   ├── components/      # Componentes reutilizáveis
│   │   └── ui/          # 58 componentes Shadcn/ui
│   ├── contexts/        # React Context (Auth, Company)
│   ├── hooks/           # Hooks customizados
│   ├── services/        # Camada de acesso ao Supabase
│   ├── lib/             # Utilitários e validadores
│   ├── App.jsx          # Roteamento principal
│   └── main.jsx         # Entry point
├── public/
├── plugins/             # Plugins customizados do Vite
├── .env.local           # Variáveis de ambiente
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Funcionalidades por Perfil

### CEO (`/ceo`)
- Métricas e analytics globais do sistema
- Gerenciamento de usuários e empresas (matriz/filial)
- Visão de todas as solicitações
- Acompanhamento de coparticipações
- Criação de contas de administrador
- Gráficos de barras, linha e pizza (Recharts)

### Administrador (`/admin`)
- Busca de clientes (CNPJ, nome empresa, nome pessoa, CPF)
- Criação de novos clientes (empresa + conta de acesso)
- Visão de solicitações pendentes por empresa (alertas)
- Gestão de segmentos e apólices por cliente
- Acesso ao ClientDashboard (Saúde/Vida/Odonto) pelo fluxo de segmentos

### Cliente (`/cliente/:empresaId`)
- Visualização e CRUD de beneficiários da empresa
- Criação de solicitações (saúde, vida, odonto)
- Acompanhamento de coparticipações
- Exportação de dados para PDF
- Ativação/inativação de planos

---

## Banco de Dados (Supabase)

### Tabelas identificadas

**`users`**
- `id`, `email`, `password`, `name`, `perfil` (CEO / ADM / CLIENTE), `empresa_id`, `empresa_matriz_id`, `ativo`

**`empresas`**
- `id`, `razao_social`, `nome_fantasia`, `cnpj`, `tipo` (MATRIZ / FILIAL), `empresa_matriz_id`, `endereco_completo`, `email_cliente`, `ativo`

**`beneficiarios`**
- Dados pessoais: `nome_completo`, `cpf`, `parentesco`, `data_nascimento`, `nome_mae`, `nome_titular`
- Contato: `celular`, `email_beneficiario`
- Endereço: `cep`, `rua`, `numero`, `complemento`, `bairro`, `cidade`, `estado`
- Emprego: `matricula_empresa`, `data_admissao`, `situacao`, `observacoes`
- Planos (saúde/vida/odonto, prefixo por tipo): `*_ativo`, `*_plano_nome`, `*_acomodacao`, `*_data_inclusao`, `*_data_exclusao`, `*_numero_carteirinha`, `*_valor_fatura`, `*_coparticipacao`, `*_codigo_empresa`, `*_produto`, `*_link_carteirinha`
- Sistema: `data_inatividade`, `data_afastamento`, `motivo_afastamento`, `data_exclusao`

**`solicitacoes`**
- `id`, `empresa_id`, `beneficiario_id`, `tipo_solicitacao`, `status` (PENDENTE / EM PROCESSAMENTO / CONCLUIDA / REJEITADA), `data_solicitacao`, `tipo_plano`, `motivo`, `observacoes`, `dados_exclusao`, `data_aprovacao`, `data_rejeicao`, `motivo_rejeicao`

**`coparticipacoes`**
- `id`, `empresa_id`, `beneficiario_id`, `competencia`, `valor`, `descricao`, `nome_quem_utilizou`, `cpf_quem_utilizou`, `data_registro`

**`apolices`**
- `id`, `empresa_id`, `segmento`, `numero_apolice`, `seguradora`, `vigencia_inicio`, `vigencia_fim`, `valor_premio`, `contrato_url`, `descricao`, `ativo`, `created_at`

---

## Próximo passo — Domínio personalizado

O domínio está na **GoDaddy**. Para apontar para o Vercel:

1. Acessar o painel do Vercel: https://vercel.com/gabrielmiranda-webs-projects/app-clientes-agil/settings/domains
2. Adicionar o domínio desejado (ex: `app.agil.com.br`)
3. O Vercel vai fornecer os registros DNS para configurar na GoDaddy:
   - Tipo `A` → apontando para o IP do Vercel
   - ou tipo `CNAME` → apontando para `cname.vercel-dns.com`
4. Acessar o painel da GoDaddy → DNS → adicionar os registros fornecidos pelo Vercel
5. Aguardar propagação (pode levar até 48h, mas normalmente < 1h)

> Domínio configurado: **segurosagil.app** ✓

---

## Problemas Identificados

### Críticos (corrigir antes de produção)

#### 1. Senhas em texto puro
- As senhas são armazenadas e comparadas em **texto puro no banco de dados**
- **Solução:** Migrar para o sistema de autenticação nativo do Supabase Auth

#### 2. Credenciais expostas no código
- A chave anônima do Supabase é embutida no bundle final
- **Solução:** Ativar RLS (Row Level Security) no Supabase

#### 3. Sessão sem validação real
- Dados do usuário vêm do `localStorage` sem verificação server-side
- **Solução:** Usar tokens JWT do Supabase Auth

### Médios

#### 4. Componentes muito grandes
- `SolicitacoesPage.jsx` ~1179 linhas, `ClientDashboard.jsx` ~1005 linhas

#### 5. Sem paginação nas queries
- `getAllBeneficiarios()` busca todos os registros de uma vez

#### 6. Sem testes
- Nenhum arquivo de teste encontrado

---

## Resumo Executivo

O app está bem construído para um MVP com UI polida, arquitetura modular e funcionalidades completas. O fluxo do ADM foi completamente redesenhado em 2026-04-07 para ser centrado no cliente, com busca unificada e navegação clara por segmentos.

### Prioridades de melhoria

| Prioridade | Item |
|---|---|
| 🔴 Urgente | Executar SQL para atualizar constraint da tabela `apolices` (novos segmentos) |
| 🔴 Urgente | Migrar autenticação para Supabase Auth (hashing de senhas) |
| 🔴 Urgente | Ativar RLS no Supabase |
| 🟡 Médio | Dividir componentes grandes |
| 🟡 Médio | Adicionar paginação nas queries |
| 🟢 Baixo | Migrar para TypeScript |
| 🟢 Baixo | Adicionar testes com Vitest |
| 🟢 Baixo | Lazy loading de rotas |
