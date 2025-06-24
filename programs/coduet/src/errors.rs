use anchor_lang::prelude::*;

#[error_code]
pub enum CoduetError {
    #[msg("Invalid hourly rate - must be greater than 0")]
    InvalidHourlyRate,
    
    #[msg("Invalid estimated hours - must be between 1 and 255")]
    InvalidEstimatedHours,
    
    #[msg("Post is not open for applications")]
    PostNotOpen,
    
    #[msg("Post is already completed")]
    PostAlreadyCompleted,
    
    #[msg("Post already has an accepted helper")]
    PostAlreadyHasHelper,
    
    #[msg("Help request not found")]
    HelpRequestNotFound,
    
    #[msg("Help request is not pending")]
    HelpRequestNotPending,
    
    #[msg("Only publisher can perform this action")]
    UnauthorizedPublisher,
    
    #[msg("Cannot cancel post with accepted helper")]
    CannotCancelWithHelper,
    
    #[msg("Insufficient funds for post creation")]
    InsufficientFunds,
    
    #[msg("Invalid platform fee")]
    InvalidPlatformFee,
    
    #[msg("Post not found")]
    PostNotFound,
    
    #[msg("User already applied to this post")]
    AlreadyApplied,
    
    #[msg("Invalid post ID")]
    InvalidPostId,
    
    #[msg("Post has expired")]
    PostExpired,
    
    #[msg("Invalid title length")]
    InvalidTitleLength,
    
    #[msg("Invalid description length")]
    InvalidDescriptionLength,
    
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
} 