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

    // Fetch requests from the view where the current user is the owner of the book
    const { data: viewData, error } = await this.supabase
      .from('detailed_incoming_requests') // Query the view
      .select('*') // Select all columns from the view
      .eq('owner_id', currentUser.id)
      .order('request_date', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    // Map the flat data from the view to the nested BorrowRequest structure
    const mappedData: BorrowRequest[] | null = viewData ? viewData.map((item: any) => ({
      id: item.id,
      book_id: item.book_id,
      borrower_id: item.borrower_id,
      owner_id: item.owner_id,
      status: item.status,
      request_date: item.request_date,
      approval_date: item.approval_date,
      return_date: item.return_date,
      updated_at: item.request_updated_at, // Use alias from view
      due_date: item.due_date,
      created_at: item.request_created_at, // Use alias from view
      book: {
        title: item.book_title,
        author: item.book_author,
      },
      borrower: {
        email: item.borrower_email,
        username: item.borrower_username,
      },
    })) : null;

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
    }
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
    }
    return { data: data as BorrowRequest | null, error };
  }
}

