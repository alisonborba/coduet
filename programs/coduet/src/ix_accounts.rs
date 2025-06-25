use anchor_lang::prelude::*;
use crate::errors::*;
use crate::state::{Post, HelpRequest};

#[derive(Accounts)]
#[instruction(post_id: u64, title: String, description: String, value: u64)]
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
pub struct ApplyHelp<'info> {
    #[account(mut)]
    pub applicant: Signer<'info>,
    #[account(
        mut,
        seeds = [b"post", post_id.to_le_bytes().as_ref()],
        bump,
        constraint = post.publisher != applicant.key() @ CoduetError::UnauthorizedPublisher
    )]
    pub post: Account<'info, Post>,
    /// CHECK: main_vault is an externally owned system account (not a PDA), validated by pubkey in handler.
    #[account(mut)]
    pub main_vault: AccountInfo<'info>,
    #[account(
        init,
        payer = applicant,
        space = HelpRequest::LEN,
        seeds = [b"help_request", post.key().as_ref(), applicant.key().as_ref()],
        bump
    )]
    pub help_request: Account<'info, HelpRequest>,
    /// CHECK: This is the system program
    pub system_program: Program<'info, System>,
    /// CHECK: This is the rent sysvar
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(post_id: u64, _applicant: Pubkey)]
pub struct AcceptHelper<'info> {
    #[account(mut)]
    pub publisher: Signer<'info>,
    #[account(
        mut,
        seeds = [b"post", post_id.to_le_bytes().as_ref()],
        bump,
        constraint = post.publisher == publisher.key() @ CoduetError::UnauthorizedPublisher,
        constraint = post.is_open @ CoduetError::PostNotOpen,
        constraint = !post.is_completed @ CoduetError::PostAlreadyCompleted
    )]
    pub post: Account<'info, Post>,
    #[account(
        mut,
        seeds = [b"help_request", post.key().as_ref(), applicant.key().as_ref()],
        bump,
        constraint = help_request.applicant == applicant.key() @ CoduetError::HelpRequestNotFound,
        constraint = help_request.is_pending() @ CoduetError::HelpRequestNotPending
    )]
    pub help_request: Account<'info, HelpRequest>,
    /// CHECK: applicant wallet
    pub applicant: UncheckedAccount<'info>,
    /// CHECK: main_vault is an externally owned system account (not a PDA), validated by pubkey in handler.
    #[account(mut)]
    pub main_vault: AccountInfo<'info>,
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
        constraint = !post.is_completed @ CoduetError::PostAlreadyCompleted,
        constraint = post.accepted_helper.is_some() @ CoduetError::PostNotFound
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