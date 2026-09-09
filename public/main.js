/**
 * Meera Smriti Sishu Ankan Siksha Kendra
 * Peak Portal Experience & Interactive Controller
 * Author: Lead Web Engineering Team
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const loginModal = document.getElementById('loginModal');
    const openLoginModalBtn = document.getElementById('openLoginModalBtn');
    const heroLoginBtn = document.getElementById('heroLoginBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    
    const roleBtns = document.querySelectorAll('.role-btn');
    const tabPasswordBtn = document.getElementById('tabPasswordBtn');
    const tabOtpBtn = document.getElementById('tabOtpBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    
    const passwordLoginForm = document.getElementById('passwordLoginForm');
    const otpLoginForm = document.getElementById('otpLoginForm');
    
    const loginPasswordInput = document.getElementById('loginPassword');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const pwdMeterFill = document.getElementById('pwdMeterFill');
    
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const otpInputGroup = document.getElementById('otpInputGroup');
    const timerCountdown = document.getElementById('timerCountdown');
    
    const biometricAuthBtn = document.getElementById('biometricAuthBtn');
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    
    const authView = document.getElementById('authView');
    const dashboardView = document.getElementById('dashboardView');
    const logoutBtn = document.getElementById('logoutBtn');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userRoleDisplay = document.getElementById('userRoleDisplay');
    const userAvatar = document.getElementById('userAvatar');
    const forgotPwLink = document.getElementById('forgotPwLink');
    const btnUploadArt = document.getElementById('btnUploadArt');

    let selectedRole = 'student';
    let otpTimerInterval = null;

    // --- Modal Controls ---
    const openModal = () => {
        loginModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        checkExistingSession();
    };

    const closeModal = () => {
        loginModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    };

    if (openLoginModalBtn) openLoginModalBtn.addEventListener('click', openModal);
    if (heroLoginBtn) heroLoginBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) closeModal();
    });

    // --- Toast Notification System ---
    const showToast = (message, type = 'info') => {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';
        if (type === 'warning') icon = 'fa-bell';

        toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    };

    // --- Role Switcher ---
    roleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            roleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedRole = btn.getAttribute('data-role');
            showToast(`Role selected: ${selectedRole.toUpperCase()}`, 'info');
        });
    });

    // --- Tab Switching ---
    tabPasswordBtn.addEventListener('click', () => {
        tabPasswordBtn.classList.add('active');
        tabOtpBtn.classList.remove('active');
        tabRegisterBtn.classList.remove('active');
        passwordLoginForm.style.display = 'block';
        otpLoginForm.style.display = 'none';
    });

    tabOtpBtn.addEventListener('click', () => {
        tabOtpBtn.classList.add('active');
        tabPasswordBtn.classList.remove('active');
        tabRegisterBtn.classList.remove('active');
        passwordLoginForm.style.display = 'none';
        otpLoginForm.style.display = 'block';
    });

    tabRegisterBtn.addEventListener('click', () => {
        showToast('Redirecting to New Admission Inquiry...', 'info');
        window.open('https://wa.me/917942593454?text=Hello%20Meera%20Smriti%20Team,%20I%20want%20to%20register%20a%20new%20student.', '_blank');
    });

    // --- Password Visibility Toggle & Live Strength Meter ---
    if (togglePasswordBtn && loginPasswordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPw = loginPasswordInput.type === 'password';
            loginPasswordInput.type = isPw ? 'text' : 'password';
            togglePasswordBtn.className = isPw ? 'fas fa-eye-slash toggle-pw' : 'fas fa-eye toggle-pw';
        });

        loginPasswordInput.addEventListener('input', (e) => {
            const val = e.target.value;
            let score = 0;
            if (val.length >= 6) score += 25;
            if (val.length >= 10) score += 25;
            if (/[A-Z]/.test(val)) score += 25;
            if (/[0-9!@#$%^&*]/.test(val)) score += 25;

            pwdMeterFill.style.width = `${score}%`;
            if (score <= 25) pwdMeterFill.style.background = '#ef4444';
            else if (score <= 50) pwdMeterFill.style.background = '#f59e0b';
            else if (score <= 75) pwdMeterFill.style.background = '#3b82f6';
            else pwdMeterFill.style.background = '#10b981';
        });
    }

    // --- Password Login Submit ---
    passwordLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('loginUser').value.trim();
        const pw = loginPasswordInput.value.trim();

        if (!user || !pw) {
            showToast('Please fill in all credentials.', 'error');
            return;
        }

        showToast('Authenticating with Bangiya Sangeet Parishad Database...', 'info');

        setTimeout(() => {
            const sessionData = {
                name: user.includes('@') ? user.split('@')[0] : 'Chanchal Ghosh',
                role: selectedRole.toUpperCase(),
                branch: 'Rishra Head Branch',
                isLoggedIn: true
            };
            localStorage.setItem('meera_smriti_session', JSON.stringify(sessionData));
            renderDashboard(sessionData);
            showToast('Authentication successful! Welcome to the portal.', 'success');
        }, 1200);
    });

    // --- OTP Simulation Flow ---
    sendOtpBtn.addEventListener('click', () => {
        const phone = document.getElementById('otpPhone').value.trim();
        if (phone.length < 10) {
            showToast('Please enter a valid 10-digit WhatsApp number.', 'warning');
            return;
        }

        if (sendOtpBtn.innerText.includes('Send OTP')) {
            showToast(`Generating OTP code to WhatsApp ${phone}...`, 'info');
            sendOtpBtn.innerText = 'Verify & Access Portal';
            otpInputGroup.style.display = 'block';

            let count = 60;
            clearInterval(otpTimerInterval);
            otpTimerInterval = setInterval(() => {
                count--;
                timerCountdown.innerText = count;
                if (count <= 0) {
                    clearInterval(otpTimerInterval);
                    timerCountdown.innerText = '0';
                    showToast('OTP expired. You can request a new code.', 'warning');
                }
            }, 1000);
        } else {
            const code = document.getElementById('otpCode').value.trim();
            if (code.length < 4) {
                showToast('Enter valid OTP code.', 'error');
                return;
            }

            const sessionData = {
                name: 'Verified Student (' + phone.slice(-4) + ')',
                role: selectedRole.toUpperCase(),
                branch: 'Uttarpara Branch',
                isLoggedIn: true
            };
            localStorage.setItem('meera_smriti_session', JSON.stringify(sessionData));
            renderDashboard(sessionData);
            showToast('WhatsApp OTP Verified!', 'success');
        }
    });

    // --- Biometric Passkey Simulation ---
    biometricAuthBtn.addEventListener('click', () => {
        showToast('Initiating Fingerprint / Passkey scan...', 'info');
        setTimeout(() => {
            const sessionData = {
                name: 'Chanchal Ghosh (Master Passkey)',
                role: 'ADMIN / INSTRUCTOR',
                branch: 'All Branches',
                isLoggedIn: true
            };
            localStorage.setItem('meera_smriti_session', JSON.stringify(sessionData));
            renderDashboard(sessionData);
            showToast('Biometric Fingerprint Matched!', 'success');
        }, 1500);
    });

    // --- Google OAuth Simulation ---
    googleAuthBtn.addEventListener('click', () => {
        showToast('Connecting with Google Account...', 'info');
        setTimeout(() => {
            const sessionData = {
                name: 'Ankan Scholar',
                role: 'STUDENT',
                branch: 'Konnagar Center',
                isLoggedIn: true
            };
            localStorage.setItem('meera_smriti_session', JSON.stringify(sessionData));
            renderDashboard(sessionData);
            showToast('Signed in via Google account!', 'success');
        }, 1200);
    });

    // --- Forgot Password Action ---
    forgotPwLink.addEventListener('click', (e) => {
        e.preventDefault();
        const user = document.getElementById('loginUser').value;
        if (!user) {
            showToast('Enter your Student ID / Email first.', 'warning');
        } else {
            showToast(`Password reset link sent to ${user}! Check inbox/WhatsApp.`, 'success');
        }
    });

    // --- Submit Artwork Action ---
    if (btnUploadArt) {
        btnUploadArt.addEventListener('click', () => {
            showToast('Opening Bangiya Sangeet Parishad Artwork Submission Form...', 'info');
            setTimeout(() => {
                alert('Artwork Submission Module:\nPlease select your image file (Max 10MB) for annual exhibition review.');
            }, 500);
        });
    }

    // --- Session Renderer ---
    const renderDashboard = (data) => {
        authView.style.display = 'none';
        dashboardView.style.display = 'block';

        userNameDisplay.innerText = data.name;
        userRoleDisplay.innerText = `${data.role} • ${data.branch}`;
        userAvatar.innerText = data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const checkExistingSession = () => {
        const saved = localStorage.getItem('meera_smriti_session');
        if (saved) {
            try {
                const session = JSON.parse(saved);
                if (session.isLoggedIn) {
                    renderDashboard(session);
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    // --- Logout Action ---
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('meera_smriti_session');
        dashboardView.style.display = 'none';
        authView.style.display = 'block';
        showToast('Logged out safely.', 'info');
    });
});