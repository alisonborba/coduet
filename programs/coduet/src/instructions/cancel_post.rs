use anchor_lang::prelude::*;
use crate::errors::*;
use crate::ix_accounts::CancelPost;
use crate::utils::MAIN_VAULT_PUBKEY;

pub fn cancel_post_handler(
    ctx: Context<CancelPost>,
    post_id: u64,
) -> Result<()> {
    require!(
        ctx.accounts.post.publisher == ctx.accounts.publisher.key(),
        CoduetError::UnauthorizedPublisher
    );
    require!(
        ctx.accounts.post.is_open,
        CoduetError::PostNotOpen
    );
    require!(
        !ctx.accounts.post.is_completed,
        CoduetError::PostAlreadyCompleted
    );
    require!(
        ctx.accounts.post.accepted_helper.is_none(),
        CoduetError::CannotCancelWithHelper
    );
    let platform_fee = ctx.accounts.post.platform_fee;
    let refund_amount = ctx.accounts.post.value;
    let total_refund = refund_amount + platform_fee;
    // Validate main_vault
    require!(ctx.accounts.main_vault.key().to_string() == MAIN_VAULT_PUBKEY, CoduetError::UnauthorizedPublisher);
    let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.main_vault.key(),
        &ctx.accounts.publisher.key(),
        total_refund,
    );
    anchor_lang::solana_program::program::invoke(
        &transfer_instruction,
        &[
            ctx.accounts.main_vault.to_account_info(),
            ctx.accounts.publisher.to_account_info(),
        ],
    )?;
    
    // Mark post as cancelled
    ctx.accounts.post.is_open = false;
    ctx.accounts.post.is_completed = true;
    
    msg!("Post cancelled successfully: {}", post_id);
    msg!("Refunded: {} lamports", total_refund);
    Ok(())
} 