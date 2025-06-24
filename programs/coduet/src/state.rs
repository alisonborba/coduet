use anchor_lang::prelude::*;
use anchor_lang::Result;
use crate::errors::CoduetError;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum HelpRequestStatus {
    Pending,
    Accepted,
    Rejected,
}

#[account]
pub struct Post {
    pub id: u64,
    pub publisher: Pubkey,
    pub title: String,
    pub description: String,
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
        4 + 500 + // description (max 500 chars)
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
        description: String,
        value: u64,
        platform_fee: u64,
        created_at: i64,
    ) -> Result<Self> {
        require!(value > 0, CoduetError::InsufficientFunds);
        require!(title.len() <= 100, CoduetError::InvalidTitleLength);
        require!(description.len() <= 500, CoduetError::InvalidDescriptionLength);
        require!(platform_fee > 0, CoduetError::InvalidPlatformFee);

        let expires_at = created_at.checked_add(30 * 24 * 60 * 60).unwrap();

        Ok(Self {
            id,
            publisher,
            title,
            description,
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
pub struct HelpRequest {
    pub post_id: u64,
    pub applicant: Pubkey,
    pub status: HelpRequestStatus,
    pub applied_at: i64,
}

impl HelpRequest {
    pub const LEN: usize = 8 + // discriminator
        8 + // post_id
        32 + // applicant
        1 + // status
        8; // applied_at

    pub fn new(post_id: u64, applicant: Pubkey, applied_at: i64) -> Self {
        Self {
            post_id,
            applicant,
            status: HelpRequestStatus::Pending,
            applied_at,
        }
    }

    pub fn accept(&mut self) {
        self.status = HelpRequestStatus::Accepted;
    }

    pub fn reject(&mut self) {
        self.status = HelpRequestStatus::Rejected;
    }

    pub fn is_pending(&self) -> bool {
        self.status == HelpRequestStatus::Pending
    }

    pub fn is_accepted(&self) -> bool {
        self.status == HelpRequestStatus::Accepted
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