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

## 🎯 Objective

Coduet allows developers to publish technical help requests and hire other developers in a secure and decentralized way. The protocol ensures that payments are made automatically after the work is completed, with transparent platform fees.

## 🏗️ Architecture

### Main Entities

1. **Post**: Represents a technical help request
   - Unique ID, publisher, title, description
   - Total value (value)
   - Status (open/closed, completed)
   - Accepted helper

2. **HelpRequest**: Represents an application for a post
   - Post ID, applicant
   - Status (pending/accepted/rejected)

3. **Vault**: PDA account that holds funds in escrow
   - Authority: Post PDA
   - Holds funds until completion

### Contract Flow

1. **Post Creation**: Publisher deposits total value + fees
2. **Application**: Developers apply
3. **Acceptance**: Publisher chooses a helper
4. **Completion**: Automatic payment + fees
5. **Cancellation**: Refund (only if no helper)

## 🔒 Security

- ✅ PDAs to avoid account collisions
- ✅ Authorization validation (only publisher can accept/complete)
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
3. Set the program ID in `lib.rs` if needed

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

# Run specific tests
anchor test --skip-local-validator
```

## 📋 Available Instructions

### 1. create_post
Creates a new post with funds in escrow.

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
Apply to a post as a helper.

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
Accept a helper for the post.

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
Finalize the contract and distribute payments.

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
Cancel a post (only if no accepted helper).

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

## 💰 Fees and Payments

- **Platform Fee**: 5% of the total value
- **Minimum Fee**: 0.001 SOL
- **Fixed Transaction Fee**: 0.01 SOL x 2 transactions (editable in `programs/coduet/src/utils.rs` via `FIXED_TX_FEE_LAMPORTS` and `NUM_TXS_COVERED`)
- **Fee Surplus**: Any value not consumed by transactions is transferred as profit to the main platform account after completion or cancellation of the post.
- **Expiration**: 30 days after creation

## 🧪 Tests

The project includes comprehensive tests covering:

- ✅ Post creation
- ✅ Application to posts
- ✅ Helper acceptance
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
│       │       ├── apply_help.rs
│       │       ├── accept_helper.rs
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

The default program ID is `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`. To use a different ID:

1. Generate a new program ID: `solana-keygen new -o target/deploy/coduet-keypair.json`
2. Update `declare_id!()` in `lib.rs`
3. Update `Anchor.toml`

## 🤝 Contribution

1. Fork the project
2. Create a branch for your feature
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## ⚠️ Disclaimer

This is an educational project. Use in production at your own risk. Always perform security audits before using in production.

## 💰 Global Main Account (main_vault)

- All post values, fees, and payments go through a global main account, controlled externally (can be imported into Phantom).
- Public address of the main_vault: `4waxnAptoSYbKEeFtx8Qo7tauC9yhfCL6z2eT7MK4Vr2`
- Private key (array to import into Phantom):

```
[239,44,167,206,187,124,65,17,170,91,132,162,81,22,25,237,136,37,132,232,180,13,150,118,13,223,50,244,80,160,18,227,58,142,211,57,13,54,118,35,191,161,245,245,0,229,54,169,207,67,238,92,172,11,224,73,45,132,91,203,246,63,150,163]
```

- To import into Phantom, use the import by private key option and paste the array above. 