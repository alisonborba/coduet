import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Coduet } from "../target/types/coduet";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

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

        const [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), postPda.toBuffer()],
            program.programId
        );

        const platformFee = value.mul(new anchor.BN(5)).div(new anchor.BN(100));
        const estimatedTxFee = new anchor.BN(5000);
        const totalRequired = value.add(platformFee).add(estimatedTxFee);

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

        const postAccount = await program.account.post.fetch(postPda);
        expect(postAccount.id.toString()).to.equal(postId.toString());
        expect(postAccount.publisher.toString()).to.equal(publisher.publicKey.toString());
        expect(postAccount.title).to.equal(title);
        expect(postAccount.description).to.equal(description);
        expect(postAccount.value.toString()).to.equal(value.toString());
        expect(postAccount.isOpen).to.be.true;
        expect(postAccount.isCompleted).to.be.false;
        expect(postAccount.acceptedHelper).to.be.null;

        // Check vault has funds
        const vaultAccount = await program.account.vault.fetch(vaultPda);
        expect(vaultAccount.authority.toString()).to.equal(postPda.toString());

        const vaultBalance = await provider.connection.getBalance(vaultPda);
        expect(vaultBalance).to.equal(totalRequired.toNumber());
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
                post: postPda,
                helpRequest: helpRequestPda,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([helper])
            .rpc();

        const helpRequestAccount = await program.account.helpRequest.fetch(helpRequestPda);
        expect(helpRequestAccount.postId.toString()).to.equal(postId.toString());
        expect(helpRequestAccount.applicant.toString()).to.equal(helper.publicKey.toString());
        expect(helpRequestAccount.status.pending).to.be.true;
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
                post: postPda,
                helpRequest: helpRequestPda,
                applicant: helper.publicKey,
            })
            .signers([publisher])
            .rpc();

        const postAccount = await program.account.post.fetch(postPda);
        expect(postAccount.isOpen).to.be.false;
        expect(postAccount.acceptedHelper.toString()).to.equal(helper.publicKey.toString());

        const helpRequestAccount = await program.account.helpRequest.fetch(helpRequestPda);
        expect(helpRequestAccount.status.accepted).to.be.true;
    });

    it("Should complete contract successfully", async () => {
        const [postPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), postId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        const [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), postPda.toBuffer()],
            program.programId
        );

        const helperBalanceBefore = await provider.connection.getBalance(helper.publicKey);
        const platformBalanceBefore = await provider.connection.getBalance(platformFeeRecipient.publicKey);

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

        const postAccount = await program.account.post.fetch(postPda);
        expect(postAccount.isCompleted).to.be.true;

        const helperBalanceAfter = await provider.connection.getBalance(helper.publicKey);
        const platformBalanceAfter = await provider.connection.getBalance(platformFeeRecipient.publicKey);

        // Check payments were made
        expect(helperBalanceAfter).to.be.greaterThan(helperBalanceBefore);
        expect(platformBalanceAfter).to.be.greaterThan(platformBalanceBefore);
    });

    it("Should prevent creating post with invalid data", async () => {
        const invalidPostId = new anchor.BN(2);
        const [postPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), invalidPostId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        const [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), postPda.toBuffer()],
            program.programId
        );

        // Test with zero value
        try {
            await program.methods
                .createPost(invalidPostId, "Test", "Description", new anchor.BN(0))
                .accounts({
                    publisher: publisher.publicKey,
                    post: postPda,
                    vault: vaultPda,
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

        // Test unauthorized user trying to accept helper
        try {
            await program.methods
                .acceptHelper(postId, helper.publicKey)
                .accounts({
                    publisher: unauthorizedUser.publicKey,
                    post: postPda,
                    helpRequest: PublicKey.default, // This will fail anyway
                    applicant: helper.publicKey,
                })
                .signers([unauthorizedUser])
                .rpc();
            expect.fail("Should have thrown error for unauthorized access");
        } catch (error) {
            expect(error.message).to.include("Unauthorized");
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
                    post: postPda,
                    helpRequest: helpRequestPda,
                    systemProgram: SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                })
                .signers([helper])
                .rpc();
            expect.fail("Should have thrown error for double application");
        } catch (error) {
            expect(error.message).to.include("Already applied");
        }
    });

    it("Should create and cancel post successfully", async () => {
        const cancelPostId = new anchor.BN(3);
        const [cancelPostPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("post"), cancelPostId.toArrayLike(Buffer, "le", 8)],
            program.programId
        );

        const [cancelVaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), cancelPostPda.toBuffer()],
            program.programId
        );

        const publisherBalanceBefore = await provider.connection.getBalance(publisher.publicKey);

        // Create post
        await program.methods
            .createPost(cancelPostId, "Cancel Test", "Test description", value)
            .accounts({
                publisher: publisher.publicKey,
                post: cancelPostPda,
                vault: cancelVaultPda,
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
                post: cancelPostPda,
                vault: cancelVaultPda,
                platformFeeRecipient: platformFeeRecipient.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([publisher])
            .rpc();

        const postAccount = await program.account.post.fetch(cancelPostPda);
        expect(postAccount.isOpen).to.be.false;
        expect(postAccount.isCompleted).to.be.true;

        const publisherBalanceAfter = await provider.connection.getBalance(publisher.publicKey);
        expect(publisherBalanceAfter).to.be.greaterThan(publisherBalanceBefore);
    });
}); 