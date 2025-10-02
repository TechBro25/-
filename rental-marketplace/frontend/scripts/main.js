// Global variables
let currentUser = null;
let currentItem = null;
let currentPage = 1;
let currentFilters = {};

// API Base URL
const API_BASE = '/api';

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        loadFeaturedItems();
    }
    setupEventListeners();
});

// Authentication functions
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (token) {
        // Verify token is still valid
        fetch(`${API_BASE}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Invalid token');
            }
        })
        .then(data => {
            currentUser = data.user;
            updateAuthUI();
        })
        .catch(() => {
            localStorage.removeItem('authToken');
            currentUser = null;
            updateAuthUI();
        });
    } else {
        updateAuthUI();
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');

    if (currentUser) {
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        userMenu.style.display = 'block';
        userName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    } else {
        loginBtn.style.display = 'inline-flex';
        signupBtn.style.display = 'inline-flex';
        userMenu.style.display = 'none';
    }
}

// Event listeners setup
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Inbox form
    const inboxForm = document.getElementById('inboxForm');
    if (inboxForm) {
        inboxForm.addEventListener('submit', handleInboxMessage);
    }

    // Rent form
    const rentForm = document.getElementById('rentForm');
    if (rentForm) {
        rentForm.addEventListener('submit', handleRentRequest);
    }

    // KYC form
    const kycForm = document.getElementById('kycForm');
    if (kycForm) {
        kycForm.addEventListener('submit', handleKYCSubmission);
    }

    // Review form
    const reviewForm = document.getElementById('submitReviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmission);
    }

    // Date inputs for rental calculation
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    if (startDate && endDate) {
        startDate.addEventListener('change', calculateRentalCost);
        endDate.addEventListener('change', calculateRentalCost);
    }

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchItems();
            }
        });
    }

    // Modal close functionality
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Authentication handlers
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            currentUser = data.user;
            updateAuthUI();
            closeModal('loginModal');
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('signupFirstName').value;
    const lastName = document.getElementById('signupLastName').value;
    const email = document.getElementById('signupEmail').value;
    const phone = document.getElementById('signupPhone').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ firstName, lastName, email, phone, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            currentUser = data.user;
            updateAuthUI();
            closeModal('signupModal');
            showNotification('Account created successfully!', 'success');
        } else {
            showNotification(data.error || 'Signup failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showNotification('Signup failed', 'error');
    }
}

function logout() {
    localStorage.removeItem('authToken');
    currentUser = null;
    updateAuthUI();
    showNotification('Logged out successfully', 'success');
    
    // Redirect to home if on protected page
    if (window.location.pathname.includes('admin')) {
        window.location.href = '/';
    }
}

// Items functions
async function loadFeaturedItems(page = 1, filters = {}) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const itemsGrid = document.getElementById('itemsGrid');
    
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    if (itemsGrid) itemsGrid.innerHTML = '';

    try {
        const queryParams = new URLSearchParams({
            page: page,
            limit: 12,
            ...filters
        });

        const response = await fetch(`${API_BASE}/items?${queryParams}`);
        const data = await response.json();

        if (response.ok) {
            displayItems(data.items);
            displayPagination(data.pagination);
        } else {
            showNotification('Failed to load items', 'error');
        }
    } catch (error) {
        console.error('Error loading items:', error);
        showNotification('Failed to load items', 'error');
    } finally {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

function displayItems(items) {
    const itemsGrid = document.getElementById('itemsGrid');
    if (!itemsGrid) return;

    if (items.length === 0) {
        itemsGrid.innerHTML = '<div class="no-items">No items found matching your criteria.</div>';
        return;
    }

    itemsGrid.innerHTML = items.map(item => `
        <div class="item-card">
            <div class="item-image" style="background-image: url('${item.images[0] || '/placeholder/item-placeholder.jpg'}')">
                ${item.owner_verified ? '<div class="verified-badge"><i class="fas fa-check-circle"></i> Verified Owner</div>' : ''}
            </div>
            <div class="item-content">
                <h3 class="item-title">${item.title}</h3>
                <div class="item-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${item.location}
                </div>
                <div class="item-price">₦${item.price_per_day.toLocaleString()}<span class="period">/day</span></div>
                <div class="item-rating">
                    <div class="stars">
                        ${generateStars(item.avg_rating)}
                    </div>
                    <span>(${item.review_count} reviews)</span>
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary" onclick="viewItem(${item.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-outline" onclick="showContactModal()">
                        <i class="fas fa-headset"></i> Support
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star star"></i>';
    }
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt star"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star star empty"></i>';
    }
    
    return stars;
}

function displayPagination(pagination) {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;

    if (pagination.pages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="pagination">';
    
    // Previous button
    if (pagination.page > 1) {
        paginationHTML += `<button onclick="changePage(${pagination.page - 1})">Previous</button>`;
    }
    
    // Page numbers
    for (let i = 1; i <= pagination.pages; i++) {
        if (i === pagination.page) {
            paginationHTML += `<button class="active">${i}</button>`;
        } else {
            paginationHTML += `<button onclick="changePage(${i})">${i}</button>`;
        }
    }
    
    // Next button
    if (pagination.page < pagination.pages) {
        paginationHTML += `<button onclick="changePage(${pagination.page + 1})">Next</button>`;
    }
    
    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;
}

function changePage(page) {
    currentPage = page;
    loadFeaturedItems(page, currentFilters);
}

// Item detail functions
async function loadItemDetails(itemId) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const itemContent = document.getElementById('itemContent');
    const errorMessage = document.getElementById('errorMessage');
    
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    if (itemContent) itemContent.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE}/items/${itemId}`);
        const data = await response.json();

        if (response.ok) {
            currentItem = data.item;
            displayItemDetails(data.item);
            if (itemContent) itemContent.style.display = 'block';
        } else {
            if (errorMessage) errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading item:', error);
        if (errorMessage) errorMessage.style.display = 'block';
    } finally {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

function displayItemDetails(item) {
    // Update breadcrumb
    const breadcrumbCategory = document.getElementById('breadcrumbCategory');
    const breadcrumbTitle = document.getElementById('breadcrumbTitle');
    if (breadcrumbCategory) breadcrumbCategory.textContent = item.category;
    if (breadcrumbTitle) breadcrumbTitle.textContent = item.title;

    // Update item info
    const itemTitle = document.getElementById('itemTitle');
    const itemPrice = document.getElementById('itemPrice');
    const itemLocation = document.getElementById('itemLocation');
    const ownerName = document.getElementById('ownerName');
    const ownerVerified = document.getElementById('ownerVerified');
    const depositAmount = document.getElementById('depositAmount');
    const itemDescription = document.getElementById('itemDescription');
    const itemRating = document.getElementById('itemRating');
    const reviewCount = document.getElementById('reviewCount');

    if (itemTitle) itemTitle.textContent = item.title;
    if (itemPrice) itemPrice.textContent = `₦${item.price_per_day.toLocaleString()}`;
    if (itemLocation) itemLocation.textContent = item.location;
    if (ownerName) ownerName.textContent = item.owner_name;
    if (ownerVerified && item.owner_verified) ownerVerified.style.display = 'flex';
    if (depositAmount) depositAmount.textContent = `₦${item.deposit_amount.toLocaleString()}`;
    if (itemDescription) itemDescription.textContent = item.description;
    if (itemRating) itemRating.innerHTML = generateStars(item.avg_rating);
    if (reviewCount) reviewCount.textContent = `(${item.review_count} reviews)`;

    // Update images
    displayItemImages(item.images);
    
    // Display reviews
    displayReviews(item.reviews);
    
    // Check if user can review (demo: show form if canReview=true in URL)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('canReview') === 'true' && currentUser) {
        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) reviewForm.style.display = 'block';
    }
}

function displayItemImages(images) {
    const mainImage = document.getElementById('mainImage');
    const thumbnailImages = document.getElementById('thumbnailImages');
    
    if (images.length === 0) {
        if (mainImage) mainImage.src = '/placeholder/item-placeholder.jpg';
        if (thumbnailImages) thumbnailImages.innerHTML = '';
        return;
    }
    
    if (mainImage) mainImage.src = images[0];
    
    if (thumbnailImages) {
        thumbnailImages.innerHTML = images.map((image, index) => `
            <img src="${image}" alt="Thumbnail ${index + 1}" class="thumbnail ${index === 0 ? 'active' : ''}" 
                 onclick="changeMainImage('${image}', ${index})">
        `).join('');
    }
}

function changeMainImage(imageSrc, index) {
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.querySelectorAll('.thumbnail');
    
    if (mainImage) mainImage.src = imageSrc;
    
    thumbnails.forEach((thumb, i) => {
        if (i === index) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

function displayReviews(reviews) {
    const reviewsList = document.getElementById('reviewsList');
    const averageRating = document.getElementById('averageRating');
    const averageStars = document.getElementById('averageStars');
    const totalReviews = document.getElementById('totalReviews');
    
    if (!reviewsList) return;
    
    if (reviews.length === 0) {
        reviewsList.innerHTML = '<div class="no-reviews">No reviews yet. Be the first to review this item!</div>';
        return;
    }
    
    // Calculate average rating
    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    
    if (averageRating) averageRating.textContent = avgRating.toFixed(1);
    if (averageStars) averageStars.innerHTML = generateStars(avgRating);
    if (totalReviews) totalReviews.textContent = `${reviews.length} reviews`;
    
    reviewsList.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div class="reviewer-info">
                    <strong>${review.reviewer_name}</strong>
                    ${review.reviewer_verified ? '<span class="reviewer-verified"><i class="fas fa-check-circle"></i> Verified</span>' : ''}
                </div>
                <div class="review-date">${formatDate(review.created_at)}</div>
            </div>
            <div class="review-rating">
                ${generateStars(review.rating)}
            </div>
            <div class="review-comment">
                ${review.comment}
            </div>
            ${review.images.length > 0 ? `
                <div class="review-images">
                    ${review.images.map(image => `
                        <img src="${image}" alt="Review image" class="review-image" onclick="openImageModal('${image}')">
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Search and filter functions
function searchItems() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const locationFilter = document.getElementById('locationFilter');
    
    currentFilters = {
        search: searchInput ? searchInput.value : '',
        category: categoryFilter ? categoryFilter.value : '',
        location: locationFilter ? locationFilter.value : ''
    };
    
    currentPage = 1;
    loadFeaturedItems(1, currentFilters);
}

function filterByCategory(category) {
    currentFilters = { category };
    currentPage = 1;
    loadFeaturedItems(1, currentFilters);
    
    // Show items section
    showSection('itemsSection');
}

function showSection(sectionId) {
    // This would be implemented based on your page structure
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Modal functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function showLoginModal() {
    showModal('loginModal');
}

function showSignupModal() {
    showModal('signupModal');
}

function showContactModal() {
    showModal('contactModal');
}

function showInboxModal() {
    closeModal('contactModal');
    showModal('inboxModal');
}

function showRentModal() {
    if (!currentUser) {
        showNotification('Please login to rent items', 'error');
        showLoginModal();
        return;
    }
    
    if (!currentUser.isVerified) {
        showNotification('Please verify your account to rent items', 'error');
        showKYCModal();
        return;
    }
    
    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput) startDateInput.min = tomorrow.toISOString().split('T')[0];
    if (endDateInput) endDateInput.min = tomorrow.toISOString().split('T')[0];
    
    // Update rental details
    if (currentItem) {
        const rentItemDetails = document.getElementById('rentItemDetails');
        const dailyRate = document.getElementById('dailyRate');
        const depositAmountSpan = document.getElementById('depositAmount');
        
        if (rentItemDetails) {
            rentItemDetails.innerHTML = `
                <div class="rent-item-info">
                    <h3>${currentItem.title}</h3>
                    <p>${currentItem.location}</p>
                </div>
            `;
        }
        
        if (dailyRate) dailyRate.textContent = `₦${currentItem.price_per_day.toLocaleString()}`;
        if (depositAmountSpan) depositAmountSpan.textContent = `₦${currentItem.deposit_amount.toLocaleString()}`;
    }
    
    showModal('rentModal');
}

function showKYCModal() {
    showModal('kycModal');
}

// Rental calculation
function calculateRentalCost() {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const numberOfDaysSpan = document.getElementById('numberOfDays');
    const totalAmountSpan = document.getElementById('totalAmount');
    
    if (!startDate || !endDate || !currentItem) return;
    
    const start = new Date(startDate.value);
    const end = new Date(endDate.value);
    
    if (start && end && end > start) {
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const totalAmount = days * currentItem.price_per_day;
        
        if (numberOfDaysSpan) numberOfDaysSpan.textContent = days;
        if (totalAmountSpan) totalAmountSpan.textContent = `₦${totalAmount.toLocaleString()}`;
    }
}

// Form handlers
async function handleInboxMessage(e) {
    e.preventDefault();
    
    const subject = document.getElementById('messageSubject').value;
    const message = document.getElementById('messageText').value;
    
    if (!currentUser) {
        showNotification('Please login to send messages', 'error');
        closeModal('inboxModal');
        showLoginModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ subject, message })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Message sent successfully!', 'success');
            closeModal('inboxModal');
            document.getElementById('inboxForm').reset();
        } else {
            showNotification(data.error || 'Failed to send message', 'error');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Failed to send message', 'error');
    }
}

async function handleRentRequest(e) {
    e.preventDefault();
    
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const message = document.getElementById('rentalMessage').value;
    
    if (!currentItem) {
        showNotification('Item information not available', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                itemId: currentItem.id,
                startDate,
                endDate,
                message
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Booking request sent successfully!', 'success');
            closeModal('rentModal');
            document.getElementById('rentForm').reset();
        } else {
            showNotification(data.error || 'Failed to create booking', 'error');
        }
    } catch (error) {
        console.error('Error creating booking:', error);
        showNotification('Failed to create booking', 'error');
    }
}

async function handleKYCSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const idDocument = document.getElementById('idDocument').files[0];
    const selfieDocument = document.getElementById('selfieDocument').files[0];
    
    if (!idDocument || !selfieDocument) {
        showNotification('Please select both ID document and selfie', 'error');
        return;
    }
    
    formData.append('idDocument', idDocument);
    formData.append('selfie', selfieDocument);
    
    try {
        const response = await fetch(`${API_BASE}/admin/kyc/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('KYC documents submitted successfully!', 'success');
            showNotification(`Verification code: ${data.verificationCode}. Send this to WhatsApp 091-546-09327`, 'info');
            closeModal('kycModal');
            document.getElementById('kycForm').reset();
        } else {
            showNotification(data.error || 'Failed to submit KYC documents', 'error');
        }
    } catch (error) {
        console.error('Error submitting KYC:', error);
        showNotification('Failed to submit KYC documents', 'error');
    }
}

async function handleReviewSubmission(e) {
    e.preventDefault();
    
    const rating = document.querySelector('input[name="rating"]:checked');
    const comment = document.getElementById('reviewComment').value;
    
    if (!rating) {
        showNotification('Please select a rating', 'error');
        return;
    }
    
    // For demo purposes, we'll use a dummy booking ID
    const dummyBookingId = 1;
    
    try {
        const response = await fetch(`${API_BASE}/reviews?demo=true`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                bookingId: dummyBookingId,
                rating: parseInt(rating.value),
                comment
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Review submitted successfully!', 'success');
            document.getElementById('submitReviewForm').reset();
            // Reload reviews
            if (currentItem) {
                loadItemDetails(currentItem.id);
            }
        } else {
            showNotification(data.error || 'Failed to submit review', 'error');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showNotification('Failed to submit review', 'error');
    }
}

// WhatsApp integration
function openWhatsApp(message = 'Hello, I need help with the rental marketplace.') {
    const whatsappNumber = '09154609327';
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
}

function contactOwner() {
    if (!currentItem) return;
    
    const message = `Hi! I'm interested in renting your ${currentItem.title}. Is it available?`;
    openWhatsApp(message);
}

// Utility functions
function viewItem(itemId) {
    window.location.href = `/item/${itemId}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatCurrency(amount) {
    return `₦${amount.toLocaleString()}`;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Placeholder functions for features not yet implemented
function showProfile() {
    showNotification('Profile management coming soon!', 'info');
}

function showMyItems() {
    showNotification('My Items management coming soon!', 'info');
}

function showMyBookings() {
    showNotification('My Bookings management coming soon!', 'info');
}

function showMessages() {
    showNotification('Messages management coming soon!', 'info');
}

// Calendar functions (placeholder)
let currentCalendarMonth = new Date();

function previousMonth() {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
    updateCalendar();
}

function nextMonth() {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
    updateCalendar();
}

function updateCalendar() {
    const calendarMonth = document.getElementById('calendarMonth');
    const calendarGrid = document.getElementById('calendarGrid');
    
    if (!calendarMonth || !calendarGrid) return;
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    
    calendarMonth.textContent = `${monthNames[currentCalendarMonth.getMonth()]} ${currentCalendarMonth.getFullYear()}`;
    
    // Simple calendar implementation (placeholder)
    const daysInMonth = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 0).getDate();
    let calendarHTML = '';
    
    // Day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        calendarHTML += `<div class="calendar-day header">${day}</div>`;
    });
    
    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const isAvailable = Math.random() > 0.3; // Random availability for demo
        const className = isAvailable ? 'available' : 'booked';
        calendarHTML += `<div class="calendar-day ${className}">${day}</div>`;
    }
    
    calendarGrid.innerHTML = calendarHTML;
}

// Initialize calendar if on item page
if (window.location.pathname.includes('/item/')) {
    document.addEventListener('DOMContentLoaded', function() {
        updateCalendar();
    });
}