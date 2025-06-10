import { Injectable } from '@angular/core';
import { SupabaseClient, createClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service'; // To get the current user's ID

export interface Book {
  id?: string; // Optional because it's auto-generated
  title: string;
  author: string;
  description: string;
  owner_id?: string; // Optional here, will be set by the service
  owner_email?: string; // Owner's email
  created_at?: string; // Optional
}

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private supabase: SupabaseClient;

  constructor(private authService: AuthService) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  async addBook(book: Omit<Book, 'id' | 'owner_id' | 'created_at'>): Promise<{ data: any; error: any }> {
    const user = this.authService.getCurrentUserSnapshot(); // Get Supabase User object synchronously
    
    if (!user) {
      return { data: null, error: { message: 'User not authenticated. Cannot add book.', details: 'No user session found.'} };
    }

    const bookWithOwner = {
      ...book,
      owner_id: user.id // Use user.id from Supabase User object
    };

    // Assuming your table is named 'books'
    const { data, error } = await this.supabase
      .from('books')
      .insert([bookWithOwner])
      .select(); // .select() returns the inserted record(s)

    if (error) {
      console.error('Error adding book to Supabase:', error);
    }
    return { data, error };
  }

  // We will add methods for fetching books, etc., later

  // Fetch all books with owner email
  async getBooks(): Promise<{ data: Book[] | null; error: any }> {
    // First, get all books
    const { data: books, error: booksError } = await this.supabase
      .from('books')
      .select('*');

    if (booksError) {
      console.error('Error fetching books:', booksError);
      return { data: null, error: booksError };
    }

    if (!books || books.length === 0) {
      return { data: [], error: null };
    }

    // Get all unique owner IDs
    const ownerIds = [...new Set(books.map(book => book.owner_id).filter(Boolean))];
    
    if (ownerIds.length === 0) {
      return { data: books as Book[], error: null };
    }

    // Fetch all profiles in a single query
    const { data: profiles, error: profilesError } = await this.supabase
      .from('profiles')
      .select('id, email')
      .in('id', ownerIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      // Return books even if we can't get profiles
      return { data: books as Book[], error: null };
    }

    // Create a map of user ID to email
    const emailMap = new Map(profiles.map(profile => [profile.id, profile.email]));

    // Add owner_email to each book
    const booksWithOwnerEmail = books.map(book => ({
      ...book,
      owner_email: book.owner_id ? emailMap.get(book.owner_id) || '' : ''
    }));

    return { data: booksWithOwnerEmail as Book[], error: null };
  }

  // Delete a book by ID
  async deleteBook(bookId: string): Promise<{ data: any; error: any }> {
    const user = this.authService.getCurrentUserSnapshot();
    
    if (!user) {
      return { data: null, error: { message: 'User not authenticated. Cannot delete book.', details: 'No user session found.'} };
    }

    // First check if the book belongs to the current user
    const { data: bookData, error: fetchError } = await this.supabase
      .from('books')
      .select('owner_id')
      .eq('id', bookId)
      .single();

    if (fetchError) {
      console.error('Error fetching book for deletion:', fetchError);
      return { data: null, error: fetchError };
    }

    // Verify ownership
    if (bookData && bookData.owner_id !== user.id) {
      return { data: null, error: { message: 'You can only delete your own books.', details: 'Unauthorized deletion attempt'} };
    }

    try {
      // First delete all associated borrow requests to avoid foreign key constraint violations
      const { error: borrowDeleteError } = await this.supabase
        .from('borrow_requests')
        .delete()
        .eq('book_id', bookId);

      if (borrowDeleteError) {
        console.error('Error deleting associated borrow requests:', borrowDeleteError);
        return { data: null, error: { message: 'Failed to delete associated borrow requests.', details: borrowDeleteError } };
      }

      // Now delete the book
      const { data, error } = await this.supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (error) {
        console.error('Error deleting book:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (err) {
      console.error('Unexpected error during book deletion:', err);
      return { data: null, error: { message: 'An unexpected error occurred while deleting the book.', details: err } };
    }
  }
}
