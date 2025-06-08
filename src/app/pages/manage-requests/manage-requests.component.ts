import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BorrowService } from '../../services/borrow.service';
import { AuthService } from '../../services/auth.service';
import { BorrowRequest } from '../../models/borrow-request.model';

@Component({
  selector: 'app-manage-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-requests.component.html',
  styleUrls: ['./manage-requests.component.scss']
})
export class ManageRequestsComponent implements OnInit {
  outgoingRequests: BorrowRequest[] = [];
  incomingRequests: BorrowRequest[] = [];
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
    private authService: AuthService
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

  async loadOutgoingRequests(): Promise<void> {
    this.isLoadingOutgoing = true;
    this.errorOutgoing = null;
    try {
      const { data, error } = await this.borrowService.getOutgoingRequests();
      if (error) {
        throw new Error(error.message || 'Failed to load outgoing requests.');
      }
      this.outgoingRequests = data || [];
    } catch (err: any) {
      this.errorOutgoing = err.message;
      console.error('Error loading outgoing requests in component:', err);
      this.showNotification(`An unexpected error occurred: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      this.isLoadingOutgoing = false;
    }
  }

  async loadIncomingRequests(): Promise<void> {
    this.isLoadingIncoming = true;
    this.errorIncoming = null;
    try {
      const { data, error } = await this.borrowService.getIncomingRequests();
      if (error) {
        throw new Error(error.message || 'Failed to load incoming requests.');
      }
      this.incomingRequests = data || [];
    } catch (err: any) {
      this.errorIncoming = err.message;
      console.error('Error loading incoming requests in component:', err);
      this.showNotification(`An unexpected error occurred: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      this.isLoadingIncoming = false;
    }
  }

  showNotification(message: string, type: 'success' | 'error') {
    this.notification = { message, type };
    // Optional: auto-dismiss after a few seconds
    // setTimeout(() => this.dismissNotification(), 5000);
  }

  dismissNotification() {
    this.notification = { message: null, type: null };
  }

  initiateApprovalProcess(requestId: string): void {
    this.requestBeingApprovedId = requestId;
    this.loanDurationDays = 14; // Reset to default when starting a new approval
    this.dismissNotification(); // Clear any previous notifications
  }

  cancelApprovalProcess(): void {
    this.requestBeingApprovedId = null;
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
    // The actual service call will happen in executeFinalApproval()
  }

  async executeFinalApproval(): Promise<void> {
    if (!this.finalApprovalDetails) {
      this.showNotification('Error: Approval details not found.', 'error');
      this.isAwaitingFinalApprovalConfirmation = false;
      return;
    }

    const { requestId, customDueDate } = this.finalApprovalDetails;

    try {
      const { error } = await this.borrowService.updateRequestStatus(requestId, 'approved', customDueDate);
      if (error) {
        console.error('Error approving request:', error);
        this.showNotification(`Failed to approve request: ${error.message || 'Unknown error'}`, 'error');
      } else {
        this.showNotification('Request approved successfully!', 'success');
        this.loadRequests(); // Refresh lists
      }
    } catch (err: any) {
      console.error('Unexpected error approving request:', err);
      this.showNotification(`An unexpected error occurred: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      this.isAwaitingFinalApprovalConfirmation = false;
      this.finalApprovalDetails = null;
      this.requestBeingApprovedId = null;
      this.loanDurationDays = 14;
    }
  }

  cancelFinalApprovalConfirmation(): void {
    this.isAwaitingFinalApprovalConfirmation = false;
    this.finalApprovalDetails = null;
    // Keep requestBeingApprovedId and loanDurationDays as they are, so user can adjust loan duration
  }

  async markAsReturned(requestId: string): Promise<void> {
    if (!confirm('Are you sure you want to mark this item as returned?')) {
      return;
    }
    try {
      const { error } = await this.borrowService.markRequestAsReturned(requestId);
      if (error) {
        console.error('Error marking request as returned:', error);
        this.showNotification(`Failed to mark as returned: ${error.message || 'Unknown error'}`, 'error');
      } else {
        this.showNotification('Request marked as returned successfully!', 'success');
        this.loadRequests(); // Refresh the lists
      }
    } catch (err: any) {
      console.error('Unexpected error marking request as returned:', err);
      this.showNotification(`An unexpected error occurred: ${err.message || 'Please try again.'}`, 'error');
    }
  }

  async rejectRequest(requestId: string): Promise<void> {
    if (!confirm('Are you sure you want to reject this request?')) return;
    try {
      const { error } = await this.borrowService.updateRequestStatus(requestId, 'rejected');
      if (error) {
        throw new Error(error.message || 'Failed to reject request.');
      }
      this.loadIncomingRequests();
    } catch (err: any) {
      console.error('Error rejecting request:', err);
    }
  }

  async cancelRequest(requestId: string): Promise<void> {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    try {
      const { error } = await this.borrowService.updateRequestStatus(requestId, 'cancelled');
      if (error) {
        throw new Error(error.message || 'Failed to cancel request.');
      }
      this.loadOutgoingRequests();
    } catch (err: any) {
      console.error('Error cancelling request:', err);
    }
  }

  // Helper to update local list to avoid full reload, more advanced
  // private updateRequestInList(list: BorrowRequest[], updatedRequest: BorrowRequest): void {
  //   const index = list.findIndex(r => r.id === updatedRequest.id);
  //   if (index !== -1) {
  //     list[index] = updatedRequest;
  //   }
  // }
}
