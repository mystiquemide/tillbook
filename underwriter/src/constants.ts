export const USDC_DECIMALS = 6;
export const ONE_USDC = 10n ** 6n;

export const BPS = 10_000n;
export const MAX_HOLDBACK_BPS = 5_000;

/** Payments older than this are ignored. */
export const WINDOW_SECONDS = 30n * 24n * 60n * 60n;
/** A merchant needs payments from at least this many different customers. */
export const MIN_DISTINCT_PAYERS = 3;
/** Each customer counts for at most this share of window volume (anti wash-trading). */
export const PAYER_CAP_BPS = 2_000n;
/** Advance size is this share of capped volume, before the repayment boost. */
export const ADVANCE_RATIO_BPS = 5_000n;
/** Each fully repaid advance adds this much to the multiplier. */
export const BOOST_STEP_BPS = 2_500n;
export const MAX_BOOST_BPS = 20_000n;
export const MAX_ADVANCE = 5_000n * ONE_USDC;
export const FEE_BPS = 600n;
export const HOLDBACK_BPS = 1_000;
export const OFFER_TTL_SECONDS = 15n * 60n;
