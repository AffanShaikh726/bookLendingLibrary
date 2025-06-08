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

  // NEW METHOD to fetch all books
  async getBooks(): Promise<{ data: Book[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('books')
      .select('*'); // Selects all columns

    if (error) {
      console.error('Error fetching books:', error);
    }
    // Explicitly cast data to Book[] if Supabase types are generic
    return { data: data as Book[] | null, error };
  }
}
