const token = localStorage.getItem('portal_token');
if (!token) window.location.href = 'login.html'; // Kick out intruders instantly

const apiHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

function showToast(msg) {
    const box = document.getElementById('toastBox') || (() => { const b = document.createElement('div'); b.id = 'toastBox'; document.body.appendChild(b); return b; })();
    const toast = document.createElement('div'); toast.className = 'toast'; toast.innerText = msg;
    box.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

async function loadDashboard() {
    try {
        // Load Stats
        const statsRes = await fetch('/api/stats', { headers: apiHeaders });
        if (statsRes.status === 401 || statsRes.status === 403) return window.location.href = 'login.html';
        const stats = await statsRes.json();
        
        document.getElementById('statTraffic').innerText = stats.traffic;
        document.getElementById('statAdmissions').innerText = stats.admissions;
        document.getElementById('statUptime').innerText = stats.uptime;

        // Load Students
        const stdRes = await fetch('/api/students', { headers: apiHeaders });
        const students = await stdRes.json();
        
        const dbList = document.getElementById('dbList');
        dbList.innerHTML = students.length ? '' : '<p style="color: var(--text-muted); text-align: center;">No artists registered yet.</p>';
        
        students.forEach(s => {
            dbList.innerHTML += `
                <li class="list-item" id="student-${s.id}">
                    <div>
                        <h4 style="margin-bottom: 4px;">${s.name}</h4>
                        <span class="badge">${s.course}</span> 
                        <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 10px;">ID: MS-${s.id}</span>
                    </div>
                    <button class="btn-icon" onclick="deleteStudent(${s.id})" style="color: var(--danger); border: 1px solid var(--border);">Delete</button>
                </li>`;
        });
    } catch (err) {
        console.error(err);
    }
}

window.deleteStudent = async (id) => {
    if(!confirm("Are you sure you want to delete this student?")) return;
    await fetch(`/api/students/${id}`, { method: 'DELETE', headers: apiHeaders });
    document.getElementById(`student-${id}`).remove(); 
    showToast("Student Removed");
    loadDashboard(); // refresh stats
};

window.logout = () => { localStorage.removeItem('portal_token'); window.location.href = 'login.html'; };

// Load data immediately and refresh every 10 seconds
loadDashboard();
setInterval(loadDashboard, 10000);