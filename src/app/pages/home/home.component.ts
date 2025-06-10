import { Component, OnInit, OnDestroy, ViewChild, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookService, Book } from '../../services/book.service';
import { BorrowService } from '../../services/borrow.service';
import { AuthService } from '../../services/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  private routeSubscription: any;
  private modalOpen = false; // Track modal state independently
  books: Book[] = [];
  isLoading = true;
  error: string | null = null;
  currentUserId: string | null = null;
  requestStates: { [bookId: string]: { loading: boolean, error?: string, success?: string } } = {};
  deleteStates: { [bookId: string]: { showConfirmation: boolean, loading: boolean, error?: string } } = {};
  
  // Modal state
  showAddBookModal = false;
  addBookForm!: FormGroup;
  isSubmitting = false;
  addBookError: string | null = null;

  constructor(
    private bookService: BookService,
    private borrowService: BorrowService,
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder
  ) { 
    this.initializeForm();
  }

  private initializeForm(): void {
    this.addBookForm = this.fb.group({
      title: ['', Validators.required],
      author: ['', Validators.required],
      description: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUserSnapshot();
    this.currentUserId = currentUser ? currentUser.id : null;
    this.loadBooks();
    
    // Subscribe to router events to handle navigation
    this.routeSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Close modal when navigating away from home
      if (!(this.router.url === '/app/home' || this.router.url === '/app')) {
        this.cleanupModal(true); // Force cleanup when navigating away
      } else {
        console.log('Home component activated, refreshing books');
        this.loadBooks();
      }
    });
    
    // Clean up any existing modal state
    this.cleanupModal(true);
  }
  
  private cleanupModal(force: boolean = false): void {
    if (!force && this.isSubmitting) {
      // Don't close if form is submitting, unless forced
      return;
    }
    
    if (this.showAddBookModal) {
      this.showAddBookModal = false;
      // Use setTimeout to ensure the DOM updates are processed
      setTimeout(() => {
        document.body.style.overflow = '';
        this.addBookForm.reset();
        this.addBookError = null;
        this.isSubmitting = false;
      }, 0);
    }
  }

  // Handle browser back/forward navigation
  @HostListener('window:popstate', ['$event'])
  onPopState(event: any) {
    this.cleanupModal(true);
  }

  ngOnDestroy(): void {
    // Clean up subscription when component is destroyed
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    this.cleanupModal();
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
          this.deleteStates[book.id] = { showConfirmation: false, loading: false };
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

  // Show delete confirmation dialog
  showDeleteConfirmation(bookId: string): void {
    if (!bookId) return;
    // Initialize if it doesn't exist
    if (!this.deleteStates[bookId]) {
      this.deleteStates[bookId] = { showConfirmation: false, loading: false };
    }
    this.deleteStates[bookId] = { ...this.deleteStates[bookId], showConfirmation: true };
  }

  // Hide delete confirmation dialog
  hideDeleteConfirmation(bookId: string): void {
    if (!bookId) return;
    // Initialize if it doesn't exist
    if (!this.deleteStates[bookId]) {
      this.deleteStates[bookId] = { showConfirmation: false, loading: false };
    }
    this.deleteStates[bookId] = { ...this.deleteStates[bookId], showConfirmation: false };
  }

  // Delete a book
  async deleteBook(book: Book): Promise<void> {
    if (!book.id) return;
    this.deleteStates[book.id] = { ...this.deleteStates[book.id], loading: true, showConfirmation: false };

    try {
      const { data, error } = await this.bookService.deleteBook(book.id);
      if (error) {
        this.deleteStates[book.id] = { loading: false, showConfirmation: false, error: error.message || 'Failed to delete book.' };
      } else {
        // Remove the book from the local array
        this.books = this.books.filter(b => b.id !== book.id);
      }
    } catch (err: any) {
      this.deleteStates[book.id] = { loading: false, showConfirmation: false, error: err.message || 'An unexpected error occurred.' };
    }
  }

  // Modal methods
  openAddBookModal(event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.showAddBookModal) return; // Prevent duplicate opens
    this.showAddBookModal = true;
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
  }

  closeAddBookModal(event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.isSubmitting) return; // Prevent closing while submitting
    this.cleanupModal();
  }

  async onSubmit(): Promise<void> {
    if (this.addBookForm.invalid) {
      this.addBookForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.addBookError = null;
    
    const bookData = { 
      title: this.addBookForm.value.title,
      author: this.addBookForm.value.author,
      description: this.addBookForm.value.description
    };

    try {
      const { data, error } = await this.bookService.addBook(bookData);
      
      if (error) {
        throw error;
      }
      
      // Reset form and close modal
      this.addBookForm.reset();
      this.showAddBookModal = false;
      document.body.style.overflow = ''; // Re-enable scrolling
      
      // Refresh the books list
      await this.loadBooks();
    } catch (error: any) {
      console.error('Error adding book:', error);
      this.addBookError = error.message || 'Failed to add book. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }
}
