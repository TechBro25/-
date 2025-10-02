// Admin JavaScript for Rental Marketplace
class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'bookings';
        this.init();
    }

    init() {
        this.loadUser();
        this.bindEvents();
        this.setupModals();
    }

    bindEvents() {
        // Admin login
        document.getElementById('adminLoginFormElement')?.addEventListener('submit', (e) => this.handleAdminLogin(e));
        
        // Navigation
        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchSection(btn.dataset.section));
        });

        // Filters
        document.getElementById('bookingStatusFilter')?.addEventListener('change', () => this.loadBookings());
        document.getElementById('userVerifiedFilter')?.addEventListener('change', () => this.loadUsers());
        document.getElementById('itemAvailableFilter')?.addEventListener('change', () => this.loadItems());
        document.getElementById('reviewApprovedFilter')?.addEventListener('change', () => this.loadReviews());
        document.getElementById('messageChannelFilter')?.addEventListener('change', () => this.loadMessages());
        document.getElementById('kycStatusFilter')?.addEventListener('change', () => this.loadKYC());

        // Admin actions
        document.getElementById('approveBookingBtn')?.addEventListener('click', () => this.updateBookingStatus('approved'));
        document.getElementById('rejectBookingBtn')?.addEventListener('click', () => this.updateBookingStatus('rejected'));
        document.getElementById('completeBookingBtn')?.addEventListener('click', () => this.updateBookingStatus('completed'));
        
        document.getElementById('approveReviewBtn')?.addEventListener('click', () => this.updateReviewStatus(true));
        document.getElementById('rejectReviewBtn')?.addEventListener('click', () => this.updateReviewStatus(false));
        
        document.getElementById('approveKYCBtn')?.addEventListener('click', () => this.updateKYCStatus('verified'));
        document.getElementById('rejectKYCBtn')?.addEventListener('click', () => this.updateKYCStatus('rejected'));
        document.getElementById('sendKYCCodeBtn')?.addEventListener('click', () => this.sendKYCVerificationCode());

        // Logout
        document.getElementById('adminLogoutLink')?.addEventListener('click', (e) => this.handleLogout(e));
    }

    setupModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('close')) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    async loadUser() {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            this.showLoginForm();
            return;
        }

        try {
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                
                if (this.currentUser.is_admin) {
                    this.showDashboard();
                    this.loadDashboardStats();
                    this.loadBookings();
                } else {
                    localStorage.removeItem('adminToken');
                    this.showLoginForm();
                    this.showNotification('Admin access required', 'error');
                }
            } else {
                localStorage.removeItem('adminToken');
                this.showLoginForm();
            }
        } catch (error) {
            console.error('Error loading admin user:', error);
            localStorage.removeItem('adminToken');
            this.showLoginForm();
        }
    }

    async handleAdminLogin(e) {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.user.is_admin) {
                localStorage.setItem('adminToken', data.token);
                this.currentUser = data.user;
                this.showDashboard();
                this.loadDashboardStats();
                this.loadBookings();
                this.showNotification('Admin login successful!', 'success');
            } else {
                this.showNotification('Invalid admin credentials', 'error');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            this.showNotification('Network error during login', 'error');
        }
    }

    showLoginForm() {
        document.getElementById('adminLoginForm').style.display = 'block';
        document.getElementById('adminDashboard').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('adminLoginForm').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        
        const adminUserName = document.getElementById('adminUserName');
        if (adminUserName) {
            adminUserName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        }
    }

    async loadDashboardStats() {
        try {
            const response = await fetch('/api/admin/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateDashboardStats(data.stats);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('totalUsers').textContent = stats.totalUsers;
        document.getElementById('totalItems').textContent = stats.totalItems;
        document.getElementById('totalBookings').textContent = stats.totalBookings;
        document.getElementById('pendingBookings').textContent = stats.pendingBookings;
        document.getElementById('totalReviews').textContent = stats.totalReviews;
        document.getElementById('pendingReviews').textContent = stats.pendingReviews;
        document.getElementById('unreadMessages').textContent = stats.unreadMessages;
        document.getElementById('pendingKYC').textContent = stats.pendingKYC;
    }

    switchSection(section) {
        // Update navigation
        document.querySelectorAll('.admin-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.admin-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(`${section}Section`).classList.add('active');

        this.currentSection = section;

        // Load section data
        switch (section) {
            case 'bookings':
                this.loadBookings();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'items':
                this.loadItems();
                break;
            case 'reviews':
                this.loadReviews();
                break;
            case 'messages':
                this.loadMessages();
                break;
            case 'kyc':
                this.loadKYC();
                break;
        }
    }

    async loadBookings() {
        try {
            const status = document.getElementById('bookingStatusFilter')?.value || '';
            const params = new URLSearchParams();
            if (status) params.append('status', status);

            const response = await fetch(`/api/admin/bookings?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayBookings(data.bookings);
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
        }
    }

    displayBookings(bookings) {
        const table = document.getElementById('bookingsTable');
        if (!table) return;

        table.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Item</th>
                        <th>Renter</th>
                        <th>Owner</th>
                        <th>Dates</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${bookings.map(booking => `
                        <tr>
                            <td>#${booking.id}</td>
                            <td>${booking.item_title}</td>
                            <td>${booking.renter_name} ${booking.renter_last_name}</td>
                            <td>${booking.owner_name} ${booking.owner_last_name}</td>
                            <td>${new Date(booking.start_date).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}</td>
                            <td>₦${booking.total_amount.toLocaleString()}</td>
                            <td><span class="status-badge status-${booking.status}">${booking.status}</span></td>
                            <td>
                                <button class="btn btn-outline" onclick="adminPanel.showBookingDetails(${booking.id})">
                                    <i class="fas fa-eye"></i> View
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async loadUsers() {
        try {
            const verified = document.getElementById('userVerifiedFilter')?.value || '';
            const params = new URLSearchParams();
            if (verified) params.append('verified', verified);

            const response = await fetch(`/api/admin/users?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayUsers(data.users);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    displayUsers(users) {
        const table = document.getElementById('usersTable');
        if (!table) return;

        table.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Verified</th>
                        <th>Admin</th>
                        <th>Joined</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>#${user.id}</td>
                            <td>${user.first_name} ${user.last_name}</td>
                            <td>${user.email}</td>
                            <td>${user.phone || 'N/A'}</td>
                            <td><span class="status-badge ${user.is_verified ? 'status-approved' : 'status-pending'}">${user.is_verified ? 'Yes' : 'No'}</span></td>
                            <td><span class="status-badge ${user.is_admin ? 'status-approved' : 'status-pending'}">${user.is_admin ? 'Yes' : 'No'}</span></td>
                            <td>${new Date(user.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async loadItems() {
        try {
            const available = document.getElementById('itemAvailableFilter')?.value || '';
            const params = new URLSearchParams();
            if (available) params.append('available', available);

            const response = await fetch(`/api/admin/items?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayItems(data.items);
            }
        } catch (error) {
            console.error('Error loading items:', error);
        }
    }

    displayItems(items) {
        const table = document.getElementById('itemsTable');
        if (!table) return;

        table.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Owner</th>
                        <th>Category</th>
                        <th>Price/Day</th>
                        <th>Location</th>
                        <th>Available</th>
                        <th>Bookings</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>#${item.id}</td>
                            <td>${item.title}</td>
                            <td>${item.owner_name} ${item.owner_last_name}</td>
                            <td>${item.category}</td>
                            <td>₦${item.price_per_day.toLocaleString()}</td>
                            <td>${item.location}</td>
                            <td><span class="status-badge ${item.is_available ? 'status-approved' : 'status-pending'}">${item.is_available ? 'Yes' : 'No'}</span></td>
                            <td>${item.booking_count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async loadReviews() {
        try {
            const approved = document.getElementById('reviewApprovedFilter')?.value || '';
            const params = new URLSearchParams();
            if (approved) params.append('approved', approved);

            const response = await fetch(`/api/admin/reviews?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayReviews(data.reviews);
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
        }
    }

    displayReviews(reviews) {
        const table = document.getElementById('reviewsTable');
        if (!table) return;

        table.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Item</th>
                        <th>Reviewer</th>
                        <th>Rating</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${reviews.map(review => `
                        <tr>
                            <td>#${review.id}</td>
                            <td>${review.item_title}</td>
                            <td>${review.reviewer_name} ${review.reviewer_last_name}</td>
                            <td>${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</td>
                            <td>${review.title}</td>
                            <td><span class="status-badge ${review.is_approved ? 'status-approved' : 'status-pending'}">${review.is_approved ? 'Approved' : 'Pending'}</span></td>
                            <td>
                                <button class="btn btn-outline" onclick="adminPanel.showReviewDetails(${review.id})">
                                    <i class="fas fa-eye"></i> View
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async loadMessages() {
        try {
            const channel = document.getElementById('messageChannelFilter')?.value || '';
            const params = new URLSearchParams();
            if (channel) params.append('channel', channel);

            const response = await fetch(`/api/admin/messages?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayMessages(data.messages);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    displayMessages(messages) {
        const table = document.getElementById('messagesTable');
        if (!table) return;

        table.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Channel</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Subject</th>
                        <th>Message</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${messages.map(message => `
                        <tr>
                            <td>#${message.id}</td>
                            <td><span class="status-badge ${message.channel === 'whatsapp' ? 'status-approved' : 'status-pending'}">${message.channel}</span></td>
                            <td>${message.sender_name ? `${message.sender_name} ${message.sender_last_name}` : 'System'}</td>
                            <td>${message.receiver_name ? `${message.receiver_name} ${message.receiver_last_name}` : 'Admin'}</td>
                            <td>${message.subject}</td>
                            <td>${message.body.substring(0, 50)}${message.body.length > 50 ? '...' : ''}</td>
                            <td>${new Date(message.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async loadKYC() {
        try {
            const status = document.getElementById('kycStatusFilter')?.value || 'pending';
            const params = new URLSearchParams();
            params.append('status', status);

            const response = await fetch(`/api/admin/kyc?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayKYC(data.kycDocuments);
            }
        } catch (error) {
            console.error('Error loading KYC:', error);
        }
    }

    displayKYC(kycDocs) {
        const table = document.getElementById('kycTable');
        if (!table) return;

        table.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${kycDocs.map(kyc => `
                        <tr>
                            <td>#${kyc.id}</td>
                            <td>${kyc.first_name} ${kyc.last_name}</td>
                            <td>${kyc.email}</td>
                            <td>${kyc.phone || 'N/A'}</td>
                            <td><span class="status-badge status-${kyc.status}">${kyc.status}</span></td>
                            <td>${new Date(kyc.created_at).toLocaleDateString()}</td>
                            <td>
                                <button class="btn btn-outline" onclick="adminPanel.showKYCDetails(${kyc.id})">
                                    <i class="fas fa-eye"></i> View
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async showBookingDetails(bookingId) {
        // This would load detailed booking information
        this.showNotification(`Viewing booking #${bookingId}`, 'info');
    }

    async showReviewDetails(reviewId) {
        // This would load detailed review information
        this.showNotification(`Viewing review #${reviewId}`, 'info');
    }

    async showKYCDetails(kycId) {
        // This would load detailed KYC information
        this.showNotification(`Viewing KYC #${kycId}`, 'info');
    }

    async updateBookingStatus(status) {
        // This would update booking status
        this.showNotification(`Booking status updated to ${status}`, 'success');
        this.hideModal('bookingDetailsModal');
        this.loadBookings();
    }

    async updateReviewStatus(isApproved) {
        // This would update review status
        this.showNotification(`Review ${isApproved ? 'approved' : 'rejected'}`, 'success');
        this.hideModal('reviewDetailsModal');
        this.loadReviews();
    }

    async updateKYCStatus(status) {
        // This would update KYC status
        this.showNotification(`KYC ${status}`, 'success');
        this.hideModal('kycDetailsModal');
        this.loadKYC();
    }

    async sendKYCVerificationCode() {
        // This would send KYC verification code
        this.showNotification('Verification code sent via WhatsApp', 'success');
    }

    async handleLogout(e) {
        e.preventDefault();
        localStorage.removeItem('adminToken');
        this.currentUser = null;
        this.showLoginForm();
        this.showNotification('Logged out successfully', 'success');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add styles if not already added
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 3000;
                    padding: 1rem 1.5rem;
                    border-radius: 5px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    max-width: 400px;
                    animation: slideIn 0.3s ease-out;
                }
                .notification-success { background: #d4edda; color: #155724; border-left: 4px solid #28a745; }
                .notification-error { background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545; }
                .notification-info { background: #d1ecf1; color: #0c5460; border-left: 4px solid #17a2b8; }
                .notification-content { display: flex; justify-content: space-between; align-items: center; }
                .notification-close { background: none; border: none; font-size: 1.2rem; cursor: pointer; }
                @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // Close button functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});