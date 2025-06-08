import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BookService } from '../../services/book.service';

@Component({
  selector: 'app-add-book',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-book.component.html',
  styleUrls: ['./add-book.component.scss']
})
export class AddBookComponent implements OnInit {
  addBookForm!: FormGroup; // Definite assignment assertion
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private bookService: BookService
  ) {}

  ngOnInit(): void {
    this.addBookForm = this.fb.group({
      title: ['', Validators.required],
      author: ['', Validators.required],
      description: ['', Validators.required]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.addBookForm.invalid) {
      this.errorMessage = 'Please fill out all fields correctly.';
      // Mark all fields as touched to show validation errors
      this.addBookForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const bookData = { 
      title: this.addBookForm.value.title,
      author: this.addBookForm.value.author,
      description: this.addBookForm.value.description
    };

    try {
      const { data, error } = await this.bookService.addBook(bookData);

      if (error) {
        this.errorMessage = error.message || 'Failed to add book. Please try again.';
      } else {
        // console.log('Book added successfully:', data);
        alert('Book added successfully!'); 
        this.addBookForm.reset();
        // Optionally navigate to a book list page or home
        this.router.navigate(['/app/home']); 
      }
    } catch (error: any) {
      // Catch any unexpected errors from the service call itself
      this.errorMessage = error.message || 'An unexpected error occurred while adding the book.';
    }
    this.isLoading = false;
  }
}
