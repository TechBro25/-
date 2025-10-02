// Main JavaScript for Rental Marketplace
class RentalMarketplace {
    constructor() {
        this.currentUser = null;
        this.currentItem = null;
        this.init();
    }

    init() {
        this.loadUser();
        this.bindEvents();
        this.loadItems();
        this.setupModals();
        this.setupNavigation();
    }

    bindEvents() {
        // Authentication
        document.getElementById('loginBtn')?.addEventListener('click', () => this.showModal('loginModal'));
        document.getElementById('signupBtn')?.addEventListener('click', () => this.showModal('signupModal'));
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupForm')?.addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('logoutLink')?.addEventListener('click', (e) => this.handleLogout(e));

        // Search and filters
        document.getElementById('searchBtn')?.addEventListener('click', () => this.handleSearch());
        document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Category filters
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => {
                const category = card.dataset.category;
                this.filterByCategory(category);
            });
        });

        // Contact support
        document.getElementById('inboxBtn')?.addEventListener('click', () => this.showModal('inboxModal'));
        document.getElementById('floatingContactBtn')?.addEventListener('click', () => this.showContactOptions());
        document.getElementById('inboxForm')?.addEventListener('submit', (e) => this.handleInboxMessage(e));

        // Rent functionality
        document.getElementById('rentForm')?.addEventListener('submit', (e) => this.handleRentRequest(e));
        document.getElementById('rentStartDate')?.addEventListener('change', () => this.calculateRentTotal());
        document.getElementById('rentEndDate')?.addEventListener('change', () => this.calculateRentTotal());

        // Review functionality
        document.getElementById('submitReviewForm')?.addEventListener('submit', (e) => this.handleReviewSubmit(e));

        // Load more items
        document.getElementById('loadMoreBtn')?.addEventListener('click', () => this.loadMoreItems());
    }

    setupModals() {
        // Close modals when clicking outside or on close button
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('close')) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    setupNavigation() {
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    async loadUser() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.updateUserInterface();
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Error loading user:', error);
            localStorage.removeItem('token');
        }
    }

    updateUserInterface() {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');

        if (this.currentUser) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (signupBtn) signupBtn.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
            if (userName) userName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        } else {
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (signupBtn) signupBtn.style.display = 'inline-block';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                this.currentUser = data.user;
                this.updateUserInterface();
                this.hideModal('loginModal');
                this.showNotification('Login successful!', 'success');
            } else {
                this.showNotification(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const formData = {
            email: document.getElementById('signupEmail').value,
            password: document.getElementById('signupPassword').value,
            firstName: document.getElementById('signupFirstName').value,
            lastName: document.getElementById('signupLastName').value,
            phone: document.getElementById('signupPhone').value
        };

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                this.currentUser = data.user;
                this.updateUserInterface();
                this.hideModal('signupModal');
                this.showNotification('Account created successfully!', 'success');
            } else {
                this.showNotification(data.error || 'Signup failed', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        }
    }

    async handleLogout(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        this.currentUser = null;
        this.updateUserInterface();
        this.showNotification('Logged out successfully', 'success');
    }

    async loadItems() {
        try {
            const response = await fetch('/api/items');
            const data = await response.json();

            if (response.ok) {
                this.displayItems(data.items);
            } else {
                this.showNotification('Failed to load items', 'error');
            }
        } catch (error) {
            console.error('Error loading items:', error);
            this.showNotification('Network error loading items', 'error');
        }
    }

    displayItems(items) {
        const itemsGrid = document.getElementById('itemsGrid');
        if (!itemsGrid) return;

        itemsGrid.innerHTML = '';

        items.forEach(item => {
            const itemCard = this.createItemCard(item);
            itemsGrid.appendChild(itemCard);
        });
    }

    createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-image">
                ${item.images && item.images.length > 0 
                    ? `<img src="${item.images[0]}" alt="${item.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                       <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; color:#999; font-size:3rem;"><i class="fas fa-image"></i></div>`
                    : '<i class="fas fa-image"></i>'
                }
            </div>
            <div class="item-content">
                <h3 class="item-title">${item.title}</h3>
                <p class="item-location"><i class="fas fa-map-marker-alt"></i> ${item.location}</p>
                <div class="item-price">₦${item.price_per_day.toLocaleString()}/day</div>
                <div class="item-rating">
                    <div class="stars">
                        ${this.generateStars(item.avgRating)}
                    </div>
                    <span>(${item.reviewCount} reviews)</span>
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary" onclick="rentalApp.showRentModal(${item.id})">
                        <i class="fas fa-calendar-plus"></i> Rent Now
                    </button>
                    <button class="btn btn-outline" onclick="rentalApp.showContactSupport()">
                        <i class="fas fa-comments"></i> Contact
                    </button>
                </div>
            </div>
        `;
        return card;
    }

    generateStars(rating) {
        const stars = Math.floor(parseFloat(rating));
        const halfStar = parseFloat(rating) % 1 >= 0.5;
        let html = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < stars) {
                html += '<i class="fas fa-star"></i>';
            } else if (i === stars && halfStar) {
                html += '<i class="fas fa-star-half-alt"></i>';
            } else {
                html += '<i class="far fa-star"></i>';
            }
        }
        
        return html;
    }

    async showRentModal(itemId) {
        if (!this.currentUser) {
            this.showModal('loginModal');
            return;
        }

        try {
            const response = await fetch(`/api/items/${itemId}`);
            const data = await response.json();

            if (response.ok) {
                this.currentItem = data.item;
                this.populateRentModal(data.item);
                this.showModal('rentModal');
            } else {
                this.showNotification('Failed to load item details', 'error');
            }
        } catch (error) {
            console.error('Error loading item:', error);
            this.showNotification('Network error loading item', 'error');
        }
    }

    populateRentModal(item) {
        const rentItemDetails = document.getElementById('rentItemDetails');
        const rentItemId = document.getElementById('rentItemId');

        if (rentItemDetails) {
            rentItemDetails.innerHTML = `
                <h3>${item.title}</h3>
                <p><strong>Price:</strong> ₦${item.price_per_day.toLocaleString()}/day</p>
                <p><strong>Deposit:</strong> ₦${item.deposit_amount.toLocaleString()}</p>
                <p><strong>Location:</strong> ${item.location}</p>
            `;
        }

        if (rentItemId) {
            rentItemId.value = item.id;
        }

        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        const startDateInput = document.getElementById('rentStartDate');
        const endDateInput = document.getElementById('rentEndDate');
        
        if (startDateInput) startDateInput.min = today;
        if (endDateInput) endDateInput.min = today;
    }

    calculateRentTotal() {
        const startDate = document.getElementById('rentStartDate')?.value;
        const endDate = document.getElementById('rentEndDate')?.value;
        const rentSummary = document.getElementById('rentSummary');

        if (!startDate || !endDate || !this.currentItem || !rentSummary) return;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        if (days <= 0) {
            rentSummary.innerHTML = '<p style="color: red;">End date must be after start date</p>';
            return;
        }

        const totalAmount = days * this.currentItem.price_per_day;
        const depositAmount = this.currentItem.deposit_amount;
        const grandTotal = totalAmount + depositAmount;

        rentSummary.innerHTML = `
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 5px; margin: 1rem 0;">
                <h4>Rental Summary</h4>
                <p><strong>Duration:</strong> ${days} day${days > 1 ? 's' : ''}</p>
                <p><strong>Daily Rate:</strong> ₦${this.currentItem.price_per_day.toLocaleString()}</p>
                <p><strong>Rental Total:</strong> ₦${totalAmount.toLocaleString()}</p>
                <p><strong>Deposit:</strong> ₦${depositAmount.toLocaleString()}</p>
                <hr>
                <p><strong>Grand Total:</strong> ₦${grandTotal.toLocaleString()}</p>
            </div>
        `;
    }

    async handleRentRequest(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showNotification('Please login to rent items', 'error');
            return;
        }

        const itemId = document.getElementById('rentItemId').value;
        const startDate = document.getElementById('rentStartDate').value;
        const endDate = document.getElementById('rentEndDate').value;

        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    itemId: parseInt(itemId),
                    startDate,
                    endDate
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.hideModal('rentModal');
                this.showNotification('Booking request submitted successfully!', 'success');
            } else {
                this.showNotification(data.error || 'Failed to submit booking request', 'error');
            }
        } catch (error) {
            console.error('Booking error:', error);
            this.showNotification('Network error submitting booking', 'error');
        }
    }

    async handleSearch() {
        const searchInput = document.getElementById('searchInput');
        const categorySelect = document.getElementById('categorySelect');
        const locationInput = document.getElementById('locationInput');

        const params = new URLSearchParams();
        if (searchInput?.value) params.append('search', searchInput.value);
        if (categorySelect?.value) params.append('category', categorySelect.value);
        if (locationInput?.value) params.append('location', locationInput.value);

        try {
            const response = await fetch(`/api/items?${params.toString()}`);
            const data = await response.json();

            if (response.ok) {
                this.displayItems(data.items);
                this.showNotification(`Found ${data.items.length} items`, 'success');
            } else {
                this.showNotification('Search failed', 'error');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showNotification('Network error during search', 'error');
        }
    }

    filterByCategory(category) {
        const categorySelect = document.getElementById('categorySelect');
        if (categorySelect) {
            categorySelect.value = category;
        }
        this.handleSearch();
    }

    async handleInboxMessage(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showNotification('Please login to send messages', 'error');
            return;
        }

        const subject = document.getElementById('inboxSubject').value;
        const body = document.getElementById('inboxMessage').value;

        try {
            const response = await fetch('/api/messages/inbox', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ subject, body })
            });

            const data = await response.json();

            if (response.ok) {
                this.hideModal('inboxModal');
                this.showNotification('Message sent successfully!', 'success');
                document.getElementById('inboxForm').reset();
            } else {
                this.showNotification(data.error || 'Failed to send message', 'error');
            }
        } catch (error) {
            console.error('Message error:', error);
            this.showNotification('Network error sending message', 'error');
        }
    }

    async handleReviewSubmit(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showNotification('Please login to submit reviews', 'error');
            return;
        }

        const formData = {
            itemId: document.getElementById('reviewItemId').value,
            bookingId: document.getElementById('reviewBookingId').value,
            rating: document.getElementById('reviewRating').value,
            title: document.getElementById('reviewTitle').value,
            comment: document.getElementById('reviewComment').value
        };

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Review submitted successfully!', 'success');
                document.getElementById('submitReviewForm').reset();
                this.loadReviews();
            } else {
                this.showNotification(data.error || 'Failed to submit review', 'error');
            }
        } catch (error) {
            console.error('Review error:', error);
            this.showNotification('Network error submitting review', 'error');
        }
    }

    async loadReviews() {
        const urlParams = new URLSearchParams(window.location.search);
        const itemId = urlParams.get('id');
        
        if (!itemId) return;

        try {
            const response = await fetch(`/api/reviews/item/${itemId}`);
            const data = await response.json();

            if (response.ok) {
                this.displayReviews(data.reviews);
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
        }
    }

    displayReviews(reviews) {
        const reviewsContainer = document.getElementById('reviewsContainer');
        if (!reviewsContainer) return;

        reviewsContainer.innerHTML = '';

        if (reviews.length === 0) {
            reviewsContainer.innerHTML = '<p>No reviews yet. Be the first to review this item!</p>';
            return;
        }

        reviews.forEach(review => {
            const reviewCard = document.createElement('div');
            reviewCard.className = 'review-card';
            reviewCard.innerHTML = `
                <div class="review-header">
                    <span class="review-author">${review.reviewer_name} ${review.reviewer_last_name}</span>
                    <span class="review-date">${new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <div class="review-rating">${this.generateStars(review.rating)}</div>
                <div class="review-title">${review.title}</div>
                <div class="review-comment">${review.comment}</div>
            `;
            reviewsContainer.appendChild(reviewCard);
        });
    }

    showContactOptions() {
        if (!this.currentUser) {
            this.showModal('loginModal');
            return;
        }
        this.showModal('inboxModal');
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

    loadMoreItems() {
        // This would implement pagination in a real app
        this.showNotification('All items loaded', 'info');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.rentalApp = new RentalMarketplace();
    
    // Load item details if on item page
    if (window.location.pathname.includes('item.html')) {
        window.rentalApp.loadItemDetails();
    }
});

// Load item details for item.html page
RentalMarketplace.prototype.loadItemDetails = async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');
    
    if (!itemId) {
        this.showNotification('Item ID not provided', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/items/${itemId}`);
        const data = await response.json();

        if (response.ok) {
            this.currentItem = data.item;
            this.displayItemDetails(data.item);
            this.loadReviews();
            
            // Check if user can review (for demo purposes)
            const canReview = urlParams.get('canReview') === 'true';
            if (canReview && this.currentUser) {
                document.getElementById('reviewForm').style.display = 'block';
                document.getElementById('reviewItemId').value = itemId;
                document.getElementById('reviewBookingId').value = '1'; // Demo booking ID
            }
        } else {
            this.showNotification('Item not found', 'error');
        }
    } catch (error) {
        console.error('Error loading item details:', error);
        this.showNotification('Network error loading item', 'error');
    }
};

RentalMarketplace.prototype.displayItemDetails = function(item) {
    const itemContent = document.getElementById('itemContent');
    if (!itemContent) return;

    itemContent.innerHTML = `
        <div class="item-detail-card">
            <div class="item-detail-images">
                <div class="item-detail-main-image">
                    ${item.images && item.images.length > 0 
                        ? `<img src="${item.images[0]}" alt="${item.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                           <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; color:#999; font-size:4rem;"><i class="fas fa-image"></i></div>`
                        : '<i class="fas fa-image"></i>'
                    }
                </div>
                ${item.images && item.images.length > 1 ? item.images.slice(1, 3).map(img => `
                    <div class="item-detail-thumbnail">
                        <img src="${img}" alt="${item.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; color:#999; font-size:2rem;"><i class="fas fa-image"></i></div>
                    </div>
                `).join('') : ''}
            </div>
            <div class="item-detail-content">
                <div class="item-detail-header">
                    <h1 class="item-detail-title">${item.title}</h1>
                    <div class="item-detail-price">₦${item.price_per_day.toLocaleString()}/day</div>
                </div>
                <div class="item-detail-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${item.location}</span>
                    <span><i class="fas fa-user"></i> ${item.owner_name} ${item.owner_last_name}</span>
                    <span><i class="fas fa-star"></i> ${item.avgRating} (${item.reviewCount} reviews)</span>
                </div>
                <div class="item-detail-description">
                    <h3>Description</h3>
                    <p>${item.description || 'No description provided.'}</p>
                </div>
                <div class="item-detail-actions">
                    <button class="btn btn-primary" onclick="rentalApp.showRentModal(${item.id})">
                        <i class="fas fa-calendar-plus"></i> Rent Now
                    </button>
                    <button class="btn btn-outline" onclick="rentalApp.showContactSupport()">
                        <i class="fas fa-comments"></i> Contact Support
                    </button>
                </div>
            </div>
        </div>
    `;
};