use anchor_lang::prelude::*;
use crate::state::{Post, Vault, HelpRequest};
use crate::errors::*;
use crate::ix_accounts::CompleteContract;

pub fn complete_contract_handler(
    ctx: Context<CompleteContract>,
    post_id: u64,
) -> Result<()> {
    require!(
        ctx.accounts.post.publisher == ctx.accounts.publisher.key(),
        CoduetError::UnauthorizedPublisher
    );
    require!(
        !ctx.accounts.post.is_completed,
        CoduetError::PostAlreadyCompleted
    );
    require!(
        ctx.accounts.post.accepted_helper.is_some(),
        CoduetError::PostNotFound
    );
    let helper_pubkey = ctx.accounts.post.accepted_helper.unwrap();
    let platform_fee = ctx.accounts.post.platform_fee;
    let helper_amount = ctx.accounts.post.value - platform_fee;
    let transfer_helper_instruction = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.vault.key(),
        &helper_pubkey,
        helper_amount,
    );
    anchor_lang::solana_program::program::invoke(
        &transfer_helper_instruction,
        &[
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.helper.to_account_info(),
        ],
    )?;
    let transfer_platform_fee_instruction = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.vault.key(),
        &ctx.accounts.platform_fee_recipient.key(),
        platform_fee,
    );
    anchor_lang::solana_program::program::invoke(
        &transfer_platform_fee_instruction,
        &[
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.platform_fee_recipient.to_account_info(),
        ],
    )?;
    
    // Mark post as completed
    ctx.accounts.post.is_completed = true;
    
    msg!("Contract completed successfully for post: {}", post_id);
    msg!("Helper received: {} lamports", helper_amount);
    msg!("Platform fee: {} lamports", platform_fee);
    Ok(())
} 