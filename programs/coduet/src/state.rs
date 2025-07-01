use anchor_lang::prelude::*;
use anchor_lang::Result;
use crate::errors::CoduetError;

#[account]
pub struct Post {
    pub id: u64,
    pub publisher: Pubkey,
    pub title: String,
    pub value: u64,
    pub is_open: bool,
    pub platform_fee: u64,
    pub accepted_helper: Option<Pubkey>,
    pub is_completed: bool,
    pub created_at: i64,
    pub expires_at: i64,
}

impl Post {
    pub const LEN: usize = 8 + // discriminator
        8 + // id
        32 + // publisher
        4 + 100 + // title (max 100 chars)
        8 + // value
        1 + // is_open
        8 + // platform_fee
        4 + 32 + // accepted_helper (Option<Pubkey>)
        1 + // is_completed
        8 + // created_at
        8; // expires_at

    pub fn new(
        id: u64,
        publisher: Pubkey,
        title: String,
        value: u64,
        platform_fee: u64,
        created_at: i64,
    ) -> Result<Self> {
        require!(value > 0, CoduetError::InsufficientFunds);
        require!(title.len() <= 100, CoduetError::InvalidTitleLength);
        require!(platform_fee > 0, CoduetError::InvalidPlatformFee);

        // 30 dias em segundos: 30 * 24 * 60 * 60 = 2,592,000
        let thirty_days_in_seconds: i64 = 30 * 24 * 60 * 60;
        let expires_at = created_at
            .checked_add(thirty_days_in_seconds)
            .ok_or(CoduetError::ArithmeticOverflow)?;

        Ok(Self {
            id,
            publisher,
            title,
            value,
            is_open: true,
            platform_fee,
            accepted_helper: None,
            is_completed: false,
            created_at,
            expires_at,
        })
    }

    pub fn get_total_payment(&self) -> Result<u64> {
        Ok(self.value)
    }

    pub fn is_expired(&self, current_time: i64) -> bool {
        current_time > self.expires_at
    }

    pub fn can_accept_applications(&self, current_time: i64) -> bool {
        self.is_open && !self.is_completed && !self.is_expired(current_time)
    }
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub bump: u8,
}

impl Vault {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        1; // bump
} 