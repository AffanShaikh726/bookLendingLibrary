import { Injectable } from '@angular/core';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service'; // Assuming you have a central SupabaseService
import { AuthService } from './auth.service';
import { BorrowRequest, BorrowRequestStatus } from '../models/borrow-request.model';
import { Book } from './book.service'; // Import Book interface

@Injectable({
  providedIn: 'root'
})
export class BorrowService {
  private supabase: SupabaseClient;

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {
    this.supabase = this.supabaseService.getSupabaseClient();
  }

  async createBorrowRequest(book: Book): Promise<{ data: BorrowRequest | null; error: any }> {
    const currentUser = this.authService.getCurrentUserSnapshot();

    if (!currentUser) {
      return { data: null, error: { message: 'User not authenticated. Cannot create borrow request.' } };
    }

    if (!book.id || !book.owner_id) {
      return { data: null, error: { message: 'Book ID or Owner ID is missing. Cannot create borrow request.' } };
    }

    if (currentUser.id === book.owner_id) {
      return { data: null, error: { message: 'You cannot borrow your own book.'}};
    }

    const newBorrowRequest: Omit<BorrowRequest, 'id' | 'request_date' | 'created_at' | 'updated_at' | 'status'> & { status: BorrowRequestStatus } = {
      book_id: book.id,
      borrower_id: currentUser.id,
      owner_id: book.owner_id,
      status: 'pending',
    };

    const { data, error } = await this.supabase
      .from('borrow_requests')
      .insert([newBorrowRequest])
      .select()
      .single(); // Assuming you want the single inserted record back

    if (error) {
      console.error('Error creating borrow request:', error);
    }

    return { data: data as BorrowRequest | null, error };
  }

  // We will add methods for fetching and managing requests later

  async getOutgoingRequests(): Promise<{ data: BorrowRequest[] | null; error: any }> {
    const currentUser = this.authService.getCurrentUserSnapshot();
    if (!currentUser) {
      return { data: null, error: { message: 'User not authenticated.' } };
    }

    const { data, error } = await this.supabase
      .from('borrow_requests')
      .select(`
        *,
        book:books (title, author) 
      `)
      .eq('borrower_id', currentUser.id)
      .order('request_date', { ascending: false });

    if (error) {
      console.error('Error fetching outgoing requests:', error);
    }
    // Supabase might return book as an array if it's a one-to-many, ensure it's an object if one-to-one
    // Or adjust interface BorrowRequest to expect book as an object: book?: { title: string; author: string; }
    return { data: data as BorrowRequest[] | null, error };
  }

  async getIncomingRequests(): Promise<{ data: BorrowRequest[] | null; error: any }> {
    const currentUser = this.authService.getCurrentUserSnapshot();
    if (!currentUser) {
      return { data: null, error: { message: 'User not authenticated.' } };
    }

    // First, get all requests for the current user's books
    const { data: allRequests, error: fetchError } = await this.supabase
      .from('borrow_requests')
      .select(`
        *,
        books!inner(title, author)
      `)
      .eq('owner_id', currentUser.id)
      .order('request_date', { ascending: false });
    
    // Get all borrower profiles in a separate query
    const borrowerIds = [...new Set(allRequests?.map(req => req.borrower_id) || [])];
    const { data: borrowerProfiles, error: profilesError } = await this.supabase
      .from('profiles')
      .select('id, email, username')
      .in('id', borrowerIds);
    
    if (profilesError) {
      console.error('Error fetching borrower profiles:', profilesError);
    }
    
    // Create a map of user_id -> profile
    const profilesMap = new Map();
    borrowerProfiles?.forEach(profile => {
      profilesMap.set(profile.id, profile);
    });

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    if (!allRequests) {
      return { data: [], error: null };
    }

    // Track books that have an active (not returned) approved request for each borrower
    const activeApprovedRequests = new Map<string, Set<string>>(); // bookId -> Set<borrowerId>
  
    // First pass: Identify all active approved requests (not returned)
    allRequests.forEach(request => {
      if (request.status === 'approved') {
        if (!activeApprovedRequests.has(request.book_id)) {
          activeApprovedRequests.set(request.book_id, new Set());
        }
        activeApprovedRequests.get(request.book_id)?.add(request.borrower_id);
      }
    });

    // Second pass: Filter out pending requests for books where the same user has an active approved request
    const filteredRequests = allRequests.filter(request => {
      // Keep all requests that are not pending
      if (request.status !== 'pending') {
        return true;
      }
      
      // For pending requests, check if there's an active approved request for this book and borrower
      const hasActiveApprovedRequest = activeApprovedRequests.get(request.book_id)?.has(request.borrower_id);
      return !hasActiveApprovedRequest;
    });

    // Map to the expected response format
    const mappedData: BorrowRequest[] = filteredRequests.map(request => {
      const borrowerProfile = profilesMap.get(request.borrower_id);
      return {
        id: request.id,
        book_id: request.book_id,
        borrower_id: request.borrower_id,
        owner_id: request.owner_id,
        status: request.status as BorrowRequestStatus,
        request_date: request.request_date,
        approval_date: request.approval_date,
        return_date: request.return_date,
        updated_at: request.updated_at,
        due_date: request.due_date,
        created_at: request.created_at,
        book: {
          title: request.books?.title || 'Unknown Book',
          author: request.books?.author || 'Unknown Author',
        },
        borrower: {
          email: borrowerProfile?.email || 'Unknown Email',
          username: borrowerProfile?.username || 'Unknown User',
        },
      };
    });

    return { data: mappedData, error: null };
  }

  async updateRequestStatus(requestId: string, status: BorrowRequestStatus, customDueDate?: string | null): Promise<{ data: BorrowRequest | null; error: any }> {
    const currentUser = this.authService.getCurrentUserSnapshot();
    if (!currentUser) {
      return { data: null, error: { message: 'User not authenticated.' } };
    }

    // Additional logic to ensure only the book owner can approve/reject,
    // and only the borrower can cancel a 'pending' request might be needed here or via RLS.
    // For now, we assume RLS policies on 'borrow_requests' table correctly restrict updates.

    const updates: Partial<BorrowRequest> = { 
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'approved') {
      const approvalDate = new Date();
      updates.approval_date = approvalDate.toISOString();
      if (customDueDate) {
        updates.due_date = customDueDate;
      } else {
        const dueDate = new Date(approvalDate);
        dueDate.setDate(approvalDate.getDate() + 14); // Default due date 14 days from approval
        updates.due_date = dueDate.toISOString();
      }
    }
    // Add other status-specific updates if necessary (e.g., return_date for 'returned')

    const { data, error } = await this.supabase
      .from('borrow_requests')
      .update(updates)
      .eq('id', requestId)
      .select()
      .single(); // .single() is used because we expect to update and return one record

    if (error) {
      console.error(`Error updating request ${requestId} to ${status}:`, error);
      return { data: null, error };
    }
    
    // Note: Removed book update logic since the borrower information is managed in the borrow_requests table
    // and there is no borrower_id column in the books table
    
    return { data: data as BorrowRequest | null, error };
  }

  async markRequestAsReturned(requestId: string): Promise<{ data: BorrowRequest | null; error: any }> {
    const currentUser = this.authService.getCurrentUserSnapshot();
    if (!currentUser) {
      return { data: null, error: { message: 'User not authenticated.' } };
    }

    // RLS should ensure only appropriate users (owner or borrower of an approved request) can mark as returned.
    const updates: Partial<BorrowRequest> = {
      status: 'returned',
      return_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('borrow_requests')
      .update(updates)
      .eq('id', requestId)
      // Optionally, add further conditions, e.g., .eq('status', 'approved')
      // if RLS doesn't fully cover this transition.
      .select()
      .single();

    if (error) {
      console.error(`Error marking request ${requestId} as returned:`, error);
      return { data: null, error };
    }
    
    // Note: Removed book update logic since the borrower information is managed in the borrow_requests table
    // and there is no borrower_id column in the books table
    
    return { data: data as BorrowRequest | null, error };
  }
}
