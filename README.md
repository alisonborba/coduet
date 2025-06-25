# DevHelpProtocol (coduet)

DevHelpProtocol is a Solana smart contract built with the Anchor Framework, enabling developers to post help requests with hourly payment offers. Other developers can apply, the publisher can accept a helper, and funds are securely locked in a vault PDA. Upon completion, payment is automatically distributed, deducting platform fees. The contract also supports cancellation with specific rules, and is designed with robust security, PDA usage, validations, and abuse prevention.

## Features
- Post creation with value locked in a vault PDA
- Helpers can apply to posts
- Publishers can accept a helper (funds are locked)
- Automatic payment and fee deduction upon contract completion
- Secure cancellation logic
- Full PDA and Anchor security patterns
- Comprehensive validation and abuse prevention

## Structure
- **programs/coduet/src/lib.rs**: Main entry, program logic, and reexports
- **programs/coduet/src/ix_accounts.rs**: All account structs for Anchor instructions (required for Anchor macro compatibility)
- **programs/coduet/src/instructions/**: Handlers for each instruction (no account structs here)
- **programs/coduet/src/state.rs**: State objects (Post, HelpRequest, Vault)
- **programs/coduet/src/errors.rs**: Custom error types
- **programs/coduet/src/utils.rs**: Utility functions
- **tests/coduet.ts**: TypeScript tests using Anchor

## Building & Testing

1. **Install dependencies:**
   ```sh
   anchor install
   yarn install
   ```

2. **Build the program:**
   ```sh
   anchor build
   ```
   If you see an error about `idl-build` feature, add this to your `Cargo.toml`:
   ```toml
   [features]
   idl-build = ["anchor-lang/idl-build"]
   ```

3. **Run tests:**
   ```sh
   anchor test
   ```

## Usage

- All account validation logic is in `ix_accounts.rs`.
- Handlers in `instructions/` only import the relevant account struct from `ix_accounts`.
- The Anchor macro expects all account structs to be reexported in `lib.rs`.

## Security & Best Practices
- All funds are locked in PDAs, never in user accounts
- Strict validation on all instructions
- Only publishers can accept helpers or cancel posts
- Platform fees are deducted automatically
- All state transitions are explicit and validated

## Contributing
Pull requests are welcome! Please ensure your code is well-tested and follows the Anchor and Solana best practices.

## Licence
MIT

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
- **Taxa de Transação Fixa**: 0.01 SOL x 2 transações (editável em `programs/coduet/src/utils.rs` via `FIXED_TX_FEE_LAMPORTS` e `NUM_TXS_COVERED`)
- **Excedente de Taxa**: Qualquer valor não consumido pelas transações é transferido como lucro para a conta principal da plataforma após a conclusão ou cancelamento do post.
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

## 💰 Conta Principal Global (main_vault)

- Todos os valores de posts, taxas e pagamentos passam por uma conta principal global, controlada externamente (pode ser importada na Phantom).
- Endereço público da main_vault: `4waxnAptoSYbKEeFtx8Qo7tauC9yhfCL6z2eT7MK4Vr2`
- Chave privada (array para importar na Phantom):

```
[239,44,167,206,187,124,65,17,170,91,132,162,81,22,25,237,136,37,132,232,180,13,150,118,13,223,50,244,80,160,18,227,58,142,211,57,13,54,118,35,191,161,245,245,0,229,54,169,207,67,238,92,172,11,224,73,45,132,91,203,246,63,150,163]
```

- Para importar na Phantom, use a opção de importar por chave privada e cole o array acima. 