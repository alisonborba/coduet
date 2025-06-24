#![allow(deprecated)]

use anchor_lang::prelude::*;

pub mod errors;
pub mod state;
pub mod utils;
pub mod ix_accounts;
pub mod instructions;

// Reexport structs for Anchor macro
pub use ix_accounts::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod coduet {
    use super::*;

    pub fn create_post(
        ctx: Context<CreatePost>,
        post_id: u64,
        title: String,
        description: String,
        value: u64,
    ) -> Result<()> {
        instructions::create_post::create_post_handler(ctx, post_id, title, description, value)
    }

    pub fn apply_help(
        ctx: Context<ApplyHelp>,
        post_id: u64,
    ) -> Result<()> {
        instructions::apply_help::apply_help_handler(ctx, post_id)
    }

    pub fn accept_helper(
        ctx: Context<AcceptHelper>,
        post_id: u64,
        applicant: Pubkey,
    ) -> Result<()> {
        instructions::accept_helper::accept_helper_handler(ctx, post_id, applicant)
    }

    pub fn complete_contract(
        ctx: Context<CompleteContract>,
        post_id: u64,
    ) -> Result<()> {
        instructions::complete_contract::complete_contract_handler(ctx, post_id)
    }

    pub fn cancel_post(
        ctx: Context<CancelPost>,
        post_id: u64,
    ) -> Result<()> {
        instructions::cancel_post::cancel_post_handler(ctx, post_id)
    }
} 