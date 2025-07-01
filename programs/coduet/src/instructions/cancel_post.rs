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
    let refund_amount = ctx.accounts.post.value;
    // The platform fee is not refunded
    require!(ctx.accounts.main_vault.key().to_string() == MAIN_VAULT_PUBKEY, CoduetError::UnauthorizedPublisher);
    let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.main_vault.key(),
        &ctx.accounts.publisher.key(),
        refund_amount,
    );
    anchor_lang::solana_program::program::invoke(
        &transfer_instruction,
        &[
            ctx.accounts.main_vault.to_account_info(),
            ctx.accounts.publisher.to_account_info(),
        ],
    )?;
    // Marcar post como cancelado
    ctx.accounts.post.is_open = false;
    ctx.accounts.post.is_completed = true;
    msg!("Post cancelled successfully: {}", post_id);
    msg!("Refunded: {} lamports", refund_amount);
    Ok(())
} 