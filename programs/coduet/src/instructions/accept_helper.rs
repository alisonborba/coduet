use anchor_lang::prelude::*;
use crate::errors::*;
use crate::ix_accounts::AcceptHelper;

pub fn accept_helper_handler(
    ctx: Context<AcceptHelper>,
    post_id: u64,
    applicant: Pubkey,
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
        ctx.accounts.help_request.applicant == applicant,
        CoduetError::HelpRequestNotFound
    );
    require!(
        ctx.accounts.help_request.is_pending(),
        CoduetError::HelpRequestNotPending
    );
    
    // Update post
    ctx.accounts.post.accepted_helper = Some(applicant);
    ctx.accounts.post.is_open = false;
    
    // Update help request
    ctx.accounts.help_request.accept();
    
    msg!("Helper accepted successfully for post: {}", post_id);
    msg!("Accepted helper: {}", applicant);
    Ok(())
} 