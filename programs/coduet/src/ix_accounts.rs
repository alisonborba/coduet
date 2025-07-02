use anchor_lang::prelude::*;
use crate::errors::*;
use crate::state::{Post};

#[derive(Accounts)]
#[instruction(post_id: u64, title: String, value: u64)]
pub struct CreatePost<'info> {
    #[account(mut)]
    pub publisher: Signer<'info>,
    #[account(
        init,
        payer = publisher,
        space = Post::LEN,
        seeds = [b"post", post_id.to_le_bytes().as_ref()],
        bump
    )]
    pub post: Account<'info, Post>,
    /// CHECK: main_vault is an externally owned system account (not a PDA), validated by pubkey in handler.
    #[account(mut)]
    pub main_vault: AccountInfo<'info>,
    /// CHECK: This is the system program
    pub system_program: Program<'info, System>,
    /// CHECK: This is the rent sysvar
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(post_id: u64)]
pub struct CompleteContract<'info> {
    #[account(mut)]
    pub publisher: Signer<'info>,
    #[account(mut, signer)]
    pub main_vault: Signer<'info>,
    #[account(
        mut,
        seeds = [b"post", post_id.to_le_bytes().as_ref()],
        bump,
        constraint = post.publisher == publisher.key() @ CoduetError::UnauthorizedPublisher,
        constraint = !post.is_completed @ CoduetError::PostAlreadyCompleted
    )]
    pub post: Account<'info, Post>,
    /// CHECK: This is the helper's account
    #[account(mut)]
    pub helper: AccountInfo<'info>,
    /// CHECK: This is the platform fee recipient
    #[account(mut)]
    pub platform_fee_recipient: AccountInfo<'info>,
    /// CHECK: This is the system program
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(post_id: u64)]
pub struct CancelPost<'info> {
    #[account(mut)]
    pub publisher: Signer<'info>,
    #[account(mut, signer)]
    pub main_vault: Signer<'info>,
    #[account(
        mut,
        seeds = [b"post", post_id.to_le_bytes().as_ref()],
        bump,
        constraint = post.publisher == publisher.key() @ CoduetError::UnauthorizedPublisher,
        constraint = post.is_open @ CoduetError::PostNotOpen,
        constraint = !post.is_completed @ CoduetError::PostAlreadyCompleted,
        constraint = post.accepted_helper.is_none() @ CoduetError::CannotCancelWithHelper
    )]
    pub post: Account<'info, Post>,
    /// CHECK: This is the platform fee recipient
    #[account(mut)]
    pub platform_fee_recipient: AccountInfo<'info>,
    /// CHECK: This is the system program
    pub system_program: Program<'info, System>,
} 