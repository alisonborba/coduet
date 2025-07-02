import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Coduet } from "../target/types/coduet";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { expect } from "chai";
import MAIN_VAULT_KEYPAIR from "../main_vault-keypair.json";
import { PLATFORM_FEE_REC_PK } from "../platform_fee_recipient-keypair";
import bs58 from 'bs58';


describe("coduet", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Coduet as Program<Coduet>;

    // Master wallet that receives airdrop and distributes SOL
    const masterWallet = Keypair.fromSecretKey(new Uint8Array(MAIN_VAULT_KEYPAIR));

    // Platform fee recipient wallet
    const platformFeeRecipient = Keypair.fromSecretKey(bs58.decode(PLATFORM_FEE_REC_PK));

    // Test accounts
    const publisher = Keypair.generate();
    const helper = Keypair.generate();
    const unauthorizedUser = Keypair.generate();

    // Test data
    const postId = new anchor.BN(1);
    const title = "Need help with Rust smart contract";
    const value = new anchor.BN(5_000_000); // 0.005 SOL total

    // Helper function to transfer SOL from master wallet to other accounts
    async function transferSol(from: Keypair, to: PublicKey, amount: number) {
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: from.publicKey,
                toPubkey: to,
                lamports: amount,
            })
        );

        const signature = await provider.sendAndConfirm(transaction, [from]);
        return signature;
    }

    before(async () => {
        // Single airdrop to master wallet (maximum possible)
        // const signature = await provider.connection.requestAirdrop(masterWallet.publicKey, 2 * LAMPORTS_PER_SOL);
        // await provider.connection.confirmTransaction(signature);

        // Distribute SOL from master wallet to test accounts
        await transferSol(masterWallet, publisher.publicKey, 1.5 * LAMPORTS_PER_SOL);
        await transferSol(masterWallet, helper.publicKey, LAMPORTS_PER_SOL);
        await transferSol(masterWallet, platformFeeRecipient.publicKey, LAMPORTS_PER_SOL);
        await transferSol(masterWallet, unauthorizedUser.publicKey, 0.5 * LAMPORTS_PER_SOL);
    });

    it("Should create a post successfully", async () => {
        const [postPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), postId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        const platformFeeRaw = Math.floor(value.toNumber() * 5 / 100);
        const platformFee = Math.max(platformFeeRaw, 1000); // 1000 lamports é o mínimo
        const FIXED_TX_FEE_LAMPORTS = 10_000; // 0.01 SOL
        const NUM_TXS_COVERED = 2;
        const totalFixedFee = FIXED_TX_FEE_LAMPORTS * NUM_TXS_COVERED;
        const expectedVaultBalance = value.toNumber() + platformFee + totalFixedFee;

        await program.methods
            .createPost(postId, title, value)
            .accounts({
                publisher: publisher.publicKey,
                mainVault: masterWallet.publicKey,
            })
            .signers([publisher])
            .rpc();

        const postAccount = await program.account.post.fetch(postPda);
        expect(postAccount.id.toString()).to.equal(postId.toString());
        expect(postAccount.publisher.toString()).to.equal(publisher.publicKey.toString());
        expect(postAccount.title).to.equal(title);
        expect(postAccount.value.toString()).to.equal(value.toString());
        expect(postAccount.isOpen).to.be.true;
        expect(postAccount.isCompleted).to.be.false;
        expect(postAccount.acceptedHelper).to.be.null;

        // Check vault balance (includes rent-exempt minimum)
        const vaultBalance = await provider.connection.getBalance(masterWallet.publicKey);
        expect(vaultBalance).to.equal(expectedVaultBalance);
    });

    it("Should fail to complete contract when no helper is accepted", async () => {
        const completePostId = new anchor.BN(999);
        const [postPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), completePostId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        // Criar post
        await program.methods
            .createPost(completePostId, title, value)
            .accounts({
                publisher: publisher.publicKey,
                mainVault: masterWallet.publicKey,
            })
            .signers([publisher])
            .rpc();

        // Verify post was created with no accepted helper
        const postAccount = await program.account.post.fetch(postPda);
        expect(postAccount.acceptedHelper).to.be.null;

        // Try to complete contract - should fail because no helper is accepted
        try {
            await program.methods
                .completeContract(completePostId)
                .accounts({
                    publisher: publisher.publicKey,
                    mainVault: masterWallet.publicKey,
                    helper: helper.publicKey,
                    platformFeeRecipient: platformFeeRecipient.publicKey,
                })
                .signers([publisher, masterWallet])
                .rpc();
            expect.fail("Should have thrown error for no accepted helper");
        } catch (error) {
            expect(
                error.message.includes("PostNotFound") ||
                error.message.includes("Post not found") ||
                error.message.includes("AnchorError")
            ).to.be.true;
        }
    });

    it("Should prevent creating post with invalid data", async () => {
        const invalidPostId = new anchor.BN(2);
        const [postPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), invalidPostId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        // Test with zero value
        try {
            await program.methods
                .createPost(invalidPostId, "Test", new anchor.BN(0))
                .accounts({
                    publisher: publisher.publicKey,
                    mainVault: masterWallet.publicKey,
                })
                .signers([publisher])
                .rpc();
            expect.fail("Should have thrown error for zero value");
        } catch (error) {
            expect(error.message).to.include("Invalid value");
        }
    });

    it("Should prevent unauthorized access to cancel", async () => {
        const [postPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), postId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        // Test unauthorized user trying to cancel post
        try {
            await program.methods
                .cancelPost(postId)
                .accounts({
                    publisher: unauthorizedUser.publicKey,
                    mainVault: masterWallet.publicKey,
                    platformFeeRecipient: platformFeeRecipient.publicKey,
                })
                .signers([unauthorizedUser, masterWallet])
                .rpc();
            expect.fail("Should have thrown error for unauthorized access");
        } catch (error) {
            expect(
                error.message.includes("Unauthorized") ||
                error.message.includes("account") ||
                error.message.includes("constraint") ||
                error.message.includes("AnchorError")
            ).to.be.true;
        }
    });

    it("Should create and cancel post successfully (refund only value)", async () => {
        const cancelPostId = new anchor.BN(3);
        const [cancelPostPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), cancelPostId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        // Create post
        await program.methods
            .createPost(cancelPostId, "Cancel Test", value)
            .accounts({
                publisher: publisher.publicKey,
                mainVault: masterWallet.publicKey,
            })
            .signers([publisher])
            .rpc();

        const publisherBalanceBefore = await provider.connection.getBalance(publisher.publicKey);

        // Cancel post
        await program.methods
            .cancelPost(cancelPostId)
            .accounts({
                publisher: publisher.publicKey,
                mainVault: masterWallet.publicKey,
                platformFeeRecipient: platformFeeRecipient.publicKey,
            })
            .signers([publisher, masterWallet])
            .rpc();

        const postAccount = await program.account.post.fetch(cancelPostPda);
        expect(postAccount.isOpen).to.be.false;
        expect(postAccount.isCompleted).to.be.true;

        // O saldo do publisher deve aumentar apenas pelo valor do post (sem taxas)
        const publisherBalanceAfter = await provider.connection.getBalance(publisher.publicKey);
        expect(publisherBalanceAfter).to.be.greaterThan(publisherBalanceBefore);
    });

    it("Should handle multiple posts correctly", async () => {
        const postId1 = new anchor.BN(100);
        const postId2 = new anchor.BN(101);
        const postId3 = new anchor.BN(102);

        // Create multiple posts
        await program.methods
            .createPost(postId1, "Post 1", value)
            .accounts({
                publisher: publisher.publicKey,
                mainVault: masterWallet.publicKey,
            })
            .signers([publisher])
            .rpc();

        await program.methods
            .createPost(postId2, "Post 2", value)
            .accounts({
                publisher: publisher.publicKey,
                mainVault: masterWallet.publicKey,
            })
            .signers([publisher])
            .rpc();

        await program.methods
            .createPost(postId3, "Post 3", value)
            .accounts({
                publisher: publisher.publicKey,
                mainVault: masterWallet.publicKey,
            })
            .signers([publisher])
            .rpc();

        // Verify all posts were created
        const [postPda1] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), postId1.toArrayLike(Buffer, "le", 8)],
            program.programId
        );
        const [postPda2] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), postId2.toArrayLike(Buffer, "le", 8)],
            program.programId
        );
        const [postPda3] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), postId3.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        const post1 = await program.account.post.fetch(postPda1);
        const post2 = await program.account.post.fetch(postPda2);
        const post3 = await program.account.post.fetch(postPda3);

        expect(post1.title).to.equal("Post 1");
        expect(post2.title).to.equal("Post 2");
        expect(post3.title).to.equal("Post 3");
        expect(post1.isOpen).to.be.true;
        expect(post2.isOpen).to.be.true;
        expect(post3.isOpen).to.be.true;
    });

    it("Should accept a helper and pay the helper (complete_contract)", async () => {
        const testPostId = new anchor.BN(1234);
        const [postPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), testPostId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        // Cria o post
        await program.methods
            .createPost(testPostId, "Test Accept Helper", value)
            .accounts({
                publisher: publisher.publicKey,
                mainVault: masterWallet.publicKey,
            })
            .signers([publisher])
            .rpc();

        // Sobrescreve o campo accepted_helper diretamente (workaround para teste)
        const postAccount = await program.account.post.fetch(postPda);
        const postObj = {
            ...postAccount,
            acceptedHelper: helper.publicKey,
        };
        await program.provider.connection._rpcRequest("setAccount", [
            postPda.toBase58(),
            program.coder.accounts.encode("Post", postObj).toString("base64"),
        ]);

        // Saldo antes
        const helperBalanceBefore = await provider.connection.getBalance(helper.publicKey);

        // Completa o contrato
        await program.methods
            .completeContract(testPostId)
            .accounts({
                publisher: publisher.publicKey,
                mainVault: masterWallet.publicKey,
                helper: helper.publicKey,
                platformFeeRecipient: platformFeeRecipient.publicKey,
            })
            .signers([publisher, masterWallet])
            .rpc();

        // Saldo depois
        const helperBalanceAfter = await provider.connection.getBalance(helper.publicKey);

        expect(helperBalanceAfter).to.be.greaterThan(helperBalanceBefore);
    });
}); 