# Coduet - DevHelpProtocol

Um protocolo descentralizado para contratação de desenvolvedores na Solana, construído com Anchor Framework.

## 🎯 Objetivo

O Coduet permite que desenvolvedores publiquem demandas de ajuda técnica e contratem outros desenvolvedores de forma segura e descentralizada. O protocolo garante que os pagamentos sejam feitos automaticamente após a conclusão do trabalho, com taxas transparentes para a plataforma.

## 🏗️ Arquitetura

### Entidades Principais

1. **Post**: Representa uma demanda de ajuda técnica
   - ID único, publisher, título, descrição
   - Valor total (value)
   - Status (aberto/fechado, completado)
   - Helper aceito

2. **HelpRequest**: Representa uma aplicação para um post
   - Post ID, aplicante
   - Status (pendente/aceito/rejeitado)

3. **Vault**: Conta PDA que mantém os fundos em escrow
   - Autoridade: Post PDA
   - Mantém fundos até finalização

### Fluxo do Contrato

1. **Criação de Post**: Publisher deposita valor total + taxas
2. **Aplicação**: Desenvolvedores se candidatam
3. **Aceitação**: Publisher escolhe um helper
4. **Finalização**: Pagamento automático + taxas
5. **Cancelamento**: Reembolso (apenas se sem helper)

## 🔒 Segurança

- ✅ PDAs para evitar colisões de contas
- ✅ Validação de autorização (apenas publisher pode aceitar/finalizar)
- ✅ Prevenção de double-spend e reentrância
- ✅ Validação de valores mínimos
- ✅ Safe math para evitar overflows
- ✅ Expiração de posts (30 dias)
- ✅ Bloqueio de posts após aceitação

## 🚀 Instalação e Uso

### Pré-requisitos

- Rust 1.70+
- Solana CLI 1.16+
- Anchor CLI 0.29+
- Node.js 16+

### Instalação

```bash
# Clone o repositório
git clone <repository-url>
cd coduet

# Instale as dependências
npm install

# Configure o Anchor
anchor build
```

### Configuração

1. Configure sua wallet no `~/.config/solana/id.json`
2. Ajuste o cluster no `Anchor.toml` se necessário
3. Configure o program ID no `lib.rs` se necessário

### Build e Deploy

```bash
# Build do programa
anchor build

# Deploy para localnet
anchor deploy

# Deploy para devnet
anchor deploy --provider.cluster devnet
```

### Testes

```bash
# Executar todos os testes
anchor test

# Executar testes específicos
anchor test --skip-local-validator
```

## 📋 Instruções Disponíveis

### 1. create_post
Cria um novo post com fundos em escrow.

```typescript
await program.methods
  .createPost(postId, title, description, value)
  .accounts({
    publisher: publisher.publicKey,
    post: postPda,
    vault: vaultPda,
    systemProgram: SystemProgram.programId,
    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  })
  .signers([publisher])
  .rpc();
```

### 2. apply_help
Aplica para um post como helper.

```typescript
await program.methods
  .applyHelp(postId)
  .accounts({
    applicant: applicant.publicKey,
    post: postPda,
    helpRequest: helpRequestPda,
    systemProgram: SystemProgram.programId,
    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  })
  .signers([applicant])
  .rpc();
```

### 3. accept_helper
Aceita um helper para o post.

```typescript
await program.methods
  .acceptHelper(postId, helper.publicKey)
  .accounts({
    publisher: publisher.publicKey,
    post: postPda,
    helpRequest: helpRequestPda,
    applicant: helper.publicKey,
  })
  .signers([publisher])
  .rpc();
```

### 4. complete_contract
Finaliza o contrato e distribui pagamentos.

```typescript
await program.methods
  .completeContract(postId)
  .accounts({
    publisher: publisher.publicKey,
    post: postPda,
    vault: vaultPda,
    helper: helper.publicKey,
    platformFeeRecipient: platformFeeRecipient.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([publisher])
  .rpc();
```

### 5. cancel_post
Cancela um post (apenas se sem helper aceito).

```typescript
await program.methods
  .cancelPost(postId)
  .accounts({
    publisher: publisher.publicKey,
    post: postPda,
    vault: vaultPda,
    platformFeeRecipient: platformFeeRecipient.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([publisher])
  .rpc();
```

## 💰 Taxas e Pagamentos

- **Taxa da Plataforma**: 5% do valor total
- **Taxa Mínima**: 0.001 SOL
- **Taxa de Transação Estimada**: 0.005 SOL
- **Expiração**: 30 dias após criação

## 🧪 Testes

O projeto inclui testes abrangentes que cobrem:

- ✅ Criação de posts
- ✅ Aplicação para posts
- ✅ Aceitação de helpers
- ✅ Finalização de contratos
- ✅ Cancelamento de posts
- ✅ Validações de segurança
- ✅ Prevenção de ataques

## 📁 Estrutura do Projeto

```
coduet/
├── programs/
│   └── coduet/
│       ├── src/
│       │   ├── lib.rs              # Programa principal
│       │   ├── errors.rs           # Erros personalizados
│       │   ├── state.rs            # Estruturas de dados
│       │   ├── utils.rs            # Utilitários
│       │   └── instructions/       # Instruções do programa
│       │       ├── mod.rs
│       │       ├── create_post.rs
│       │       ├── apply_help.rs
│       │       ├── accept_helper.rs
│       │       ├── complete_contract.rs
│       │       └── cancel_post.rs
│       └── Cargo.toml
├── tests/
│   └── coduet.ts                   # Testes em TypeScript
├── Anchor.toml                     # Configuração do Anchor
├── Cargo.toml                      # Workspace Cargo.toml
├── package.json                    # Dependências Node.js
└── README.md                       # Este arquivo
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente

```bash
# Para desenvolvimento local
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
ANCHOR_WALLET=~/.config/solana/id.json

# Para devnet
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
```

### Program ID

O program ID padrão é `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`. Para usar um ID diferente:

1. Gere um novo program ID: `solana-keygen new -o target/deploy/coduet-keypair.json`
2. Atualize o `declare_id!()` no `lib.rs`
3. Atualize o `Anchor.toml`

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a MIT License.

## ⚠️ Disclaimer

Este é um projeto educacional. Use em produção por sua conta e risco. Sempre faça auditorias de segurança antes de usar em produção. 