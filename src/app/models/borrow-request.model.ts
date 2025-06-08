export type BorrowRequestStatus = 'pending' | 'approved' | 'rejected' | 'returned' | 'cancelled';

export interface BorrowRequest {
  id: string; // uuid
  book_id: string; // uuid, Foreign Key referencing books.id
  borrower_id: string; // uuid, Foreign Key referencing auth.users.id
  owner_id: string; // uuid, Foreign Key referencing auth.users.id
  status: BorrowRequestStatus;
  request_date: string; // timestamptz
  approval_date?: string | null; // timestamptz, Nullable
  due_date?: string | null; // timestamptz, Nullable
  owner_notes?: string | null;

  // Joined data - these are populated by specific queries in BorrowService
  book?: { title: string; author: string; };
  borrower?: { email: string; username?: string; }; // Populated from profiles table
  return_date?: string | null; // timestamptz, Nullable
  created_at?: string; // timestamptz, Default: now()
  updated_at?: string; // timestamptz, Default: now()

  // Optional: for enriched data after joining
  book_title?: string;
  borrower_email?: string;
  owner_email?: string;
}
