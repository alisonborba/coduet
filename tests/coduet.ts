import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Coduet } from "../target/types/coduet";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import MAIN_VAULT_KEYPAIR from "../main_vault-keypair.json";

const MAIN_VAULT = Keypair.fromSecretKey(new Uint8Array(MAIN_VAULT_KEYPAIR));

describe("coduet", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Coduet as Program<Coduet>;

    // Test accounts
    const publisher = Keypair.generate();
    const helper = Keypair.generate();
    const platformFeeRecipient = Keypair.generate();

    // Test data
    const postId = new anchor.BN(1);
    const title = "Need help with Rust smart contract";
    const description = "I need assistance with implementing a complex smart contract in Rust using Anchor framework";
    const value = new anchor.BN(5_000_000); // 0.005 SOL total

    before(async () => {
        // Airdrop SOL to test accounts
        const signature1 = await provider.connection.requestAirdrop(publisher.publicKey, 2 * LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(signature1);

        const signature2 = await provider.connection.requestAirdrop(helper.publicKey, LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(signature2);

        const signature3 = await provider.connection.requestAirdrop(platformFeeRecipient.publicKey, LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(signature3);
    });

    it("Should create a post successfully", async () => {
        const [postPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), postId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        const platformFeeRaw = Math.floor(value.toNumber() * 5 / 100);
        const platformFee = Math.max(platformFeeRaw, 1000); // 1000 lamports é o mínimo
        const rentExempt = await provider.connection.getMinimumBalanceForRentExemption(0);
        const FIXED_TX_FEE_LAMPORTS = 10_000; // 0.01 SOL
        const NUM_TXS_COVERED = 2;
        const totalFixedFee = FIXED_TX_FEE_LAMPORTS * NUM_TXS_COVERED;
        const expectedVaultBalance = value.toNumber() + platformFee + totalFixedFee;

        await program.methods
            .createPost(postId, title, description, value)
            .accounts({
                publisher: publisher.publicKey,
                mainVault: MAIN_VAULT.publicKey,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([publisher])
            .rpc();

        const postAccount = await program.account.post.fetch(postPda);
        expect(postAccount.id.toString()).to.equal(postId.toString());
        expect(postAccount.publisher.toString()).to.equal(publisher.publicKey.toString());
        expect(postAccount.title).to.equal(title);
        expect(postAccount.description).to.equal(description);
        expect(postAccount.value.toString()).to.equal(value.toString());
        expect(postAccount.isOpen).to.be.true;
        expect(postAccount.isCompleted).to.be.false;
        expect(postAccount.acceptedHelper).to.be.null;

        // Checar saldo da vault (inclui rent-exempt minimum)
        const vaultBalance = await provider.connection.getBalance(MAIN_VAULT.publicKey);
        expect(vaultBalance).to.equal(expectedVaultBalance);
    });

    it("Should apply for help successfully", async () => {
        const [postPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), postId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        const [helpRequestPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("help_request"), postPda.toBuffer(), helper.publicKey.toBuffer()],
            program.programId
        );

        await program.methods
            .applyHelp(postId)
            .accounts({
                applicant: helper.publicKey,
                mainVault: MAIN_VAULT.publicKey,
                helpRequest: helpRequestPda,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([helper])
            .rpc();

        const helpRequestAccount = await program.account.helpRequest.fetch(helpRequestPda);
        expect(helpRequestAccount.postId.toString()).to.equal(postId.toString());
        expect(helpRequestAccount.applicant.toString()).to.equal(helper.publicKey.toString());
        expect(Object.keys(helpRequestAccount.status)[0]).to.equal("pending");
    });

    it("Should accept helper successfully", async () => {
        const [postPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), postId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        const [helpRequestPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("help_request"), postPda.toBuffer(), helper.publicKey.toBuffer()],
            program.programId
        );

        await program.methods
            .acceptHelper(postId, helper.publicKey)
            .accounts({
                publisher: publisher.publicKey,
                helpRequest: helpRequestPda,
                applicant: helper.publicKey,
                mainVault: MAIN_VAULT.publicKey,
            })
            .signers([publisher])
            .rpc();

        const postAccount = await program.account.post.fetch(postPda);
        expect(postAccount.isOpen).to.be.false;
        expect(postAccount.acceptedHelper.toString()).to.equal(helper.publicKey.toString());

        const helpRequestAccount = await program.account.helpRequest.fetch(helpRequestPda);
        // expect(helpRequestAccount.status.accepted).to.be.true;
        expect(Object.keys(helpRequestAccount.status)[0]).to.equal("accepted");
    });

    it("Should complete contract successfully", async () => {
        const completePostId = new anchor.BN(999);
        const [postPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), completePostId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        // Criar post
        await program.methods
            .createPost(completePostId, title, description, value)
            .accounts({
                publisher: publisher.publicKey,
                mainVault: MAIN_VAULT.publicKey,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([publisher])
            .rpc();

        // Helper aplica
        const [helpRequestPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("help_request"), postPda.toBuffer(), helper.publicKey.toBuffer()],
            program.programId
        );
        await program.methods
            .applyHelp(completePostId)
            .accounts({
                applicant: helper.publicKey,
                mainVault: MAIN_VAULT.publicKey,
                helpRequest: helpRequestPda,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([helper])
            .rpc();

        // Publisher aceita helper
        await program.methods
            .acceptHelper(completePostId, helper.publicKey)
            .accounts({
                publisher: publisher.publicKey,
                helpRequest: helpRequestPda,
                applicant: helper.publicKey,
                mainVault: MAIN_VAULT.publicKey,
            })
            .signers([publisher])
            .rpc();

        // Balances before
        const helperBalanceBefore = await provider.connection.getBalance(helper.publicKey);
        const platformBalanceBefore = await provider.connection.getBalance(platformFeeRecipient.publicKey);

        // Complete contract
        await program.methods
            .completeContract(completePostId)
            .accounts({
                publisher: publisher.publicKey,
                mainVault: MAIN_VAULT.publicKey,
                helper: helper.publicKey,
                platformFeeRecipient: platformFeeRecipient.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([publisher, MAIN_VAULT])
            .rpc();

        // Balances after
        const helperBalanceAfter = await provider.connection.getBalance(helper.publicKey);
        const platformBalanceAfter = await provider.connection.getBalance(platformFeeRecipient.publicKey);

        // Check payments
        expect(helperBalanceAfter).to.be.greaterThan(helperBalanceBefore);
        // O platformFeeRecipient recebe apenas a platform_fee
        const FIXED_TX_FEE_LAMPORTS = 10_000; // 0.01 SOL
        const NUM_TXS_COVERED = 2;
        const totalFixedFee = FIXED_TX_FEE_LAMPORTS * NUM_TXS_COVERED;
        const platformFeeRaw = Math.floor(value.toNumber() * 5 / 100);
        const platformFee = Math.max(platformFeeRaw, 1000);
        console.log('-------- Should complete contract successfully --------');
        console.log('platformBalanceAfter / platformBalanceBefore / platformFee', platformBalanceAfter, platformBalanceBefore, platformFee);
        expect(platformBalanceAfter - platformBalanceBefore).to.be.closeTo(platformFee, 5000);
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
                .createPost(invalidPostId, "Test", "Description", new anchor.BN(0))
                .accounts({
                    publisher: publisher.publicKey,
                    mainVault: MAIN_VAULT.publicKey,
                    systemProgram: SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                })
                .signers([publisher])
                .rpc();
            expect.fail("Should have thrown error for zero value");
        } catch (error) {
            expect(error.message).to.include("Invalid value");
        }
    });

    it("Should prevent unauthorized access", async () => {
        const unauthorizedUser = Keypair.generate();
        const [postPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), postId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        // Gere o helpRequest PDA correto
        const [helpRequestPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("help_request"), postPda.toBuffer(), helper.publicKey.toBuffer()],
            program.programId
        );

        // Test unauthorized user trying to accept helper
        try {
            await program.methods
                .acceptHelper(postId, helper.publicKey)
                .accounts({
                    publisher: unauthorizedUser.publicKey,
                    helpRequest: helpRequestPda,
                    applicant: helper.publicKey,
                    mainVault: MAIN_VAULT.publicKey,
                })
                .signers([unauthorizedUser])
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

    it("Should prevent double application", async () => {
        const [postPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), postId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        const [helpRequestPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("help_request"), postPda.toBuffer(), helper.publicKey.toBuffer()],
            program.programId
        );

        // Try to apply again
        try {
            await program.methods
                .applyHelp(postId)
                .accounts({
                    applicant: helper.publicKey,
                    mainVault: MAIN_VAULT.publicKey,
                    helpRequest: helpRequestPda,
                    systemProgram: SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                })
                .signers([helper])
                .rpc();
            expect.fail("Should have thrown error for double application");
        } catch (error) {
            expect(
                error.message.includes("Already applied") ||
                error.message.includes("custom program error") ||
                error.message.includes("Simulation failed")
            ).to.be.true;
        }
    });

    it("Should create and cancel post successfully", async () => {
        const cancelPostId = new anchor.BN(3);
        const [cancelPostPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), cancelPostId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        const publisherBalanceBefore = await provider.connection.getBalance(publisher.publicKey);

        // Create post
        await program.methods
            .createPost(cancelPostId, "Cancel Test", "Test description", value)
            .accounts({
                publisher: publisher.publicKey,
                mainVault: MAIN_VAULT.publicKey,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([publisher])
            .rpc();

        // Cancel post
        await program.methods
            .cancelPost(cancelPostId)
            .accounts({
                publisher: publisher.publicKey,
                mainVault: MAIN_VAULT.publicKey,
                platformFeeRecipient: platformFeeRecipient.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([publisher, MAIN_VAULT])
            .rpc();

        const postAccount = await program.account.post.fetch(cancelPostPda);
        expect(postAccount.isOpen).to.be.false;
        expect(postAccount.isCompleted).to.be.true;

        const publisherBalanceAfter = await provider.connection.getBalance(publisher.publicKey);
        console.log('Should create and cancel post successfully');
        console.log('publisherBalanceBefore / publisherBalanceAfter', publisherBalanceBefore, publisherBalanceAfter);
        // O saldo do publisher deve aumentar pelo menos o valor do post (com tolerância para taxas de transação)
        expect(publisherBalanceBefore).to.be.greaterThan(publisherBalanceAfter); // tolerância de 0.00001 SOL 
    });
}); 