# DevHelpProtocol (coduet)

DevHelpProtocol é um contrato inteligente Solana construído com Anchor, permitindo que desenvolvedores publiquem pedidos de ajuda técnica com ofertas de pagamento por hora. Os fundos são bloqueados em uma vault PDA. Ao completar, o pagamento é distribuído automaticamente, deduzindo taxas da plataforma. O contrato também suporta cancelamento com regras específicas, e é projetado com segurança robusta, uso de PDA, validações e prevenção de abuso.

## Features
- Criação de post com valor bloqueado em vault PDA
- Pagamento automático e dedução de taxas na conclusão
- Lógica de cancelamento segura (reembolsa apenas o valor do post, taxas ficam na main vault)
- Padrões de segurança Anchor e Solana
- Validação e prevenção de abuso

## Structure
- **programs/coduet/src/lib.rs**: Entrada principal, lógica do programa e reexports
- **programs/coduet/src/ix_accounts.rs**: Structs de contas para instruções Anchor
- **programs/coduet/src/instructions/**: Handlers de cada instrução
- **programs/coduet/src/state.rs**: Objetos de estado (Post, Vault)
- **programs/coduet/src/errors.rs**: Tipos de erro customizados
- **programs/coduet/src/utils.rs**: Funções utilitárias
- **tests/coduet.ts**: Testes TypeScript usando Anchor

## Building & Testing

1. **Instale as dependências:**
   ```sh
   anchor install
   yarn install
   ```

2. **Compile o programa:**
   ```sh
   anchor build
   ```

3. **Rode os testes:**
   ```sh
   anchor test
   ```

## Usage

- Toda lógica de validação de contas está em `ix_accounts.rs`.
- Handlers em `instructions/` importam apenas o struct relevante.
- O macro Anchor espera todos os structs reexportados em `lib.rs`.

## Security & Best Practices
- Todos os fundos são bloqueados em PDAs, nunca em contas de usuário
- Validação estrita em todas as instruções
- Apenas o publisher pode cancelar posts
- Taxas da plataforma deduzidas automaticamente
- Todas as transições de estado são explícitas e validadas

## Contributing
Pull requests são bem-vindos! Garanta que seu código está bem testado e segue as melhores práticas Anchor/Solana.

## Licence
MIT

## 🎯 Objetivo

Coduet permite que desenvolvedores publiquem pedidos de ajuda técnica e contratem outros devs de forma segura e descentralizada. O protocolo garante pagamentos automáticos após a conclusão, com taxas transparentes.

## 🏗️ Arquitetura

### Entidades principais

1. **Post**: Representa um pedido de ajuda técnica
   - ID único, publisher, título
   - Valor total (value)
   - Status (aberto/fechado, concluído)
   - Helper aceito

2. **Vault**: Conta PDA que mantém fundos em escrow
   - Autoridade: Post PDA
   - Mantém fundos até a conclusão

### Fluxo do contrato

1. **Criação do Post**: Publisher deposita valor total + taxas
2. **Conclusão**: Pagamento automático + taxas
3. **Cancelamento**: Reembolso apenas do valor do post (taxas ficam na main vault)

## 🔒 Segurança

- ✅ PDAs para evitar colisão de contas
- ✅ Validação de autorização (só publisher pode concluir/cancelar)
- ✅ Prevenção de double-spend e reentrância
- ✅ Validação de valor mínimo
- ✅ Safe math para evitar overflows
- ✅ Expiração do post (30 dias)
- ✅ Lock do post após aceitação

## 🚀 Instalação & Uso

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

1. Configure sua wallet em `~/.config/solana/id.json`
2. Ajuste o cluster em `Anchor.toml` se necessário
3. Atualize o program ID em `lib.rs` se necessário

### Build e Deploy

```bash
# Compile o programa
anchor build

# Deploy localnet
anchor deploy

# Deploy devnet
anchor deploy --provider.cluster devnet
```

### Testes

```bash
# Rode todos os testes
anchor test
```

## 📋 Instruções Disponíveis

### 1. create_post
Cria um novo post com fundos em escrow.

```typescript
await program.methods
  .createPost(postId, title, value)
  .accounts({
    publisher: publisher.publicKey,
    mainVault: mainVault.publicKey,
  })
  .signers([publisher])
  .rpc();
```

### 2. complete_contract
Finaliza o contrato e distribui pagamentos.

```typescript
await program.methods
  .completeContract(postId)
  .accounts({
    publisher: publisher.publicKey,
    mainVault: mainVault.publicKey,
    helper: helper.publicKey,
    platformFeeRecipient: platformFeeRecipient.publicKey,
  })
  .signers([publisher, mainVault])
  .rpc();
```

### 3. cancel_post
Cancela um post (só se não houver helper aceito). Reembolsa apenas o valor do post, taxas permanecem na main vault.

```typescript
await program.methods
  .cancelPost(postId)
  .accounts({
    publisher: publisher.publicKey,
    mainVault: mainVault.publicKey,
    platformFeeRecipient: platformFeeRecipient.publicKey,
  })
  .signers([publisher, mainVault])
  .rpc();
```

## 💰 Taxas e Pagamentos

- **Taxa da Plataforma**: 5% do valor total
- **Taxa Mínima**: 0.001 SOL
- **Taxa Fixa de Transação**: 0.01 SOL x 2 transações (editável em `programs/coduet/src/utils.rs` via `FIXED_TX_FEE_LAMPORTS` e `NUM_TXS_COVERED`)
- **Fee Surplus**: Qualquer valor não consumido por transações é transferido como lucro para a conta principal da plataforma após conclusão ou cancelamento do post.
- **Expiração**: 30 dias após a criação

## 🧪 Testes

O projeto inclui testes cobrindo:

- ✅ Criação de post
- ✅ Conclusão de contrato
- ✅ Cancelamento de post
- ✅ Validações de segurança
- ✅ Prevenção de ataques

## 📁 Estrutura do Projeto

```
coduet/
├── programs/
│   └── coduet/
│       ├── src/
│       │   ├── lib.rs              # Programa principal
│       │   ├── errors.rs           # Erros customizados
│       │   ├── state.rs            # Estruturas de dados
│       │   ├── utils.rs            # Utilidades
│       │   └── instructions/       # Instruções do programa
│       │       ├── mod.rs
│       │       ├── create_post.rs
│       │       ├── complete_contract.rs
│       │       └── cancel_post.rs
│       └── Cargo.toml
├── tests/
│   └── coduet.ts                   # Testes TypeScript
├── Anchor.toml                     # Config Anchor
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

O program ID padrão é `G5gcEvNxXPxsUwKmGNxNheKq2j5nBghciJpCyooPCKdd`. Para usar outro ID:

1. Gere um novo program ID: `solana-keygen new -o target/deploy/coduet-keypair.json`
2. Atualize `declare_id!()` em `lib.rs`
3. Atualize `Anchor.toml`

## 🤝 Contribuição

1. Fork o projeto
2. Crie um branch para sua feature
3. Commit suas mudanças
4. Push para o branch
5. Abra um Pull Request

## 📄 Licença

MIT

## ⚠️ Disclaimer

Este é um projeto educacional. Use em produção por sua conta e risco. Sempre faça auditorias de segurança antes de usar em produção.

## 💰 Conta Principal Global (main_vault)

- Todos os valores, taxas e pagamentos passam por uma conta principal global, controlada externamente (pode ser importada no Phantom).
- Endereço público da main_vault: `4waxnAptoSYbKEeFtx8Qo7tauC9yhfCL6z2eT7MK4Vr2`
- Chave privada (array para importar no Phantom):

```
[239,44,167,206,187,124,65,17,170,91,132,162,81,22,25,237,136,37,132,232,180,13,150,118,13,223,50,244,80,160,18,227,58,142,211,57,13,54,118,35,191,161,245,245,0,229,54,169,207,67,238,92,172,11,224,73,45,132,91,203,246,63,150,163]
```

- Para importar no Phantom, use a opção de importar por chave privada e cole o array acima.