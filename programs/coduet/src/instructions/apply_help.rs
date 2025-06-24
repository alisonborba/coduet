use anchor_lang::prelude::*;
use crate::state::{Post, Vault, HelpRequest};
use crate::errors::*;
use crate::utils::*;
use crate::ix_accounts::ApplyHelp;

pub fn apply_help_handler(
    ctx: Context<ApplyHelp>,
    post_id: u64,
) -> Result<()> {
    require!(
        ctx.accounts.post.is_open,
        CoduetError::PostNotOpen
    );
    require!(
        !ctx.accounts.post.is_completed,
        CoduetError::PostAlreadyCompleted
    );
    require!(
        ctx.accounts.post.publisher != ctx.accounts.applicant.key(),
        CoduetError::UnauthorizedPublisher
    );
    let current_time = get_current_timestamp();
    let help_request = HelpRequest::new(
        post_id,
        ctx.accounts.applicant.key(),
        current_time,
    );
    *ctx.accounts.help_request = help_request;
    msg!("Help request submitted successfully for post: {}", post_id);
    Ok(())
} 