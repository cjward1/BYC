const API_BASE = '/api';

let currentUser = null;
let currentSeason = null;

// Check if already logged in
async function checkAuth() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include'
    });

    if (response.ok) {
      currentUser = await response.json();
      if (currentUser.role !== 'member') {
        showError('Access denied. Members only.');
        return false;
      }
      await loadMemberPortal();
      return true;
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }
  return false;
}

// Login handler
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: formData.get('username'),
        password: formData.get('password')
      })
    });

    const data = await response.json();

    if (response.ok) {
      currentUser = data.user;
      if (currentUser.role !== 'member') {
        showError('Access denied. Members only.');
        return;
      }
      await loadMemberPortal();
    } else {
      showError(data.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('Login failed. Please try again.');
  }
});

async function loadMemberPortal() {
  // Fetch current season
  try {
    const response = await fetch(`${API_BASE}/seasons/current`, {
      credentials: 'include'
    });

    if (response.ok) {
      currentSeason = await response.json();
    }
  } catch (error) {
    console.error('Error loading season:', error);
  }

  renderMemberPortal();
}

function renderMemberPortal() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="max-width: 900px; margin: 0 auto; padding: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h1>Member Portal</h1>
        <button onclick="logout()" class="secondary">Logout</button>
      </div>

      <div class="user-info">
        <strong>${currentUser.fullName}</strong> (Seniority #${currentUser.seniorityNumber})
        <br />
        <small>${currentUser.email}</small>
      </div>

      ${currentSeason ? renderSeasonInfo() : '<p>No active season found.</p>'}

      <div id="application-section">
        ${renderApplicationSection()}
      </div>

      <div id="assignment-section" style="margin-top: 2rem;">
        ${renderAssignmentSection()}
      </div>
    </div>
  `;

  attachApplicationFormHandler();
  loadMyApplication();
  loadMyAssignment();
}

function renderSeasonInfo() {
  const statusText = {
    'planning': 'Planning',
    'accepting_applications': 'Accepting Applications',
    'applications_closed': 'Applications Closed',
    'bumping_in_progress': 'Bumping Party In Progress',
    'completed': 'Completed'
  };

  return `
    <section>
      <h2>${currentSeason.year} Season</h2>
      <p>Status: <strong>${statusText[currentSeason.status] || currentSeason.status}</strong></p>
      <p>Application Period: ${formatDate(currentSeason.application_start_date)} - ${formatDate(currentSeason.application_end_date)}</p>
      ${currentSeason.bumping_date ? `<p>Bumping Party: ${formatDate(currentSeason.bumping_date)}</p>` : ''}
    </section>
  `;
}

function renderApplicationSection() {
  if (!currentSeason) {
    return '<p>No active season.</p>';
  }

  const isAccepting = currentSeason.status === 'accepting_applications';

  return `
    <section>
      <h2>Dock Application</h2>
      <div id="message-container-app"></div>
      <div id="current-application"></div>

      ${isAccepting ? `
        <div id="application-form-container">
          <h3>Submit Your Application</h3>
          <form id="application-form">
            <label>
              Application Category
              <select name="applicationCategory" required>
                <option value="renewal_same">Renewal: same or smaller boat</option>
                <option value="renewal_larger">Renewal: larger boat</option>
                <option value="new">New application</option>
              </select>
            </label>
            <label>
              Boat Name
              <input name="boatName" required />
            </label>
            <label>
              Boat Length (ft)
              <input name="boatLength" type="number" min="1" step="1" required />
            </label>
            <label>
              Boat Type
              <input name="boatType" required />
            </label>
            <label>
              Registration Number
              <input name="boatRegistration" required />
            </label>
            <label>
              Insurance Coverage (USD)
              <input name="insuranceCoverage" type="number" min="500000" required />
            </label>
            <label>
              Insurance Notes
              <textarea name="insuranceNotes" rows="3" placeholder="Policy provider, expiration, etc." required></textarea>
            </label>
            <button type="submit">Submit Application</button>
          </form>
        </div>
      ` : '<p>Applications are not being accepted at this time.</p>'}
    </section>
  `;
}

function renderAssignmentSection() {
  return `
    <section>
      <h2>My Dock Assignment</h2>
      <div id="assignment-info">
        <p>Loading assignment information...</p>
      </div>
    </section>
  `;
}

async function loadMyApplication() {
  if (!currentSeason) return;

  try {
    const response = await fetch(`${API_BASE}/applications/my-application`, {
      credentials: 'include'
    });

    if (response.ok) {
      const application = await response.json();
      displayApplication(application);
    } else if (response.status === 404) {
      document.getElementById('current-application').innerHTML = '<p>You have not submitted an application yet.</p>';
    }
  } catch (error) {
    console.error('Error loading application:', error);
  }
}

function displayApplication(app) {
  const statusClass = `status-${app.status}`;
  const statusText = {
    'pending': 'Pending Review',
    'approved': 'Approved',
    'assigned': 'Assigned',
    'waitlist': 'Waitlist',
    'rejected': 'Rejected'
  };

  document.getElementById('current-application').innerHTML = `
    <div style="background: #f9f9f9; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
      <h3>Your Current Application</h3>
      <p><strong>Status:</strong> <span class="application-status ${statusClass}">${statusText[app.status] || app.status}</span></p>
      <p><strong>Category:</strong> ${formatCategory(app.application_category)}</p>
      <p><strong>Boat:</strong> ${app.boat_name} (${app.boat_length} ft ${app.boat_type})</p>
      <p><strong>Registration:</strong> ${app.boat_registration}</p>
      <p><strong>Insurance:</strong> $${Number(app.insurance_coverage).toLocaleString()}</p>
      <p><strong>Submitted:</strong> ${formatDate(app.submitted_at)}</p>
    </div>
  `;

  // Pre-fill form if editing
  if (currentSeason.status === 'accepting_applications') {
    const form = document.getElementById('application-form');
    if (form) {
      form.querySelector('[name="applicationCategory"]').value = app.application_category;
      form.querySelector('[name="boatName"]').value = app.boat_name;
      form.querySelector('[name="boatLength"]').value = app.boat_length;
      form.querySelector('[name="boatType"]').value = app.boat_type;
      form.querySelector('[name="boatRegistration"]').value = app.boat_registration;
      form.querySelector('[name="insuranceCoverage"]').value = app.insurance_coverage;
      form.querySelector('[name="insuranceNotes"]').value = app.insurance_notes || '';
    }
  }
}

async function loadMyAssignment() {
  if (!currentSeason) return;

  try {
    const response = await fetch(`${API_BASE}/dock-planning/bumping-state`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      const assignments = data.assignments || [];
      const myAssignment = assignments.find(a => a.user_id === currentUser.id);

      if (myAssignment) {
        displayAssignment(myAssignment);
      } else {
        document.getElementById('assignment-info').innerHTML = '<p>No dock assignment yet.</p>';
      }
    } else {
      document.getElementById('assignment-info').innerHTML = '<p>Bumping party has not started.</p>';
    }
  } catch (error) {
    console.error('Error loading assignment:', error);
    document.getElementById('assignment-info').innerHTML = '<p>No assignment information available.</p>';
  }
}

function displayAssignment(assignment) {
  const segmentNames = {
    'small': 'Small Dock (Right Side)',
    'mainInsideSouth': 'South Inside',
    'mainInsideNorth': 'North Inside',
    'mainOutsideUpper': 'Main Outside (Upper)',
    'mainOutsideLower': 'Main Outside (Lower)'
  };

  document.getElementById('assignment-info').innerHTML = `
    <div style="background: #e8f5e9; padding: 1rem; border-radius: 4px;">
      <p><strong>Dock Location:</strong> ${segmentNames[assignment.segment_name] || assignment.segment_name}</p>
      <p><strong>Position:</strong> ${assignment.position} ft</p>
      <p><strong>Boat Length:</strong> ${assignment.boat_length} ft</p>
      <p><strong>Assigned:</strong> ${formatDate(assignment.assigned_at)}</p>
      ${assignment.locked ? '<p><span class="application-status status-assigned">Locked</span></p>' : ''}
    </div>
  `;
}

function attachApplicationFormHandler() {
  const form = document.getElementById('application-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    const insurance = Number(formData.get('insuranceCoverage'));
    if (insurance < 500000) {
      showErrorApp('Insurance coverage must be at least $500,000 liability.');
      return;
    }

    const boatLength = Number(formData.get('boatLength'));
    if (!Number.isInteger(boatLength)) {
      showErrorApp('Boat length must be a whole number of feet.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/applications/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          applicationCategory: formData.get('applicationCategory'),
          boatName: formData.get('boatName'),
          boatLength: boatLength,
          boatType: formData.get('boatType'),
          boatRegistration: formData.get('boatRegistration'),
          insuranceCoverage: insurance,
          insuranceNotes: formData.get('insuranceNotes')
        })
      });

      if (response.ok) {
        const application = await response.json();
        showSuccessApp('Application submitted successfully!');
        displayApplication(application);
      } else {
        const data = await response.json();
        showErrorApp(data.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Application submission error:', error);
      showErrorApp('Failed to submit application. Please try again.');
    }
  });
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
}

function formatCategory(category) {
  const labels = {
    'renewal_same': 'Renewal: same or smaller boat',
    'renewal_larger': 'Renewal: larger boat',
    'new': 'New application'
  };
  return labels[category] || category;
}

function showError(message) {
  const container = document.getElementById('message-container');
  if (container) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
  }
}

function showErrorApp(message) {
  const container = document.getElementById('message-container-app');
  if (container) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
    setTimeout(() => { container.innerHTML = ''; }, 5000);
  }
}

function showSuccessApp(message) {
  const container = document.getElementById('message-container-app');
  if (container) {
    container.innerHTML = `<div class="success-message">${message}</div>`;
    setTimeout(() => { container.innerHTML = ''; }, 5000);
  }
}

window.logout = async function() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
  currentUser = null;
  window.location.reload();
};

// Check auth on load
checkAuth();
