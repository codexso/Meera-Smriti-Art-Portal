document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('admissionForm');
    const dbList = document.getElementById('dbList');
    
    // Fetch and Render Data
    async function loadAdmissions() {
        dbList.innerHTML = `<p style="color: #a4b0be; text-align: center;">Fetching secure records...</p>`;
        try {
            const res = await fetch('/api/students');
            const data = await res.json();
            
            dbList.innerHTML = '';
            if (data.length === 0) {
                dbList.innerHTML = `<p style="color: #a4b0be; text-align: center;">Studio is empty. Register a student.</p>`;
                return;
            }

            data.forEach((student) => {
                dbList.innerHTML += `
                    <li class="student-item" id="student-${student.id}">
                        <div class="student-info">
                            <h4>${student.name}</h4>
                            <p>Course: ${student.course} | System ID: MSSK-${student.id}</p>
                        </div>
                        <button class="btn-delete" onclick="deleteRecord('${student.id}')">Erase</button>
                    </li>
                `;
            });
        } catch (error) {
            console.error("Database connection error:", error);
        }
    }

    // Handle Form Submit
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('studentName').value;
            const course = document.getElementById('courseName').value;
            const btn = form.querySelector('button');
            
            btn.innerHTML = "Registering...";
            
            await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, course })
            });
            
            form.reset();
            btn.innerHTML = "Register Student";
            loadAdmissions();
        });
    }

    // Expose delete function globally for the inline onclick handler
    window.deleteRecord = async (id) => {
        document.getElementById(`student-${id}`).style.opacity = "0.3"; // Visual feedback
        await fetch(`/api/students/${id}`, { method: 'DELETE' });
        loadAdmissions();
    };

    // Load data on start if we are on the dashboard
    if (dbList) loadAdmissions();
});