document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('admissionForm');
    const dbList = document.getElementById('dbList');
    
    // Inject Toast Container into DOM automatically
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toastBox';
    document.body.appendChild(toastContainer);

    // Custom Toast Notification System
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span style="margin-right:10px">${type === 'success' ? '✅' : '⚠️'}</span> ${message}`;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastExit 0.4s ease forwards';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // Fetch and Render Data with Staggered Animations
    async function loadAdmissions() {
        if (!dbList) return;
        
        dbList.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">Fetching secure records...</p>`;
        
        try {
            const res = await fetch('/api/students');
            const data = await res.json();
            
            dbList.innerHTML = '';
            if (data.length === 0) {
                dbList.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted); border: 1px dashed rgba(255,255,255,0.1); border-radius: 16px;">
                    <h2 style="font-size: 2rem; margin-bottom: 10px;">🎨</h2>
                    <p>Studio canvas is empty. Register an artist to begin.</p>
                </div>`;
                return;
            }

            // Staggered rendering for visual flare
            data.forEach((student, index) => {
                const li = document.createElement('li');
                li.className = 'student-item';
                li.id = `student-${student.id}`;
                li.style.animationDelay = `${index * 0.1}s`; // Stagger effect
                
                li.innerHTML = `
                    <div class="student-info">
                        <h4>${student.name}</h4>
                        <p>
                            <span class="badge">${student.course}</span> &nbsp;
                            ID: MSSK-${student.id}
                        </p>
                    </div>
                    <button class="btn-delete" onclick="deleteRecord('${student.id}')">Erase</button>
                `;
                dbList.appendChild(li);
            });
        } catch (error) {
            console.error("Database Error:", error);
            showToast("Failed to connect to database.", "error");
        }
    }

    // Handle Form Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('studentName');
            const courseInput = document.getElementById('courseName');
            const btn = form.querySelector('button');
            
            // Button loading state
            const originalText = btn.innerHTML;
            btn.innerHTML = "Registering...";
            btn.style.opacity = "0.7";
            btn.style.pointerEvents = "none";
            
            try {
                await fetch('/api/students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: nameInput.value, course: courseInput.value })
                });
                
                form.reset();
                showToast("Artist successfully registered!");
                loadAdmissions();
            } catch (error) {
                showToast("Registration failed.", "error");
            } finally {
                // Restore button
                btn.innerHTML = originalText;
                btn.style.opacity = "1";
                btn.style.pointerEvents = "auto";
            }
        });
    }

    // Global Delete Function (with exit animation)
    window.deleteRecord = async (id) => {
        const item = document.getElementById(`student-${id}`);
        
        // Visual exit animation before API call
        item.style.transition = "all 0.4s ease";
        item.style.transform = "translateX(50px)";
        item.style.opacity = "0";
        
        try {
            await fetch(`/api/students/${id}`, { method: 'DELETE' });
            showToast("Record erased from database.", "error"); // Red toast for deletion
            
            // Wait for animation to finish before removing from DOM
            setTimeout(() => {
                item.remove();
                if (dbList.children.length === 0) loadAdmissions(); // Show empty state if list is empty
            }, 400);
            
        } catch (error) {
            showToast("Failed to erase record.", "error");
            item.style.transform = "translateX(0)";
            item.style.opacity = "1";
        }
    };

    // Initialize Dashboard
    loadAdmissions();
});