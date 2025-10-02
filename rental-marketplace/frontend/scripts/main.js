// API Base URL
const API_BASE = window.location.origin + '/api';

// Utility functions
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function showError(message) {
  alert(message); // In production, use a nicer notification system
}

function showSuccess(message) {
  alert(message); // In production, use a nicer notification system
}

// Auth functions
let isSignupMode = false;

function toggleAuthMode() {
  isSignupMode = !isSignupMode;
  
  if (isSignupMode) {
    document.getElementById('authModalTitle').textContent = 'Sign Up';
    document.getElementById('authButtonText').textContent = 'Sign Up';
    document.getElementById('fullNameGroup').style.display = 'block';
    document.getElementById('phoneGroup').style.display = 'block';
    document.getElementById('toggleAuthMode').textContent = 'Already have an account? Login';
  } else {
    document.getElementById('authModalTitle').textContent = 'Login';
    document.getElementById('authButtonText').textContent = 'Login';
    document.getElementById('fullNameGroup').style.display = 'none';
    document.getElementById('phoneGroup').style.display = 'none';
    document.getElementById('toggleAuthMode').textContent = "Don't have an account? Sign up";
  }
}

async function handleAuth(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const fullName = document.getElementById('fullName')?.value;
  const phone = document.getElementById('phone')?.value;
  
  const endpoint = isSignupMode ? '/auth/signup' : '/auth/login';
  const body = isSignupMode 
    ? { email, password, fullName, phone }
    : { email, password };
  
  try {
    const response = await fetch(API_BASE + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      closeModal('authModal');
      updateNavigation();
      showSuccess(isSignupMode ? 'Account created successfully!' : 'Logged in successfully!');
      
      // Reload if on main page
      if (window.location.pathname === '/') {
        setTimeout(() => location.reload(), 500);
      }
    } else {
      document.getElementById('authError').textContent = data.error || 'Authentication failed';
      document.getElementById('authError').classList.remove('hidden');
    }
  } catch (error) {
    console.error('Auth error:', error);
    document.getElementById('authError').textContent = 'An error occurred. Please try again.';
    document.getElementById('authError').classList.remove('hidden');
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateNavigation();
  if (window.location.pathname === '/admin') {
    window.location.href = '/';
  } else {
    location.reload();
  }
}

function updateNavigation() {
  const token = localStorage.getItem('token');
  const authLink = document.getElementById('authLink');
  
  if (authLink) {
    if (token) {
      const user = JSON.parse(localStorage.getItem('user'));
      authLink.textContent = `Logout (${user.fullName})`;
    } else {
      authLink.textContent = 'Login';
    }
  }
}

// Items functions
async function loadItems(category = '', search = '') {
  const spinner = document.getElementById('loadingSpinner');
  const grid = document.getElementById('itemsGrid');
  
  if (spinner) spinner.classList.remove('hidden');
  
  try {
    let url = `${API_BASE}/items?limit=50`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      displayItems(data.items);
    } else {
      showError('Failed to load items');
    }
  } catch (error) {
    console.error('Error loading items:', error);
    showError('Failed to load items');
  } finally {
    if (spinner) spinner.classList.add('hidden');
  }
}

function displayItems(items) {
  const grid = document.getElementById('itemsGrid');
  
  if (!items || items.length === 0) {
    grid.innerHTML = '<p class="text-center" style="grid-column: 1/-1;">No items found</p>';
    return;
  }
  
  grid.innerHTML = items.map(item => {
    const image = item.images && item.images.length > 0 
      ? item.images[0] 
      : '/uploads/placeholder/default.jpg';
    const stars = '⭐'.repeat(Math.round(item.rating));
    
    return `
      <div class="item-card" onclick="window.location.href='/item/${item.id}'">
        <img src="${image}" alt="${item.title}" class="item-image" 
             onerror="this.src='/uploads/placeholder/default.jpg'">
        <div class="item-content">
          <h3 class="item-title">${item.title}</h3>
          <div class="item-location">📍 ${item.location || 'Nigeria'}</div>
          <div class="item-price">₦${item.price_per_day.toLocaleString()}/day</div>
          <div class="item-rating">
            ${stars || 'No rating'} 
            <span style="color: var(--gray-600);">(${item.review_count})</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function searchItems() {
  const search = document.getElementById('searchInput')?.value;
  const category = document.querySelector('.category-badge.active')?.dataset.category || '';
  loadItems(category, search);
}

// Support/Inbox functions
function openSupportModal() {
  openModal('supportModal');
}

function openInboxModal() {
  closeModal('supportModal');
  
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please login to send messages');
    openModal('authModal');
    return;
  }
  
  openModal('inboxModal');
}

async function sendInboxMessage(e) {
  e.preventDefault();
  
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please login to send messages');
    return;
  }
  
  const subject = document.getElementById('messageSubject').value;
  const body = document.getElementById('messageBody').value;
  
  // For general support, send to admin (ID 1)
  const receiverId = 1;
  
  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ receiverId, subject, body })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      document.getElementById('inboxSuccess').textContent = 'Message sent successfully!';
      document.getElementById('inboxSuccess').classList.remove('hidden');
      document.getElementById('inboxForm').reset();
      
      setTimeout(() => {
        closeModal('inboxModal');
        document.getElementById('inboxSuccess').classList.add('hidden');
      }, 2000);
    } else {
      document.getElementById('inboxError').textContent = data.error || 'Failed to send message';
      document.getElementById('inboxError').classList.remove('hidden');
    }
  } catch (error) {
    console.error('Send message error:', error);
    document.getElementById('inboxError').textContent = 'An error occurred. Please try again.';
    document.getElementById('inboxError').classList.remove('hidden');
  }
}

// Verification functions
async function requestVerification() {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please login first');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/messages/verification/request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`Verification code sent! Please send the 6-digit code you received to WhatsApp: ${data.whatsappNumber}`);
      window.open(`https://wa.me/2349154609327?text=My%20verification%20code%20is%3A%20`, '_blank');
    } else {
      alert(data.error || 'Failed to request verification');
    }
  } catch (error) {
    console.error('Verification error:', error);
    alert('An error occurred. Please try again.');
  }
}

// Export functions for use in HTML
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleAuthMode = toggleAuthMode;
window.handleAuth = handleAuth;
window.logout = logout;
window.updateNavigation = updateNavigation;
window.loadItems = loadItems;
window.searchItems = searchItems;
window.openSupportModal = openSupportModal;
window.openInboxModal = openInboxModal;
window.sendInboxMessage = sendInboxMessage;
window.requestVerification = requestVerification;
