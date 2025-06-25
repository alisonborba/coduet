use anchor_lang::prelude::*;
use crate::state::Post;
use crate::errors::*;
use crate::utils::*;
use crate::ix_accounts::CreatePost;
use crate::utils::MAIN_VAULT_PUBKEY;

pub fn create_post_handler(
    ctx: Context<CreatePost>,
    post_id: u64,
    title: String,
    description: String,
    value: u64,
) -> Result<()> {
    require!(value > 0, CoduetError::InvalidValue);
    require!(title.len() <= 100, CoduetError::InvalidTitleLength);
    require!(description.len() <= 500, CoduetError::InvalidDescriptionLength);
    
    let platform_fee = calculate_platform_fee(value)?;
    let total_required = calculate_total_required_funds(value)?;
    require!(
        ctx.accounts.publisher.lamports() >= total_required,
        CoduetError::InsufficientFunds
    );
    require!(ctx.accounts.main_vault.key().to_string() == MAIN_VAULT_PUBKEY, CoduetError::UnauthorizedPublisher);
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
    let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.publisher.key(),
        &ctx.accounts.main_vault.key(),
        total_required,
    );
    anchor_lang::solana_program::program::invoke(
        &transfer_instruction,
        &[
            ctx.accounts.publisher.to_account_info(),
            ctx.accounts.main_vault.to_account_info(),
        ],
    )?;
    *ctx.accounts.post = post;
    msg!("Post created successfully with ID: {}", post_id);
    msg!("Total funds locked: {} lamports", total_required);
    Ok(())
} 