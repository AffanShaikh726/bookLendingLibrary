export type BorrowRequestStatus = 'pending' | 'approved' | 'rejected' | 'returned' | 'cancelled';

export interface BorrowRequest {
  id?: string;
  created_at?: string;
  book_id: string; // uuid, Foreign Key referencing books.id
  borrower_id: string; // uuid, Foreign Key referencing auth.users.id
  owner_id: string; // uuid, Foreign Key referencing auth.users.id
  status: BorrowRequestStatus;
  request_date: string; // timestamptz
  approval_date?: string | null; // timestamptz, Nullable
  due_date?: string | null; // timestamptz, Nullable
  return_date?: string | null; // timestamptz, Nullable
  updated_at?: string; // timestamptz, Default: now()
  owner_notes?: string | null;
  isProcessing?: boolean; // UI state for loading indicators

  // Optional relations that can be joined
  book?: { id?: string; title: string; author: string; };
  borrower?: { id?: string; email: string; username?: string; }; // Populated from profiles table

  // Optional fields after joining
  book_title?: string;
  borrower_email?: string;
  owner_email?: string;
}
