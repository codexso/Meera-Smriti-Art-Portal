document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');

  // Update Navigation UI based on Auth State
  updateAuthUI(token);

  // --- 1. Login Handler ---
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const alertBox = document.getElementById('loginAlert');

      alertBox.className = '';
      alertBox.style.display = 'none';

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Invalid credentials');
        }

        localStorage.setItem('token', data.token);
        alertBox.className = 'success';
        alertBox.textContent = 'Authenticated! Redirecting to Portal...';

        setTimeout(() => {
          window.location.href = 'notices.html';
        }, 800);
      } catch (err) {
        alertBox.className = 'error';
        alertBox.textContent = err.message;
      }
    });
  }

  // --- 2. Notice Board Fetcher ---
  const noticesContainer = document.getElementById('notices-container');
  if (noticesContainer) {
    loadNotices();
  }

  // --- 3. Notice Creator (Admin) ---
  const createNoticeForm = document.getElementById('createNoticeForm');
  if (createNoticeForm) {
    createNoticeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('title').value;
      const content = document.getElementById('content').value;

      try {
        const res = await fetch('/api/notices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title, content })
        });

        if (!res.ok) throw new Error('Failed to publish notice. Ensure you are logged in.');

        createNoticeForm.reset();
        loadNotices();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // --- 4. Contact Form Handler ---
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Enquiry received! The academy administration will reach out shortly.');
      contactForm.reset();
    });
  }
});

async function loadNotices() {
  const noticesContainer = document.getElementById('notices-container');
  try {
    const res = await fetch('/api/notices');
    const notices = await res.json();

    if (!Array.isArray(notices) || notices.length === 0) {
      noticesContainer.innerHTML = `
        <div class="card notice-card">
          <h3>No Circulars Published</h3>
          <p style="color: var(--text-muted); margin-top: 0.5rem;">There are currently no active notices available on the board.</p>
        </div>
      `;
      return;
    }

    noticesContainer.innerHTML = notices.map(n => `
      <div class="card notice-card">
        <div>
          <div class="notice-meta">
            <span style="font-weight: 700; color: var(--primary);">CIRCULAR</span>
            <span>${new Date(n.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <h3 style="margin-bottom: 0.5rem; color: #0f172a; font-size: 1.15rem;">${escapeHTML(n.title)}</h3>
          <p style="color: #475569; font-size: 0.925rem; white-space: pre-line; line-height: 1.6;">${escapeHTML(n.content)}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    noticesContainer.innerHTML = `
      <div class="card notice-card">
        <h3 style="color: #dc2626;">Error Loading Notices</h3>
        <p style="color: var(--text-muted); margin-top: 0.5rem;">Could not fetch circulars from the database server.</p>
      </div>
    `;
  }
}

function updateAuthUI(token) {
  const adminNoticeForm = document.getElementById('admin-notice-form');
  if (adminNoticeForm) {
    adminNoticeForm.style.display = token ? 'block' : 'none';
  }

  const loginBtns = document.querySelectorAll('.btn-login');
  loginBtns.forEach(btn => {
    if (btn.getAttribute('href') === 'login.html' && token) {
      btn.textContent = 'Admin Dashboard';
      btn.href = 'notices.html';
    }
  });
}

function escapeHTML(str) {
  return String(str || '').replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}