function showToast(msg) {
    const box = document.getElementById('toastBox') || (() => { const b = document.createElement('div'); b.id = 'toastBox'; document.body.appendChild(b); return b; })();
    const toast = document.createElement('div'); toast.className = 'toast'; toast.innerText = msg;
    box.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// Handle Public Registrations on index.html
const publicForm = document.getElementById('publicAdmissionForm');
if (publicForm) {
    publicForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = publicForm.querySelector('button');
        submitBtn.innerText = "Registering...";
        
        await fetch('/api/students', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ name: publicForm.name.value, course: publicForm.course.value }) 
        });
        
        publicForm.reset(); 
        submitBtn.innerText = "Submit Registration";
        showToast("Registration Successful! We will contact you soon.");
    });
}

// Handle Admin Login on login.html
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await fetch('/api/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: loginForm.username.value, password: loginForm.password.value })
        });
        const data = await res.json();
        if (data.token) {
            localStorage.setItem('portal_token', data.token);
            window.location.href = 'dashboard.html';
        } else { showToast("Invalid Credentials"); }
    });
}