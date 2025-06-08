import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookService, Book } from '../../services/book.service';
import { BorrowService } from '../../services/borrow.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  books: Book[] = [];
  isLoading = true;
  error: string | null = null;
  currentUserId: string | null = null;
  requestStates: { [bookId: string]: { loading: boolean, error?: string, success?: string } } = {};

  constructor(
    private bookService: BookService,
    private borrowService: BorrowService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUserSnapshot();
    this.currentUserId = currentUser ? currentUser.id : null;
    this.loadBooks();
  }

  async loadBooks(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    try {
      const { data, error } = await this.bookService.getBooks();
      if (error) {
        throw new Error(error.message || 'Failed to load books.');
      }
      this.books = data || [];
      this.books.forEach(book => {
        if (book.id) {
          this.requestStates[book.id] = { loading: false };
        }
      });
    } catch (err: any) {
      this.error = err.message;
      console.error('Error loading books in component:', err);
    } finally {
      this.isLoading = false;
    }
  }

  async requestBook(book: Book): Promise<void> {
    if (!book.id) return;
    this.requestStates[book.id] = { loading: true };

    try {
      const { data, error } = await this.borrowService.createBorrowRequest(book);
      if (error) {
        this.requestStates[book.id] = { loading: false, error: error.message || 'Failed to request book.' };
      } else {
        this.requestStates[book.id] = { loading: false, success: 'Request sent successfully!' };
      }
    } catch (err: any) {
      this.requestStates[book.id] = { loading: false, error: err.message || 'An unexpected error occurred.' };
    }
  }
}
