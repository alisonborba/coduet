use anchor_lang::prelude::*;
use crate::errors::CoduetError;

pub const PLATFORM_FEE_PERCENTAGE: u64 = 5; // 5%
pub const MIN_PLATFORM_FEE: u64 = 1000; // 0.001 SOL in lamports
pub const FIXED_TX_FEE_LAMPORTS: u64 = 10_000; // 0.01 SOL por transação (ajuste aqui)
pub const NUM_TXS_COVERED: u64 = 2; // Quantas transações o publisher cobre antecipadamente
pub const MAIN_VAULT_PUBKEY: &str = "4waxnAptoSYbKEeFtx8Qo7tauC9yhfCL6z2eT7MK4Vr2";

pub fn calculate_platform_fee(value: u64) -> Result<u64> {
    let fee = value
        .checked_mul(PLATFORM_FEE_PERCENTAGE)
        .ok_or(CoduetError::ArithmeticOverflow)?
        .checked_div(100)
        .ok_or(CoduetError::ArithmeticOverflow)?;
    Ok(std::cmp::max(fee, MIN_PLATFORM_FEE))
}

pub fn calculate_total_required_funds(value: u64) -> Result<u64> {
    let platform_fee = calculate_platform_fee(value)?;
    let total = value
        .checked_add(platform_fee)
        .ok_or(CoduetError::ArithmeticOverflow)?
        .checked_add(FIXED_TX_FEE_LAMPORTS.checked_mul(NUM_TXS_COVERED).ok_or(CoduetError::ArithmeticOverflow)?)
        .ok_or(CoduetError::ArithmeticOverflow)?;
    Ok(total)
}

pub fn get_current_timestamp() -> i64 {
    Clock::get().unwrap().unix_timestamp
}

pub fn validate_string_length(s: &str, max_length: usize) -> Result<()> {
    require!(s.len() <= max_length, CoduetError::InvalidTitleLength);
    Ok(())
} 