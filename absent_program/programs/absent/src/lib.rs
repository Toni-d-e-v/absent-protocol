use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount},
};

declare_id!("ES64FE284PSScPkvQSLUA3HfCWq84TKSpUjdxJz2UfSG");

#[program]
pub mod absent {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        verifier: Pubkey,
        forbidden_program: Pubkey,
        start_slot: u64,
        end_slot: u64,
    ) -> Result<()> {
        require!(start_slot < end_slot, AbsentError::InvalidContextWindow);

        let cfg = &mut ctx.accounts.config;
        cfg.admin = ctx.accounts.admin.key();
        cfg.verifier = verifier;
        cfg.forbidden_program = forbidden_program;
        cfg.start_slot = start_slot;
        cfg.end_slot = end_slot;
        cfg.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn update_context(
        ctx: Context<UpdateContext>,
        forbidden_program: Pubkey,
        start_slot: u64,
        end_slot: u64,
    ) -> Result<()> {
        require!(start_slot < end_slot, AbsentError::InvalidContextWindow);
        let cfg = &mut ctx.accounts.config;
        cfg.forbidden_program = forbidden_program;
        cfg.start_slot = start_slot;
        cfg.end_slot = end_slot;
        Ok(())
    }

    pub fn verify_and_award(ctx: Context<VerifyAndAward>, proof_hash: [u8; 32]) -> Result<()> {
        let cfg = &ctx.accounts.config;

        // verifier must match config + sign
        require_keys_eq!(
            ctx.accounts.verifier.key(),
            cfg.verifier,
            AbsentError::InvalidVerifier
        );
        require!(
            ctx.accounts.verifier.is_signer,
            AbsentError::VerifierMustSign
        );

        // Claim PDA prevents replay per context
        let claim = &mut ctx.accounts.claim;
        claim.user = ctx.accounts.user.key();
        claim.config = cfg.key();
        claim.proof_hash = proof_hash;
        claim.claimed = true;
        claim.bump = ctx.bumps.claim;

        // PDA signer seeds
        let config_key = cfg.key();
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"mint_auth",
            config_key.as_ref(),
            &[ctx.bumps.mint_authority],
        ]];

        // Mint award token (1, decimals=0)
        let cpi = MintTo {
            mint: ctx.accounts.award_mint.to_account_info(),
            to: ctx.accounts.user_ata.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi,
                signer_seeds,
            ),
            1,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Config::SIZE,
        seeds = [b"config", admin.key().as_ref()],
        bump
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateContext<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config", admin.key().as_ref()],
        bump = config.bump,
        has_one = admin
    )]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct VerifyAndAward<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// Verifier signs the tx (server partially signs; user submits)
    pub verifier: Signer<'info>,

    #[account(
        seeds = [b"config", config.admin.as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = user,
        space = 8 + Claim::SIZE,
        seeds = [
            b"claim",
            config.key().as_ref(),
            user.key().as_ref(),
            &config.start_slot.to_le_bytes(),
            &config.end_slot.to_le_bytes(),
            config.forbidden_program.as_ref(),
        ],
        bump
    )]
    pub claim: Account<'info, Claim>,

    /// CHECK: PDA used only as signer authority
    #[account(
        seeds = [b"mint_auth", config.key().as_ref()],
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = mint_authority,
        mint::freeze_authority = mint_authority
    )]
    pub award_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = user,
        associated_token::mint = award_mint,
        associated_token::authority = user
    )]
    pub user_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub verifier: Pubkey,
    pub forbidden_program: Pubkey,
    pub start_slot: u64,
    pub end_slot: u64,
    pub bump: u8,
}
impl Config {
    pub const SIZE: usize = 32 + 32 + 32 + 8 + 8 + 1;
}

#[account]
pub struct Claim {
    pub user: Pubkey,
    pub config: Pubkey,
    pub proof_hash: [u8; 32],
    pub claimed: bool,
    pub bump: u8,
}
impl Claim {
    pub const SIZE: usize = 32 + 32 + 32 + 1 + 1;
}

#[error_code]
pub enum AbsentError {
    #[msg("Invalid context window")]
    InvalidContextWindow,
    #[msg("Invalid verifier")]
    InvalidVerifier,
    #[msg("Verifier must sign")]
    VerifierMustSign,
}
