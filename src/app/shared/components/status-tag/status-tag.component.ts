import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-tag',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 cursor-default"
      [ngClass]="tagClasses"
      [title]="statusDescription">
      {{ displayText }}
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    div {
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    div:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
  `]
})
export class StatusTagComponent implements OnChanges {
  @Input() status: string = '';
  @Input() showLabel: boolean = false;
  
  tagClasses: any = {};
  statusDescription: string = '';
  displayText: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['status']) {
      this.updateClasses();
    }
  }

  private updateClasses(): void {
    // Reset classes
    this.tagClasses = {};
    
    // Format the display text
    this.displayText = this.status.charAt(0).toUpperCase() + this.status.slice(1).toLowerCase();
    
    switch (this.status?.toLowerCase()) {
      case 'pending':
        this.tagClasses = {
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800': true
        };
        this.statusDescription = 'Request is awaiting response';
        break;
      case 'approved':
        this.tagClasses = {
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800': true
        };
        this.statusDescription = 'Request has been approved';
        break;
      case 'rejected':
        this.tagClasses = {
          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800': true
        };
        this.statusDescription = 'Request has been rejected';
        break;
      case 'cancelled':
        this.tagClasses = {
          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800': true
        };
        this.statusDescription = 'Request has been cancelled';
        break;
      case 'returned':
        this.tagClasses = {
          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800': true
        };
        this.statusDescription = 'Book has been returned';
        break;
      default:
        this.tagClasses = {
          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600': true
        };
        this.statusDescription = 'Status: ' + (this.status || 'Unknown');
    }
  }
}
