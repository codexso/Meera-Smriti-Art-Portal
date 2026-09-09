document.addEventListener("DOMContentLoaded", () => {
  setActiveNavLink();
  checkAdminSession();
  loadNotices();

  const noticeForm = document.getElementById("notice-form");
  if (noticeForm) {
    noticeForm.addEventListener("submit", saveNotice);
  }

  const admissionForm = document.getElementById("admission-form");
  if (admissionForm) {
    admissionForm.addEventListener("submit", submitAdmission);
  }

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", submitContact);
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
});

function setActiveNavLink() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav a").forEach((link) => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
    }
  });
}

function checkAdminSession() {
  const token = localStorage.getItem("academy_jwt_token");
  const adminElements = document.querySelectorAll(".admin-only");
  const logoutBtn = document.getElementById("logout-nav-item");

  if (token) {
    adminElements.forEach((el) => el.style.setProperty("display", "block", "important"));
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    adminElements.forEach((el) => el.style.setProperty("display", "none", "important"));
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById("username").value;
  const passwordInput = document.getElementById("password").value;
  const statusEl = document.getElementById("login-status");

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameInput, password: passwordInput })
    });
    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("academy_jwt_token", data.token);
      localStorage.setItem("academy_user", data.username);
      alert("Login successful! Redirecting to notice board...");
      window.location.href = "notices.html";
    } else {
      if (statusEl) statusEl.textContent = data.error || "Login failed";
    }
  } catch (err) {
    if (statusEl) statusEl.textContent = "Server connection error.";
  }
}

function logout() {
  localStorage.removeItem("academy_jwt_token");
  localStorage.removeItem("academy_user");
  alert("Logged out successfully.");
  window.location.href = "index.html";
}

async function loadNotices() {
  const noticeContainer = document.getElementById("notice-container");
  if (!noticeContainer) return;

  try {
    const res = await fetch("/api/notices");
    const notices = await res.json();

    if (!Array.isArray(notices) || notices.length === 0) {
      noticeContainer.innerHTML = "<p style='color:#777;'>No official notices published yet.</p>";
      return;
    }

    noticeContainer.innerHTML = notices.map((n) => `
      <article class="card notice-card">
        <div class="notice-meta">
          <span>Posted by: <strong>${n.author}</strong></span>
          <span>${n.date}</span>
        </div>
        <h3 style="color: var(--primary); margin-bottom: 0.5rem;">${n.title}</h3>
        <p style="color: #444; white-space: pre-line;">${n.content}</p>
        <div class="admin-controls admin-only" style="display: none;">
          <button onclick="deleteNotice(${n.id})" class="btn-sm btn-danger">Delete Notice</button>
        </div>
      </article>
    `).join("");

    checkAdminSession();
  } catch (err) {
    noticeContainer.innerHTML = "<p style='color:red;'>Unable to load notices from database.</p>";
  }
}

async function saveNotice(e) {
  e.preventDefault();
  const token = localStorage.getItem("academy_jwt_token");
  if (!token) return alert("Unauthorized. Please log in as admin.");

  const title = document.getElementById("notice-title").value;
  const content = document.getElementById("notice-content").value;

  try {
    const res = await fetch("/api/notices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ title, content })
    });

    if (res.ok) {
      document.getElementById("notice-form").reset();
      loadNotices();
    } else {
      const errData = await res.json();
      alert(errData.error || "Failed to publish notice");
    }
  } catch (err) {
    alert("Error publishing notice.");
  }
}

async function deleteNotice(id) {
  if (!confirm("Are you sure you want to delete this notice?")) return;

  const token = localStorage.getItem("academy_jwt_token");
  try {
    const res = await fetch(`/api/notices/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      loadNotices();
    } else {
      alert("Failed to delete notice.");
    }
  } catch (err) {
    alert("Error communicating with server.");
  }
}

async function submitAdmission(e) {
  e.preventDefault();
  const formData = {
    fullname: document.getElementById("fullname").value,
    dob: document.getElementById("dob").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    course: document.getElementById("course").value,
    address: document.getElementById("address").value
  };

  try {
    const res = await fetch("/api/admissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (res.ok) {
      alert("Application submitted successfully! Application ID: " + data.id);
      document.getElementById("admission-form").reset();
    } else {
      alert(data.error || "Error submitting form.");
    }
  } catch (err) {
    alert("Server error. Please try again later.");
  }
}

async function submitContact(e) {
  e.preventDefault();
  const formData = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    subject: document.getElementById("subject").value,
    message: document.getElementById("message").value
  };

  try {
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      alert("Message sent to administration!");
      document.getElementById("contact-form").reset();
    } else {
      alert("Error sending message.");
    }
  } catch (err) {
    alert("Server error. Try again later.");
  }
}