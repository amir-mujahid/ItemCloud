// src/services/claimService.js
// Thin wrapper (kept for compatibility). Re-exports from ./claims

export {
  nextClaimId,
  createAllClaimPending,
  setClaimAttemptStatus,
  finalizeSuccessfulClaim,
} from './claims';
