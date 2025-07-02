# DevHelpProtocol (coduet)

DevHelpProtocol is a Solana smart contract built with Anchor, allowing developers to publish technical help requests with payment offers. Funds are locked in a vault PDA. Upon completion, payment is automatically distributed, deducting platform fees. The contract also supports cancellation with specific rules and is designed with robust security, PDA usage, validations, and abuse prevention.

## 🌐 Frontend

- Repository: [coduet-app (GitHub)](https://github.com/alisonborba/coduet-app)
- Live app: [https://coduet.vercel.app/](https://coduet.vercel.app/)

## Features
- Post creation with value locked in a vault PDA
- Automatic payment and fee deduction upon completion
- Secure cancellation logic (refunds only the post value, fees remain in the main vault)
- Anchor and Solana security standards
- Validation and abuse prevention
- **Enhanced validations**: Title limited to 100 characters, required minimum value, automatic calculation of fees and required funds
- **Automatic expiration**: Posts expire 30 days after creation
- **Decoupled handlers**: All instruction logic is in separate files under `instructions/` for maintainability
- **Centralized constants**: Fees, minimum values, and business parameters are defined in `utils.rs`

## Structure
- **programs/coduet/src/lib.rs**: Main entry point, program logic, and reexports
- **programs/coduet/src/ix_accounts.rs**: Account structs and validations for Anchor instructions (includes detailed constraints)
- **programs/coduet/src/instructions/**: Handlers for each instruction (logic separated by operation)
- **programs/coduet/src/state.rs**: State objects (Post, Vault) with utility methods (expiration, permissions)
- **programs/coduet/src/errors.rs**: Custom error types
- **programs/coduet/src/utils.rs**: Utility functions and business constants
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

3. **Run the tests:**
   ```sh
   anchor test
   ```

## Usage

- All account validation logic is in `ix_accounts.rs`.
- Handlers in `instructions/` import only the relevant struct.
- The Anchor macro expects all structs to be reexported in `lib.rs`.

## Security & Best Practices
- All funds are locked in PDAs, never in user accounts
- Strict validation in all instructions
- Only the publisher can cancel posts
- Platform fees are automatically deducted
- All state transitions are explicit and validated

## Contributing
Pull requests are welcome! Make sure your code is well tested and follows Anchor/Solana best practices.

## License
MIT

## 🎯 Purpose

Coduet allows developers to publish technical help requests and hire other devs in a secure and decentralized way. The protocol guarantees automatic payments after completion, with transparent fees.

## 🏗️ Architecture

### Main Entities

1. **Post**: Represents a technical help request
   - Unique ID, publisher, title
   - Total value
   - Status (open/closed, completed)
   - Accepted helper

2. **Vault**: PDA account that holds funds in escrow
   - Authority: Post PDA
   - Holds funds until completion

### Contract Flow

1. **Post Creation**: Publisher deposits total value + fees
2. **Completion**: Automatic payment + fees
3. **Cancellation**: Refunds only the post value (fees remain in the main vault)

## 🔒 Security

- ✅ PDAs to avoid account collisions
- ✅ Authorization validation (only publisher can complete/cancel)
- ✅ Double-spend and reentrancy prevention
- ✅ Minimum value validation
- ✅ Safe math to avoid overflows
- ✅ Post expiration (30 days)
- ✅ Post lock after acceptance

## 🚀 Installation & Usage

### Prerequisites

- Rust 1.70+
- Solana CLI 1.16+
- Anchor CLI 0.29+
- Node.js 16+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd coduet

# Install dependencies
npm install

# Configure Anchor
anchor build
```

### Configuration

1. Set up your wallet at `~/.config/solana/id.json`
2. Adjust the cluster in `Anchor.toml` if needed
3. Update the program ID in `lib.rs` if needed

### Build and Deploy

```bash
# Build the program
anchor build

# Deploy to localnet
anchor deploy

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Tests

```bash
# Run all tests
anchor test
```

## 📋 Available Instructions

### 1. create_post
Creates a new post with funds in escrow. Validates title, value, publisher balance, and main_vault.

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
Completes the contract and distributes payments. Only the publisher can call, and only if the post is not completed.

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
Cancels a post (only if no helper is accepted, and only if open). Refunds only the post value, fees remain in the main vault.

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

## 💰 Fees and Payments

- **Platform Fee**: 5% of the total value (minimum 0.001 SOL, defined in `utils.rs`)
- **Fixed Transaction Fee**: 0.01 SOL x 2 transactions (editable in `FIXED_TX_FEE_LAMPORTS` and `NUM_TXS_COVERED` in `utils.rs`)
- **Fee Surplus**: Any value not consumed by transactions remains in the main vault after completion/cancellation
- **Expiration**: 30 days after creation (automatic via method in `Post`)

## 🧪 Tests

The project includes tests covering:

- ✅ Post creation
- ✅ Contract completion
- ✅ Post cancellation
- ✅ Security validations
- ✅ Attack prevention

## 📁 Project Structure

```
coduet/
├── programs/
│   └── coduet/
│       ├── src/
│       │   ├── lib.rs              # Main program
│       │   ├── errors.rs           # Custom errors
│       │   ├── state.rs            # Data structures
│       │   ├── utils.rs            # Utilities
│       │   └── instructions/       # Program instructions
│       │       ├── mod.rs
│       │       ├── create_post.rs
│       │       ├── complete_contract.rs
│       │       └── cancel_post.rs
│       └── Cargo.toml
├── tests/
│   └── coduet.ts                   # TypeScript tests
├── Anchor.toml                     # Anchor config
├── Cargo.toml                      # Workspace Cargo.toml
├── package.json                    # Node.js dependencies
└── README.md                       # This file
```

## 🔧 Advanced Configuration

### Environment Variables

```bash
# For local development
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
ANCHOR_WALLET=~/.config/solana/id.json

# For devnet
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
```

### Program ID

The default program ID is `G5gcEvNxXPxsUwKmGNxNheKq2j5nBghciJpCyooPCKdd`. To use another ID:

1. Generate a new program ID: `solana-keygen new -o target/deploy/coduet-keypair.json`
2. Update `declare_id!()` in `lib.rs`
3. Update `Anchor.toml`

## 🤝 Contributing

1. Fork the project
2. Create a branch for your feature
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT

## ⚠️ Disclaimer

This is an educational project. Use in production at your own risk. Always perform security audits before using in production.

## 💰 Global Main Account (main_vault)

- All values, fees, and payments go through a global main account, controlled externally (can be imported into Phantom).
- Public address of the main_vault: `4waxnAptoSYbKEeFtx8Qo7tauC9yhfCL6z2eT7MK4Vr2`
