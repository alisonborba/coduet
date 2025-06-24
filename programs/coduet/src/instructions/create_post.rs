use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;
use crate::utils::*;
use crate::ix_accounts::CreatePost;

pub fn create_post_handler(
    ctx: Context<CreatePost>,
    post_id: u64,
    title: String,
    description: String,
    value: u64,
) -> Result<()> {
    require!(value > 0, CoduetError::InsufficientFunds);
    require!(title.len() <= 100, CoduetError::InvalidTitleLength);
    require!(description.len() <= 500, CoduetError::InvalidDescriptionLength);
    
    let platform_fee = calculate_platform_fee(value)?;
    let total_required = calculate_total_required_funds(value)?;
    require!(
        ctx.accounts.publisher.lamports() >= total_required,
        CoduetError::InsufficientFunds
    );
    let current_time = get_current_timestamp();
    let post = Post::new(
        post_id,
        ctx.accounts.publisher.key(),
        title,
        description,
        value,
        platform_fee,
        current_time,
    )?;
    let vault = Vault {
        authority: ctx.accounts.post.key(),
        bump: ctx.bumps.vault,
    };
    let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.publisher.key(),
        &ctx.accounts.vault.key(),
        total_required,
    );
    anchor_lang::solana_program::program::invoke(
        &transfer_instruction,
        &[
            ctx.accounts.publisher.to_account_info(),
            ctx.accounts.vault.to_account_info(),
        ],
    )?;
    *ctx.accounts.post = post;
    *ctx.accounts.vault = vault;
    msg!("Post created successfully with ID: {}", post_id);
    msg!("Total funds locked: {} lamports", total_required);
    Ok(())
} 