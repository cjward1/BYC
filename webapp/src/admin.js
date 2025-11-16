const API_BASE = '/api';

let currentUser = null;
let currentSeason = null;
let applications = [];
let optimalPlan = null;
let bumpingState = null;
let currentTab = 'applications';

// Check if already logged in
async function checkAuth() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include'
    });

    if (response.ok) {
      currentUser = await response.json();
      if (currentUser.role !== 'rear_commodore') {
        showError('Access denied. Rear Commodore access only.');
        return false;
      }
      await loadAdminPortal();
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
      if (currentUser.role !== 'rear_commodore') {
        showError('Access denied. Rear Commodore access only.');
        return;
      }
      await loadAdminPortal();
    } else {
      showError(data.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('Login failed. Please try again.');
  }
});

async function loadAdminPortal() {
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

  await loadApplications();
  await loadOptimalPlan();
  await loadBumpingState();
  renderAdminPortal();
}

async function loadApplications() {
  if (!currentSeason) return;

  try {
    const response = await fetch(`${API_BASE}/applications/season/${currentSeason.id}`, {
      credentials: 'include'
    });

    if (response.ok) {
      applications = await response.json();
    }
  } catch (error) {
    console.error('Error loading applications:', error);
  }
}

async function loadOptimalPlan() {
  if (!currentSeason) return;

  try {
    const response = await fetch(`${API_BASE}/dock-planning/plan`, {
      credentials: 'include'
    });

    if (response.ok) {
      optimalPlan = await response.json();
    }
  } catch (error) {
    // Plan might not exist yet
    optimalPlan = null;
  }
}

async function loadBumpingState() {
  if (!currentSeason) return;

  try {
    const response = await fetch(`${API_BASE}/dock-planning/bumping-state`, {
      credentials: 'include'
    });

    if (response.ok) {
      bumpingState = await response.json();
    }
  } catch (error) {
    // Bumping might not be started
    bumpingState = null;
  }
}

function renderAdminPortal() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h1>Rear Commodore Portal</h1>
        <button onclick="logout()" class="secondary">Logout</button>
      </div>

      ${currentSeason ? renderSeasonInfo() : '<p>No active season found.</p>'}

      <div class="tabs">
        <button class="tab ${currentTab === 'applications' ? 'active' : ''}" onclick="switchTab('applications')">Applications</button>
        <button class="tab ${currentTab === 'planning' ? 'active' : ''}" onclick="switchTab('planning')">Dock Planning</button>
        <button class="tab ${currentTab === 'bumping' ? 'active' : ''}" onclick="switchTab('bumping')">Bumping Party</button>
        <button class="tab ${currentTab === 'season' ? 'active' : ''}" onclick="switchTab('season')">Season Management</button>
      </div>

      <div id="message-area"></div>

      <div class="tab-content ${currentTab === 'applications' ? 'active' : ''}" id="tab-applications">
        ${renderApplicationsTab()}
      </div>

      <div class="tab-content ${currentTab === 'planning' ? 'active' : ''}" id="tab-planning">
        ${renderPlanningTab()}
      </div>

      <div class="tab-content ${currentTab === 'bumping' ? 'active' : ''}" id="tab-bumping">
        ${renderBumpingTab()}
      </div>

      <div class="tab-content ${currentTab === 'season' ? 'active' : ''}" id="tab-season">
        ${renderSeasonTab()}
      </div>
    </div>
  `;
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
    <div style="background: #f5f5f5; padding: 1rem; border-radius: 4px; margin-bottom: 2rem;">
      <h2>${currentSeason.year} Season - ${statusText[currentSeason.status] || currentSeason.status}</h2>
      <p>Application Period: ${formatDate(currentSeason.application_start_date)} - ${formatDate(currentSeason.application_end_date)}</p>
    </div>
  `;
}

function renderApplicationsTab() {
  const stats = calculateApplicationStats();

  return `
    <h2>Dock Applications</h2>

    <div class="stat-cards">
      <div class="stat-card">
        <h3>${stats.total}</h3>
        <p>Total Applications</p>
      </div>
      <div class="stat-card">
        <h3>${stats.pending}</h3>
        <p>Pending</p>
      </div>
      <div class="stat-card">
        <h3>${stats.approved}</h3>
        <p>Approved</p>
      </div>
      <div class="stat-card">
        <h3>${stats.waitlist}</h3>
        <p>Waitlist</p>
      </div>
    </div>

    ${applications.length > 0 ? renderApplicationsTable() : '<p>No applications submitted yet.</p>'}
  `;
}

function renderApplicationsTable() {
  const rows = applications.map(app => `
    <tr>
      <td>${app.member_name}</td>
      <td>${app.seniority_number}</td>
      <td>${formatCategory(app.application_category)}</td>
      <td>${app.boat_name}</td>
      <td>${app.boat_length} ft</td>
      <td>${app.boat_type}</td>
      <td>${app.boat_registration}</td>
      <td>$${Number(app.insurance_coverage).toLocaleString()}</td>
      <td><span class="application-status status-${app.status}">${app.status}</span></td>
    </tr>
  `).join('');

  return `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Seniority</th>
            <th>Category</th>
            <th>Boat Name</th>
            <th>Length</th>
            <th>Type</th>
            <th>Registration</th>
            <th>Insurance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderPlanningTab() {
  if (!applications.length) {
    return '<p>No applications to plan. Wait for members to submit applications.</p>';
  }

  if (!optimalPlan) {
    return `
      <h2>Compute Optimal Dock Plan</h2>
      <p>Ready to compute the optimal dock allocation for ${applications.length} applications.</p>
      <button onclick="computePlan()">Compute Optimal Plan</button>
    `;
  }

  const plan = optimalPlan.plan_data;

  return `
    <h2>Optimal Dock Plan</h2>

    <div class="stat-cards">
      <div class="stat-card">
        <h3>${plan.maxBoats}</h3>
        <p>Boats Accommodated</p>
      </div>
      <div class="stat-card">
        <h3>${plan.assigned.length}</h3>
        <p>Assigned</p>
      </div>
      <div class="stat-card">
        <h3>${plan.waitlist.length}</h3>
        <p>Waitlist</p>
      </div>
      <div class="stat-card">
        <h3>${plan.pumpOutStart}' - ${plan.pumpOutStart + 60}'</h3>
        <p>Pump-out Zone</p>
      </div>
    </div>

    <h3>Assigned Boats</h3>
    ${renderAssignedBoats(plan)}

    ${plan.waitlist.length > 0 ? `
      <h3 style="margin-top: 2rem;">Waitlist</h3>
      ${renderWaitlist(plan)}
    ` : ''}

    <div style="margin-top: 2rem;">
      <button onclick="computePlan()">Recompute Plan</button>
    </div>
  `;
}

function renderAssignedBoats(plan) {
  const segmentNames = {
    'small': 'Small Dock (Right Side)',
    'mainInsideSouth': 'South Inside',
    'mainInsideNorth': 'North Inside',
    'mainOutsideUpper': 'Main Outside (Upper)',
    'mainOutsideLower': 'Main Outside (Lower)'
  };

  const rows = plan.assigned.map(app => {
    const assignment = plan.assignments[app.id];
    return `
      <tr>
        <td>${app.member_name}</td>
        <td>${app.boat_name}</td>
        <td>${app.boat_length} ft</td>
        <td>${segmentNames[assignment.segmentId] || assignment.segmentId}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Boat</th>
            <th>Length</th>
            <th>Segment</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderWaitlist(plan) {
  const rows = plan.waitlist.map(app => `
    <tr>
      <td>${app.member_name}</td>
      <td>${app.boat_name}</td>
      <td>${app.boat_length} ft</td>
      <td>${formatCategory(app.application_category)}</td>
    </tr>
  `).join('');

  return `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Boat</th>
            <th>Length</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderBumpingTab() {
  if (!optimalPlan) {
    return '<p>Please compute the optimal plan first.</p>';
  }

  if (!bumpingState || !bumpingState.bumpingState) {
    return `
      <h2>Start Bumping Party</h2>
      <p>The optimal plan has been computed. Ready to start the bumping party process.</p>
      <p>During the bumping party, members will select their dock locations in seniority order.</p>
      <button onclick="startBumping()">Start Bumping Party</button>
    `;
  }

  const plan = optimalPlan.plan_data;
  const state = bumpingState.bumpingState;
  const assignments = bumpingState.assignments || [];

  if (state.completed_at) {
    return `
      <h2>Bumping Party Complete</h2>
      <p>The bumping party was completed on ${formatDate(state.completed_at)}.</p>
      ${renderFinalAssignments(assignments)}
    `;
  }

  const currentIndex = state.current_index;
  const queue = plan.assigned;
  const currentMember = queue[currentIndex];

  return `
    <h2>Bumping Party In Progress</h2>
    <p>Members are selecting their dock locations in seniority order.</p>

    <div style="background: #fff3cd; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
      <h3>Current Turn: ${currentMember.member_name} (Seniority #${currentMember.seniority_number})</h3>
      <p>Boat: ${currentMember.boat_name} (${currentMember.boat_length} ft)</p>
    </div>

    <div style="margin: 2rem 0;">
      <h3>Select Dock Location</h3>
      <form onsubmit="selectDock(event, ${currentMember.id})">
        <label>
          Dock Segment
          <select name="segment" required>
            <option value="small">Small Dock (Right Side)</option>
            <option value="mainInsideSouth">South Inside</option>
            <option value="mainInsideNorth">North Inside</option>
            <option value="mainOutsideUpper">Main Outside (Upper)</option>
            <option value="mainOutsideLower">Main Outside (Lower)</option>
          </select>
        </label>
        <label>
          Position (feet)
          <input type="number" name="position" min="0" step="0.1" required />
        </label>
        <button type="submit">Confirm Selection</button>
      </form>
    </div>

    <h3>Progress: ${currentIndex} / ${queue.length} members</h3>
    ${renderBumpingProgress(queue, currentIndex, assignments)}
  `;
}

function renderBumpingProgress(queue, currentIndex, assignments) {
  const rows = queue.map((app, idx) => {
    const assignment = assignments.find(a => a.application_id === app.id);
    const status = idx < currentIndex ? 'Complete' : idx === currentIndex ? 'Current' : 'Waiting';

    return `
      <tr style="${idx === currentIndex ? 'background: #fff3cd;' : ''}">
        <td>${idx + 1}</td>
        <td>${app.member_name}</td>
        <td>${app.seniority_number}</td>
        <td>${app.boat_name}</td>
        <td>${app.boat_length} ft</td>
        <td>${status}</td>
        <td>${assignment ? formatSegment(assignment.segment_name) + ' @ ' + assignment.position + 'ft' : '-'}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Member</th>
            <th>Seniority</th>
            <th>Boat</th>
            <th>Length</th>
            <th>Status</th>
            <th>Assignment</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderFinalAssignments(assignments) {
  const rows = assignments.map(a => `
    <tr>
      <td>${a.full_name}</td>
      <td>${a.seniority_number}</td>
      <td>${a.boat_name}</td>
      <td>${a.boat_length} ft</td>
      <td>${formatSegment(a.segment_name)}</td>
      <td>${a.position} ft</td>
    </tr>
  `).join('');

  return `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Seniority</th>
            <th>Boat</th>
            <th>Length</th>
            <th>Dock Segment</th>
            <th>Position</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderSeasonTab() {
  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'accepting_applications', label: 'Accepting Applications' },
    { value: 'applications_closed', label: 'Applications Closed' },
    { value: 'bumping_in_progress', label: 'Bumping Party In Progress' },
    { value: 'completed', label: 'Completed' }
  ];

  return `
    <h2>Season Management</h2>
    ${currentSeason ? `
      <div style="background: white; padding: 1.5rem; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h3>${currentSeason.year} Season</h3>
        <form onsubmit="updateSeasonStatus(event)">
          <label>
            Season Status
            <select name="status" required>
              ${statusOptions.map(opt => `
                <option value="${opt.value}" ${currentSeason.status === opt.value ? 'selected' : ''}>${opt.label}</option>
              `).join('')}
            </select>
          </label>
          <button type="submit">Update Status</button>
        </form>
      </div>
    ` : '<p>No active season found.</p>'}
  `;
}

function calculateApplicationStats() {
  return {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    waitlist: applications.filter(a => a.status === 'waitlist').length
  };
}

window.switchTab = function(tab) {
  currentTab = tab;
  renderAdminPortal();
};

window.computePlan = async function() {
  try {
    const response = await fetch(`${API_BASE}/dock-planning/compute-plan`, {
      method: 'POST',
      credentials: 'include'
    });

    if (response.ok) {
      await loadOptimalPlan();
      await loadApplications();
      showSuccess('Optimal plan computed successfully!');
      currentTab = 'planning';
      renderAdminPortal();
    } else {
      const data = await response.json();
      showError(data.error || 'Failed to compute plan');
    }
  } catch (error) {
    console.error('Error computing plan:', error);
    showError('Failed to compute plan');
  }
};

window.startBumping = async function() {
  try {
    const response = await fetch(`${API_BASE}/dock-planning/start-bumping`, {
      method: 'POST',
      credentials: 'include'
    });

    if (response.ok) {
      await loadBumpingState();
      await loadAdminPortal();
      showSuccess('Bumping party started!');
      currentTab = 'bumping';
      renderAdminPortal();
    } else {
      const data = await response.json();
      showError(data.error || 'Failed to start bumping');
    }
  } catch (error) {
    console.error('Error starting bumping:', error);
    showError('Failed to start bumping');
  }
};

window.selectDock = async function(event, applicationId) {
  event.preventDefault();
  const formData = new FormData(event.target);

  try {
    const response = await fetch(`${API_BASE}/dock-planning/select-dock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        applicationId,
        segmentName: formData.get('segment'),
        position: parseFloat(formData.get('position'))
      })
    });

    if (response.ok) {
      const data = await response.json();
      await loadBumpingState();
      await loadAdminPortal();

      if (data.bumpingComplete) {
        showSuccess('Bumping party completed!');
      } else {
        showSuccess('Dock selection recorded!');
      }
      renderAdminPortal();
    } else {
      const data = await response.json();
      showError(data.error || 'Failed to record selection');
    }
  } catch (error) {
    console.error('Error selecting dock:', error);
    showError('Failed to record selection');
  }
};

window.updateSeasonStatus = async function(event) {
  event.preventDefault();
  const formData = new FormData(event.target);

  try {
    const response = await fetch(`${API_BASE}/seasons/${currentSeason.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        status: formData.get('status')
      })
    });

    if (response.ok) {
      currentSeason = await response.json();
      showSuccess('Season status updated!');
      renderAdminPortal();
    } else {
      const data = await response.json();
      showError(data.error || 'Failed to update status');
    }
  } catch (error) {
    console.error('Error updating status:', error);
    showError('Failed to update status');
  }
};

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
}

function formatCategory(category) {
  const labels = {
    'renewal_same': 'Renewal: same/smaller',
    'renewal_larger': 'Renewal: larger',
    'new': 'New application'
  };
  return labels[category] || category;
}

function formatSegment(segment) {
  const names = {
    'small': 'Small Dock',
    'mainInsideSouth': 'South Inside',
    'mainInsideNorth': 'North Inside',
    'mainOutsideUpper': 'Main Outside (Upper)',
    'mainOutsideLower': 'Main Outside (Lower)'
  };
  return names[segment] || segment;
}

function showError(message) {
  const container = document.getElementById('message-area');
  if (container) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
    setTimeout(() => { container.innerHTML = ''; }, 5000);
  }
}

function showSuccess(message) {
  const container = document.getElementById('message-area');
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
