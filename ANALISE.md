# Análise Técnica — app-clientes-agil

> Gerado em: 2026-04-01

---

## Infraestrutura e Deploy

| Item | URL / Info |
|---|---|
| GitHub | https://github.com/GabrielMiranda16/agil-seguros |
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

O arquivo `.env.local` **não vai para o GitHub** (está no .gitignore). Ao trabalhar em outro PC, crie o `.env.local` manualmente com os valores acima.

### Clonar e rodar em outro PC

```bash
git clone https://github.com/GabrielMiranda16/agil-seguros.git
cd agil-seguros
npm install
# crie o arquivo .env.local com as credenciais do Supabase
npm run dev
```

### Próximo passo — Domínio personalizado

O domínio está na **GoDaddy**. Para apontar para o Vercel:

1. Acessar o painel do Vercel: https://vercel.com/gabrielmiranda-webs-projects/app-clientes-agil/settings/domains
2. Adicionar o domínio desejado (ex: `app.agil.com.br`)
3. O Vercel vai fornecer os registros DNS para configurar na GoDaddy:
   - Tipo `A` → apontando para o IP do Vercel
   - ou tipo `CNAME` → apontando para `cname.vercel-dns.com`
4. Acessar o painel da GoDaddy → DNS → adicionar os registros fornecidos pelo Vercel
5. Aguardar propagação (pode levar até 48h, mas normalmente < 1h)

> Pendente: definir qual domínio será usado.

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
- Gestão de usuários
- CRUD de empresas e filiais
- Gestão de beneficiários
- Gestão de solicitações com filtros

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

---

## Serviços (camada de acesso ao Supabase)

| Serviço | Métodos principais |
|---|---|
| `AuthService` | `loginUser`, `createUser`, `updateUser`, `deleteUser`, `logoutUser` |
| `EmpresasService` | `getEmpresas`, `createEmpresa`, `updateEmpresa`, `deleteEmpresa` |
| `BeneficiariosService` | `getAllBeneficiarios`, `getBeneficiariosByEmpresa`, `createBeneficiario`, `updateBeneficiario`, `deleteBeneficiario` |
| `SolicitacoesService` | `getAllSolicitacoes`, `getSolicitacoesByEmpresa`, `createSolicitacao`, `updateSolicitacao`, `deleteSolicitacao` |
| `CoparticipacaoService` | `getAllCoparticipacoes`, `getCoparticipacoesByEmpresa`, `createCoparticipacao`, `updateCoparticipacao`, `deleteCoparticipacao` |

---

## Autenticação e Autorização

- **AuthContext** gerencia o estado do usuário com persistência em `localStorage`
- Roles verificados via `ProtectedRoute` (`allowedRoles`)
- Redirecionamento para `/unauthorized` em caso de acesso não autorizado
- Dois contextos de auth existem no projeto: `AuthContext.jsx` e `SupabaseAuthContext.jsx` — apenas um parece ser utilizado ativamente

---

## Gerenciamento de Estado

- **AuthContext** — usuário logado, lista de usuários, empresas matriz
- **CompanyContext** — empresa selecionada (via `useLocalStorage`)
- Estado local por página (sem Redux ou Zustand)
- Dados persistidos em `localStorage`: chave `user` e `selectedCompanyId`

---

## Páginas e Tamanho

| Página | Arquivo | Linhas (aprox.) |
|---|---|---|
| Login | `Login.jsx` | 125 |
| CEO Dashboard | `CEODashboard.jsx` | 590 |
| Admin Dashboard | `AdminDashboard.jsx` | 373 |
| Client Dashboard | `ClientDashboard.jsx` | 1005 |
| Solicitações | `SolicitacoesPage.jsx` | 1179 |
| Coparticipação Admin | `CoparticipacaoPage.jsx` | 592 |
| Coparticipação Cliente | `CoparticipacaoClientePage.jsx` | 381 |
| Seleção de Empresa | `SelectCompany.jsx` | 206 |
| Acesso negado | `Unauthorized.jsx` | 24 |

---

## Pontos Positivos

- Arquitetura de serviços modular e separada da UI
- Validação e sanitização de inputs (CPF, CNPJ, CEP, telefone com máscaras)
- Feedback de erros com notificações toast
- Controle de acesso por role bem definido
- UI moderna, responsiva e com animações
- Exportação para PDF e Excel já implementada
- Preenchimento automático de endereço via CEP

---

## Problemas Identificados

### Críticos (corrigir antes de produção)

#### 1. Senhas em texto puro
- As senhas são armazenadas e comparadas em **texto puro no banco de dados**
- Nenhum hash (bcrypt, argon2, etc.) é utilizado
- A comparação acontece diretamente no client-side
- **Solução:** Migrar para o sistema de autenticação nativo do Supabase Auth

#### 2. Credenciais expostas no código
- A URL e a chave anônima do Supabase estão no `.env.local` mas são embutidas no bundle final
- Qualquer pessoa inspecionando o JS pode extrair essas chaves
- **Solução:** Ativar RLS (Row Level Security) no Supabase para restringir acesso por usuário mesmo com a chave pública

#### 3. Sessão sem validação real
- Dados do usuário vêm do `localStorage` sem verificação server-side no carregamento
- Um usuário pode manipular o `localStorage` para escalar privilégios
- **Solução:** Usar tokens JWT do Supabase Auth e validar a sessão a cada carregamento

---

### Médios

#### 4. Componentes muito grandes
- `SolicitacoesPage.jsx` tem ~1179 linhas, `ClientDashboard.jsx` ~1005 linhas
- Dificulta manutenção, testes e reúso
- **Solução:** Dividir em subcomponentes (ex: `BeneficiarioForm`, `SolicitacaoTable`, etc.)

#### 5. Dois AuthContexts duplicados
- `AuthContext.jsx` e `SupabaseAuthContext.jsx` coexistem
- Gera confusão sobre qual é o padrão
- **Solução:** Remover o que não está em uso

#### 6. Sem paginação nas queries
- `getAllBeneficiarios()` e similares buscam todos os registros de uma vez
- Com escala, pode travar a interface ou exceder limites do Supabase
- **Solução:** Implementar paginação com `.range()` do Supabase

#### 7. Sem testes
- Nenhum arquivo de teste encontrado no projeto
- **Solução:** Adicionar testes unitários com Vitest

---

### Baixos

#### 8. Sem TypeScript
- O projeto usa JavaScript puro, sem tipagem
- Erros de tipo só aparecem em runtime

#### 9. Sem lazy loading de rotas
- Todas as páginas carregam no bundle inicial
- **Solução:** Usar `React.lazy` + `Suspense` nas rotas

#### 10. Acessibilidade limitada
- Labels ARIA mínimos
- Contraste de cores não verificado formalmente

---

## Resumo Executivo

O app está bem construído para um MVP com UI polida, arquitetura modular e funcionalidades completas para o negócio. O principal risco é a **segurança das senhas e da sessão**, que precisa ser resolvida antes de qualquer uso com dados reais. O segundo ponto de atenção é a **escalabilidade** — sem paginação, sem testes e componentes monolíticos que vão dificultar a evolução do produto.

### Prioridades de melhoria

| Prioridade | Item |
|---|---|
| 🔴 Urgente | Migrar autenticação para Supabase Auth (hashing de senhas) |
| 🔴 Urgente | Ativar RLS no Supabase |
| 🔴 Urgente | Validar sessão server-side |
| 🟡 Médio | Dividir componentes grandes |
| 🟡 Médio | Adicionar paginação nas queries |
| 🟡 Médio | Remover AuthContext duplicado |
| 🟢 Baixo | Migrar para TypeScript |
| 🟢 Baixo | Adicionar testes com Vitest |
| 🟢 Baixo | Lazy loading de rotas |
