import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BorrowService } from '../../services/borrow.service';
import { AuthService } from '../../services/auth.service';
import { BorrowRequest } from '../../models/borrow-request.model';
import { StatusTagComponent } from '../../shared/components/status-tag/status-tag.component';

@Component({
  selector: 'app-manage-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusTagComponent],
  templateUrl: './manage-requests.component.html',
  styleUrls: ['./manage-requests.component.scss']
})
export class ManageRequestsComponent implements OnInit {
  // All requests
  allOutgoingRequests: BorrowRequest[] = [];
  allIncomingRequests: BorrowRequest[] = [];
  
  // Displayed requests (paginated)
  outgoingRequests: BorrowRequest[] = [];
  incomingRequests: BorrowRequest[] = [];
  
  // Pagination settings
  readonly ITEMS_PER_PAGE = 6; // Show 6 items initially
  private outgoingRequestsPage = 1;
  private incomingRequestsPage = 1;
  showAllOutgoing = false;
  showAllIncoming = false;
  hasMoreOutgoing = false;
  hasMoreIncoming = false;
  
  isLoadingOutgoing = true;
  isLoadingIncoming = true;
  errorOutgoing: string | null = null;
  errorIncoming: string | null = null;
  currentUserId: string | null = null;

  notification: { message: string | null; type: 'success' | 'error' | null } = {
    message: null,
    type: null,
  };
  requestBeingApprovedId: string | null = null;
  loanDurationDays: number = 14; // Default loan duration
  isAwaitingFinalApprovalConfirmation: boolean = false;
  finalApprovalDetails: { requestId: string, customDueDate: string, loanDurationDays: number, bookTitle?: string, borrowerName?: string } | null = null;

  constructor(
    private borrowService: BorrowService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUserSnapshot();
    this.currentUserId = currentUser ? currentUser.id : null;
    this.loadRequests();
  }

  async loadRequests(): Promise<void> {
    this.loadOutgoingRequests();
    this.loadIncomingRequests();
  }

  async loadOutgoingRequests(loadMore: boolean = false): Promise<void> {
    if (!loadMore) {
      this.outgoingRequestsPage = 1;
      this.isLoadingOutgoing = true;
    }
    this.errorOutgoing = null;
    
    try {
      const { data, error } = await this.borrowService.getOutgoingRequests();
      if (error) {
        throw new Error(error.message || 'Failed to load outgoing requests.');
      }
      
      this.allOutgoingRequests = data || [];
      this.updateOutgoingPagination();
    } catch (err: any) {
      this.errorOutgoing = err.message;
      console.error('Error loading outgoing requests in component:', err);
      this.showNotification(`An unexpected error occurred: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      this.isLoadingOutgoing = false;
    }
  }
  
  private updateOutgoingPagination(): void {
    if (this.showAllOutgoing) {
      this.outgoingRequests = [...this.allOutgoingRequests];
      this.hasMoreOutgoing = false;
    } else {
      const endIndex = this.outgoingRequestsPage * this.ITEMS_PER_PAGE;
      this.outgoingRequests = this.allOutgoingRequests.slice(0, endIndex);
      this.hasMoreOutgoing = endIndex < this.allOutgoingRequests.length;
    }
    this.cdr.detectChanges();
  }
  
  toggleOutgoingView(): void {
    this.showAllOutgoing = !this.showAllOutgoing;
    if (this.showAllOutgoing) {
      this.outgoingRequestsPage = 1;
    }
    this.updateOutgoingPagination();
  }

  async loadIncomingRequests(loadMore: boolean = false): Promise<void> {
    if (!loadMore) {
      this.incomingRequestsPage = 1;
      this.isLoadingIncoming = true;
    }
    this.errorIncoming = null;
    
    try {
      const { data, error } = await this.borrowService.getIncomingRequests();
      if (error) {
        throw new Error(error.message || 'Failed to load incoming requests.');
      }
      
      this.allIncomingRequests = data || [];
      this.updateIncomingPagination();
    } catch (err: any) {
      this.errorIncoming = err.message;
      console.error('Error loading incoming requests in component:', err);
      this.showNotification(`An unexpected error occurred: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      this.isLoadingIncoming = false;
    }
  }
  
  private updateIncomingPagination(): void {
    if (this.showAllIncoming) {
      this.incomingRequests = [...this.allIncomingRequests];
      this.hasMoreIncoming = false;
    } else {
      const endIndex = this.incomingRequestsPage * this.ITEMS_PER_PAGE;
      this.incomingRequests = this.allIncomingRequests.slice(0, endIndex);
      this.hasMoreIncoming = endIndex < this.allIncomingRequests.length;
    }
    this.cdr.detectChanges();
  }
  
  toggleIncomingView(): void {
    this.showAllIncoming = !this.showAllIncoming;
    if (this.showAllIncoming) {
      this.incomingRequestsPage = 1;
    }
    this.updateIncomingPagination();
  }

  showNotification(message: string, type: 'success' | 'error') {
    this.notification = { message, type };
    this.cdr.detectChanges();
    setTimeout(() => {
      this.dismissNotification();
    }, 5000);
  }

  dismissNotification() {
    this.notification = { message: null, type: null };
    this.cdr.detectChanges();
  }

  initiateApprovalProcess(requestId: string): void {
    this.requestBeingApprovedId = requestId;
    this.loanDurationDays = 14; // Reset to default when starting a new approval
    this.dismissNotification(); // Clear any previous notifications
  }

  cancelApprovalProcess(): void {
    if (this.requestBeingApprovedId) {
      const requestIndex = this.incomingRequests.findIndex(req => req.id === this.requestBeingApprovedId);
      if (requestIndex !== -1) {
        this.incomingRequests[requestIndex].isProcessing = false;
      }
      this.requestBeingApprovedId = null;
    }
  }

  async approveRequest(): Promise<void> {
    if (!this.requestBeingApprovedId) {
      console.error('approveRequest called without requestBeingApprovedId set.');
      this.showNotification('An internal error occurred. Please try again.', 'error');
      return;
    }

    const durationDays = this.loanDurationDays;
    if (isNaN(durationDays) || durationDays <= 0) {
      this.showNotification('Invalid duration. Please enter a positive number of days.', 'error');
      return; // Don't clear requestBeingApprovedId, let user correct input
    }

    // Set loading state
    const requestIndex = this.incomingRequests.findIndex(req => req.id === this.requestBeingApprovedId);
    if (requestIndex !== -1) {
      this.incomingRequests[requestIndex].isProcessing = true;
    }

    try {
      const approvalDate = new Date();
      const dueDate = new Date(approvalDate);
      dueDate.setDate(approvalDate.getDate() + durationDays);
      const customDueDate = dueDate.toISOString();

      const requestToConfirm = this.incomingRequests.find(req => req.id === this.requestBeingApprovedId);

      this.finalApprovalDetails = {
        requestId: this.requestBeingApprovedId,
        customDueDate: customDueDate,
        loanDurationDays: durationDays,
        bookTitle: requestToConfirm?.book?.title,
        borrowerName: requestToConfirm?.borrower?.username || requestToConfirm?.borrower?.email || requestToConfirm?.borrower_email
      };
      this.isAwaitingFinalApprovalConfirmation = true;
    } catch (err: any) {
      console.error('Error preparing approval:', err);
      this.showNotification(`Error: ${err.message || 'Failed to prepare approval'}`, 'error');
      
      // Reset processing state on error
      if (requestIndex !== -1) {
        this.incomingRequests[requestIndex].isProcessing = false;
      }
    }
  }

  async executeFinalApproval(): Promise<void> {
    if (!this.finalApprovalDetails) {
      this.showNotification('Error: Approval details not found.', 'error');
      this.isAwaitingFinalApprovalConfirmation = false;
      return;
    }

    const { requestId, customDueDate } = this.finalApprovalDetails;
    let requestIndex = -1;
    
    try {
      // Find the request in the incoming requests array
      requestIndex = this.incomingRequests.findIndex(req => req.id === requestId);
      if (requestIndex !== -1) {
        this.incomingRequests[requestIndex].isProcessing = true;
      }

      const { data, error } = await this.borrowService.updateRequestStatus(requestId, 'approved', customDueDate);
      
      if (error) {
        throw new Error(error.message || 'Failed to approve request');
      }
      
      // Update the request in the local array
      if (requestIndex !== -1 && data) {
        this.incomingRequests[requestIndex] = {
          ...this.incomingRequests[requestIndex],
          ...data,
          isProcessing: false
        };
      }
      
      this.showNotification('Request approved successfully!', 'success');
      
      // Refresh the list to ensure everything is in sync
      await this.loadIncomingRequests();
      
      // Scroll to top of the page with smooth animation
      this.scrollToTop();
      
    } catch (err: any) {
      console.error('Error approving request:', err);
      this.showNotification(`Error: ${err.message || 'Failed to approve request'}`, 'error');
      
      // Reset processing state on error
      if (requestIndex !== -1) {
        this.incomingRequests[requestIndex].isProcessing = false;
      }
      
    } finally {
      this.isAwaitingFinalApprovalConfirmation = false;
      this.finalApprovalDetails = null;
      this.requestBeingApprovedId = null;
      this.loanDurationDays = 14;
    }
  }

  cancelFinalApprovalConfirmation(): void {
    if (this.finalApprovalDetails?.requestId) {
      const requestIndex = this.incomingRequests.findIndex(req => req.id === this.finalApprovalDetails?.requestId);
      if (requestIndex !== -1) {
        this.incomingRequests[requestIndex].isProcessing = false;
      }
    }
    this.isAwaitingFinalApprovalConfirmation = false;
    this.finalApprovalDetails = null;
    // Keep requestBeingApprovedId and loanDurationDays as they are, so user can adjust loan duration
  }

  async markAsReturned(requestId: string | undefined): Promise<void> {
    if (!requestId) {
      this.showNotification('Invalid request ID', 'error');
      return;
    }
    if (!confirm('Are you sure you want to mark this item as returned?')) {
      return;
    }
    
    // Find the request in both arrays
    let requestIndex = this.outgoingRequests.findIndex(req => req.id === requestId);
    let requestArray = this.outgoingRequests;
    
    if (requestIndex === -1) {
      requestIndex = this.incomingRequests.findIndex(req => req.id === requestId);
      requestArray = this.incomingRequests;
    }
    
    if (requestIndex === -1) {
      this.showNotification('Request not found', 'error');
      return;
    }
    
    // Set loading state
    requestArray[requestIndex].isProcessing = true;

    try {
      const { data, error } = await this.borrowService.markRequestAsReturned(requestId);
      
      if (error) {
        throw new Error(error.message || 'Failed to mark as returned');
      }
      
      this.showNotification('Request marked as returned successfully!', 'success');
      
      // Refresh the lists to ensure everything is in sync
      await Promise.all([
        this.loadIncomingRequests(),
        this.loadOutgoingRequests()
      ]);
      
    } catch (err: any) {
      console.error('Error marking request as returned:', err);
      this.showNotification(`Error: ${err.message || 'Failed to mark as returned'}`, 'error');
    } finally {
      // Reset processing state
      if (requestIndex !== -1 && requestArray[requestIndex]) {
        requestArray[requestIndex].isProcessing = false;
      }
    }
  }

  async rejectRequest(requestId: string | undefined): Promise<void> {
    if (!requestId) {
      this.showNotification('Invalid request ID', 'error');
      return;
    }
    if (!confirm('Are you sure you want to reject this request?')) return;
    
    const requestIndex = this.incomingRequests.findIndex(req => req.id === requestId);
    if (requestIndex === -1) {
      this.showNotification('Request not found', 'error');
      return;
    }
    
    // Set loading state
    this.incomingRequests[requestIndex].isProcessing = true;

    try {
      const { error } = await this.borrowService.updateRequestStatus(requestId, 'rejected');
      
      if (error) {
        throw new Error(error.message || 'Failed to reject request.');
      }
      
      this.showNotification('Request rejected successfully!', 'success');
      
      // Refresh the list to ensure everything is in sync
      await this.loadIncomingRequests();
      
      // Reset approval process state if this was the request being approved
      if (this.requestBeingApprovedId === requestId) {
        this.requestBeingApprovedId = null;
      }
      
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      this.showNotification(`Error: ${err.message || 'Failed to reject request'}`, 'error');
    } finally {
      // Reset processing state
      if (requestIndex !== -1 && this.incomingRequests[requestIndex]) {
        this.incomingRequests[requestIndex].isProcessing = false;
      }
    }
  }

  async cancelRequest(requestId: string | undefined): Promise<void> {
    if (!requestId) {
      this.showNotification('Invalid request ID', 'error');
      return;
    }
    if (!confirm('Are you sure you want to cancel this request?')) return;
    
    const requestIndex = this.outgoingRequests.findIndex(req => req.id === requestId);
    if (requestIndex === -1) {
      this.showNotification('Request not found', 'error');
      return;
    }
    
    // Set loading state
    this.outgoingRequests[requestIndex].isProcessing = true;
    
    try {
      const { error } = await this.borrowService.updateRequestStatus(requestId, 'cancelled');
      
      if (error) {
        throw new Error(error.message || 'Failed to cancel request');
      }
      
      this.showNotification('Request cancelled successfully!', 'success');
      
      // Refresh the list to ensure everything is in sync
      await this.loadOutgoingRequests();
      
    } catch (err: any) {
      console.error('Error cancelling request:', err);
      this.showNotification(`Error: ${err.message || 'Failed to cancel request'}`, 'error');
    } finally {
      // Reset processing state
      if (requestIndex !== -1 && this.outgoingRequests[requestIndex]) {
        this.outgoingRequests[requestIndex].isProcessing = false;
      }
    }
  }

  private scrollToTop(): void {
    const duration = 1000; // 1 second duration
    const start = window.pageYOffset;
    const startTime = performance.now();
    
    // Easing function for smooth deceleration
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 
        ? 4 * t * t * t 
        : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    };
    
    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      window.scrollTo(0, start - (start * easeInOutCubic(progress)));
      
      if (elapsed < duration) {
        window.requestAnimationFrame(animateScroll);
      }
    };
    
    window.requestAnimationFrame(animateScroll);
  }

  // Helper to update local list to avoid full reload, more advanced
  // private updateRequestInList(list: BorrowRequest[], updatedRequest: BorrowRequest): void {
  //   const index = list.findIndex(r => r.id === updatedRequest.id);
  //   if (index !== -1) {
  //     list[index] = updatedRequest;
  //   }
  // }
}
