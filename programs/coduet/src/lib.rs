#![allow(deprecated)]

use anchor_lang::prelude::*;

pub mod errors;
pub mod state;
pub mod utils;
pub mod ix_accounts;
pub mod instructions;

// Reexport structs for Anchor macro
pub use ix_accounts::*;

declare_id!("G5gcEvNxXPxsUwKmGNxNheKq2j5nBghciJpCyooPCKdd");

#[program]
pub mod coduet {
    use super::*;

    pub fn create_post(
        ctx: Context<CreatePost>,
        post_id: u64,
        title: String,
        value: u64,
    ) -> Result<()> {
        instructions::create_post::create_post_handler(ctx, post_id, title, value)
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