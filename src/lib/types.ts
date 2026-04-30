// Shared TypeScript types mirroring the Supabase schema.

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
export type LoanStatus = 'pending_handover' | 'active' | 'pending_return' | 'completed' | 'disputed';
export type ThreadKind = 'request' | 'loan';
export type DisputeStatus = 'open' | 'resolved';

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
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  photos: string[];
  max_loan_days: number;
  extensions_allowed: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

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
  loan_period_days: number;
  handover_photo_url: string | null;
  handover_at: string | null;
  due_at: string | null;
  return_initiated_at: string | null;
  return_photo_url: string | null;
  completed_at: string | null;
  extensions_used: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_kind: ThreadKind;
  thread_id: string;
  sender_id: string;
  body: string;
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
