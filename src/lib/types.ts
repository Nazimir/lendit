// Shared TypeScript types mirroring the Supabase schema.

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
export type LoanStatus = 'pending_handover' | 'active' | 'pending_return' | 'completed' | 'disputed' | 'cancelled' | 'lost';

export interface Dispute {
  id: string;
  loan_id: string;
  opened_by: string;
  reason: string;
  status: DisputeStatus;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}
export type DisputeStatus = 'open' | 'resolved';
export type ExtensionStatus = 'pending' | 'approved' | 'denied' | 'cancelled';
export type LendInviteStatus = 'pending' | 'claimed' | 'expired' | 'cancelled';

export interface LendInvite {
  id: string;
  token: string;
  lender_id: string;
  item_id: string;
  loan_period_days: number;
  recipient_hint: string;
  status: LendInviteStatus;
  expires_at: string;
  claimed_by: string | null;
  claimed_at: string | null;
  loan_id: string | null;
  created_at: string;
}

export interface LoanExtension {
  id: string;
  loan_id: string;
  requested_by: string;
  additional_days: number;
  reason: string;
  status: ExtensionStatus;
  decided_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  first_name: string;
  photo_url: string | null;
  suburb: string;
  email: string;
  phone: string | null;
  reputation_score: number;
  karma_points: number;
  social_linked: boolean;
  tos_accepted_at: string | null;
  is_adult_attested: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  phone_verified: boolean;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  away_until: string | null;
  territory_override: string | null;
  created_at: string;
  updated_at: string;
}

export type ReportTargetKind = 'profile' | 'item' | 'message' | 'loan';
export type ReportStatus = 'open' | 'dismissed' | 'actioned';

export interface Report {
  id: string;
  reporter_id: string;
  target_kind: ReportTargetKind;
  target_id: string;
  reason: string;
  detail: string;
  status: ReportStatus;
  resolution_note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface Quirks {
  origin?: string;
  gifted_by?: string;
  cravings?: string;
  habits?: string;
}

export type ItemVisibility = 'public' | 'private';

export interface Item {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  photos: string[];
  max_loan_days: number | null;
  extensions_allowed: boolean;
  is_available: boolean;
  expected_back_at: string | null;
  quirks: Quirks;
  chain_handoffs_allowed: boolean;
  visibility: ItemVisibility;
  created_at: string;
  updated_at: string;
}

export const QUIRK_QUESTIONS: { key: keyof Quirks; label: string; placeholder: string; helper: string }[] = [
  {
    key: 'origin',
    label: 'Origin story',
    placeholder: 'Charity shop find, hand-me-down, etc.',
    helper: 'Where did this come from?'
  },
  {
    key: 'gifted_by',
    label: 'Gifted by / made by',
    placeholder: 'Mum · my niece · myself, hopefully',
    helper: 'Optional. Who put this into your life?'
  },
  {
    key: 'cravings',
    label: 'What it craves',
    placeholder: 'Earl Grey, AA batteries, sunlight, attention',
    helper: 'Foods, fuels, vibes — get weird.'
  },
  {
    key: 'habits',
    label: 'Quirks & habits',
    placeholder: 'Squeaks before it works · refuses to be put down on a Tuesday',
    helper: 'Anything the next person should know.'
  }
];

export interface ItemWithOwner extends Item {
  owner_first_name: string;
  owner_suburb: string;
  owner_photo_url: string | null;
  owner_reputation: number;
}

export interface BorrowRequest {
  id: string;
  item_id: string;
  borrower_id: string;
  lender_id: string;
  message: string;
  status: RequestStatus;
  expires_at: string;
  chain_after_loan_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: string;
  item_id: string;
  borrower_id: string;
  lender_id: string;
  request_id: string | null;
  status: LoanStatus;
  loan_period_days: number | null;
  handover_photos: string[];
  handover_at: string | null;
  due_at: string | null;
  return_initiated_at: string | null;
  return_photos: string[];
  completed_at: string | null;
  extensions_used: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  context_item_id: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  loan_id: string;
  reviewer_id: string;
  reviewee_id: string;
  stars: number;
  comment: string;
  created_at: string;
}

export const CATEGORIES = [
  'Tools',
  'Kitchen',
  'Outdoor & Camping',
  'Sports',
  'Books & Media',
  'Electronics',
  'Garden',
  'Party & Events',
  'Baby & Kids',
  'Music',
  'Travel',
  'Other'
] as const;
export type Category = typeof CATEGORIES[number];
