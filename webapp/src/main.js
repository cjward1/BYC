const state = {
  applications: [],
  plan: null,
  bumping: {
    active: false,
    queue: [],
    currentIndex: 0,
    slotsBySegment: {},
  },
};

let applicationCounter = 1;

const CATEGORY_ORDER = {
  renewal_same: 1,
  renewal_larger: 2,
  new: 3,
};

const CATEGORY_LABEL = {
  renewal_same: "Renewal (same/smaller)",
  renewal_larger: "Renewal (larger boat)",
  new: "New application",
};

const SEGMENT_LABELS = {
  smallDockRight: "Small Dock (Right Side)",
  mainInsideSouth: "South Inside",
  mainInsideNorth: "North Inside",
  mainOutsideUpper: "Main Outside (Upper)",
  mainOutsideLower: "Main Outside (Lower)",
};

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function compareApplications(a, b) {
  const categoryDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
  if (categoryDiff !== 0) return categoryDiff;
  return a.seniority - b.seniority;
}

function buildSegments(pumpStart) {
  return [
    {
      id: "smallDockRight",
      name: SEGMENT_LABELS.smallDockRight,
      length: 399,
      dock: "small",
      offset: 0,
      orientation: "right",
    },
    {
      id: "mainInsideSouth",
      name: SEGMENT_LABELS.mainInsideSouth,
      length: 448,
      dock: "main-left",
      offset: 0,
      orientation: "left",
    },
    {
      id: "mainInsideNorth",
      name: SEGMENT_LABELS.mainInsideNorth,
      length: 425,
      dock: "main-left",
      offset: 448 + 157,
      orientation: "left",
    },
    {
      id: "mainOutsideUpper",
      name: SEGMENT_LABELS.mainOutsideUpper,
      length: pumpStart,
      dock: "main-right",
      offset: 0,
      orientation: "right",
    },
    {
      id: "mainOutsideLower",
      name: SEGMENT_LABELS.mainOutsideLower,
      length: Math.max(0, 1030 - (pumpStart + 60)),
      dock: "main-right",
      offset: pumpStart + 60,
      orientation: "right",
    },
  ];
}

function createInitialSegmentState(segments) {
  return segments.map((segment) => ({
    id: segment.id,
    length: segment.length,
    boatCount: 0,
    boatLength: 0,
  }));
}

function requiredLength(boatLengthSum, boatCount) {
  if (boatCount === 0) return 0;
  return boatLengthSum + 3 * (boatCount - 1);
}

function canFitBoat(segmentState, boatLength) {
  const newBoatCount = segmentState.boatCount + 1;
  const newBoatLengthSum = segmentState.boatLength + boatLength;
  const needed = requiredLength(newBoatLengthSum, newBoatCount);
  return needed <= segmentState.length;
}

function buildStateKey(index, segments) {
  const segmentKey = segments
    .map((seg) => `${seg.boatLength}:${seg.boatCount}:${seg.id}`)
    .join("|");
  return `${index}|${segmentKey}`;
}

function cloneSegments(segments) {
  return segments.map((seg) => ({ ...seg }));
}

function computeOptimalPlan(applications) {
  if (!applications.length) {
    return null;
  }
  const sorted = [...applications].sort(compareApplications);
  let bestPlan = {
    count: 0,
    totalLength: 0,
    assignments: {},
    pumpStart: 455,
  };

  for (let pumpStart = 455; pumpStart <= 515; pumpStart++) {
    const segments = buildSegments(pumpStart);
    const segmentsState = createInitialSegmentState(segments);
    const memo = new Map();

    const result = exploreAssignments(sorted, 0, segmentsState, memo);
    if (
      result.count > bestPlan.count ||
      (result.count === bestPlan.count && result.totalLength > bestPlan.totalLength)
    ) {
      bestPlan = {
        count: result.count,
        totalLength: result.totalLength,
        assignments: result.assignments,
        pumpStart,
      };
    }
  }

  const assignedIds = Object.keys(bestPlan.assignments);
  const assigned = sorted.filter((app) => assignedIds.includes(app.id));
  const waitlist = sorted.filter((app) => !assignedIds.includes(app.id));

  return {
    maxBoats: bestPlan.count,
    totalAssignedLength: bestPlan.totalLength,
    pumpStart: bestPlan.pumpStart,
    assigned,
    waitlist,
    sorted,
    assignments: bestPlan.assignments,
  };
}

function exploreAssignments(applications, index, segmentsState, memo) {
  if (index >= applications.length) {
    return {
      count: 0,
      totalLength: 0,
      assignments: {},
    };
  }

  const key = buildStateKey(index, segmentsState);
  if (memo.has(key)) {
    return memo.get(key);
  }

  const app = applications[index];
  let best = {
    count: 0,
    totalLength: 0,
    assignments: {},
  };

  for (let i = 0; i < segmentsState.length; i++) {
    const segmentState = segmentsState[i];
    if (segmentState.length === 0) continue;
    if (!canFitBoat(segmentState, app.boatLength)) continue;
    const newSegments = cloneSegments(segmentsState);
    newSegments[i].boatCount += 1;
    newSegments[i].boatLength += app.boatLength;
    const subResult = exploreAssignments(applications, index + 1, newSegments, memo);
    const totalCount = subResult.count + 1;
    const totalLength = subResult.totalLength + app.boatLength;
    if (
      totalCount > best.count ||
      (totalCount === best.count && totalLength > best.totalLength)
    ) {
      best = {
        count: totalCount,
        totalLength,
        assignments: {
          ...subResult.assignments,
          [app.id]: {
            segmentId: newSegments[i].id,
            order: newSegments[i].boatCount - 1,
          },
        },
      };
    }
  }

  const skipResult = exploreAssignments(applications, index + 1, segmentsState, memo);
  if (
    skipResult.count > best.count ||
    (skipResult.count === best.count && skipResult.totalLength > best.totalLength)
  ) {
    best = skipResult;
  }

  memo.set(key, best);
  return best;
}

function renderApp() {
  const container = document.getElementById("app");
  container.innerHTML = `
    <h1>Bordentown Yacht Club Dock Planner</h1>
    <section>
      <h2>Dock Applications</h2>
      <p>
        Applications are due by <strong>March 15</strong>. Please provide complete boat and insurance information.
      </p>
      ${renderApplicationForm()}
      ${renderApplicationTable()}
    </section>
    ${renderPlanSection()}
    ${renderBumpingSection()}
  `;
  attachFormHandler();
  attachPlanHandler();
  attachStartBumpingHandler();
  attachSlotHandlers();
}

function renderApplicationForm() {
  return `
    <form id="application-form">
      <label>
        Member name
        <input name="memberName" required />
      </label>
      <label>
        Seniority number
        <input name="seniority" type="number" min="1" required />
      </label>
      <label>
        Application category
        <select name="category" required>
          <option value="renewal_same">Renewal: same or smaller boat</option>
          <option value="renewal_larger">Renewal: larger boat</option>
          <option value="new">New application</option>
        </select>
      </label>
      <label>
        Boat name
        <input name="boatName" required />
      </label>
      <label>
        Boat length (ft)
        <input name="boatLength" type="number" min="1" step="1" required />
      </label>
      <label>
        Boat type
        <input name="boatType" required />
      </label>
      <label>
        Registration number
        <input name="registration" required />
      </label>
      <label>
        Insurance coverage (USD)
        <input name="insurance" type="number" min="500000" required />
      </label>
      <label>
        Insurance notes
        <textarea name="insuranceNotes" rows="3" placeholder="Policy provider, expiration, etc." required></textarea>
      </label>
      <div style="grid-column: 1 / -1; display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button type="submit">Add application</button>
        <button type="reset" class="secondary" style="background: #ffffff; color: #0d5aa7; border: 1px solid #0d5aa7;">Clear</button>
      </div>
    </form>
  `;
}

function renderApplicationTable() {
  if (!state.applications.length) {
    return `<p>No applications submitted yet.</p>`;
  }
  const sorted = [...state.applications].sort(compareApplications);
  const rows = sorted
    .map(
      (app) => `
        <tr>
          <td>${app.memberName}</td>
          <td>${app.seniority}</td>
          <td>${CATEGORY_LABEL[app.category]}</td>
          <td>${app.boatName}</td>
          <td>${app.boatLength} ft</td>
          <td>${app.boatType}</td>
          <td>${app.registration}</td>
          <td>$${Number(app.insurance).toLocaleString()}</td>
          <td>${formatDate(app.submittedAt)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Seniority</th>
            <th>Category</th>
            <th>Boat name</th>
            <th>Length</th>
            <th>Type</th>
            <th>Registration</th>
            <th>Insurance</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderPlanSection() {
  if (!state.applications.length) {
    return "";
  }
  if (!state.plan) {
    return `
      <section>
        <h2>Optimization</h2>
        <p>Calculate the optimal dock allocation before the bumping party.</p>
        <button id="compute-plan">Compute optimal dock plan</button>
      </section>
    `;
  }

  const { maxBoats, assigned, waitlist, pumpStart } = state.plan;
  const pumpEnd = pumpStart + 60;
  return `
    <section>
      <h2>Dock Plan</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <h3>${maxBoats}</h3>
          <p>Boats can be accommodated this season.</p>
        </div>
        <div class="summary-card">
          <h3>${assigned.length}</h3>
          <p>Assignments ready for the bumping order.</p>
        </div>
        <div class="summary-card">
          <h3>${waitlist.length}</h3>
          <p>Applications on the waitlist.</p>
        </div>
        <div class="summary-card">
          <h3>Pump-out: ${pumpStart}’–${pumpEnd}’</h3>
          <p>Reserved pump-out zone on the main outside dock.</p>
        </div>
      </div>
      ${renderAssignmentTables()}
      <div class="alert">
        Once the bumping party begins, members must choose locations that maintain the maximum of ${maxBoats} boats on the docks. Slots will lock after selection.
      </div>
      <button id="start-bumping" style="margin-top: 1rem;" ${
        state.bumping.active ? "disabled" : ""
      }>Start bumping party</button>
    </section>
  `;
}

function renderAssignmentTables() {
  const { assigned, waitlist, assignments } = state.plan;
  const assignmentRows = assigned
    .map((app) => {
      const slot = assignments[app.id];
      const segmentLabel = SEGMENT_LABELS[slot.segmentId] || slot.segmentId;
      return `
        <tr>
          <td>${app.memberName}</td>
          <td>${app.boatName}</td>
          <td>${app.boatLength} ft</td>
          <td>${segmentLabel}</td>
        </tr>
      `;
    })
    .join("");

  const waitRows = waitlist
    .map(
      (app) => `
        <tr>
          <td>${app.memberName}</td>
          <td>${app.boatName}</td>
          <td>${app.boatLength} ft</td>
          <td>${CATEGORY_LABEL[app.category]}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="table-container" style="margin-top: 1.5rem;">
      <h3>Assigned boats</h3>
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Boat</th>
            <th>Length</th>
            <th>Segment</th>
          </tr>
        </thead>
        <tbody>${assignmentRows}</tbody>
      </table>
      ${waitlist.length
        ? `<h3 style="margin-top: 1.5rem;">Waitlist</h3>
           <table>
             <thead>
               <tr>
                 <th>Member</th>
                 <th>Boat</th>
                 <th>Length</th>
                 <th>Category</th>
               </tr>
             </thead>
             <tbody>${waitRows}</tbody>
           </table>`
        : ""}
    </div>
  `;
}

function renderBumpingSection() {
  if (!state.bumping.active || !state.plan) {
    return "";
  }
  const queue = state.bumping.queue;
  if (!queue.length) {
    return `
      <section>
        <h2>Bumping Party</h2>
        <p>No boats were assigned in the optimization step. Run the planner again after adding applications.</p>
      </section>
    `;
  }
  const currentMember = queue[state.bumping.currentIndex];
  return `
    <section>
      <h2>Bumping Party</h2>
      <p>Members select their dock locations in seniority order while maintaining the optimized layout.</p>
      <div class="legend">
        <span><span class="legend-swatch available"></span> Available slot</span>
        <span><span class="legend-swatch locked"></span> Locked boat</span>
        <span><span class="legend-swatch pending"></span> Upcoming slot</span>
      </div>
      <h3 style="margin-top: 1rem;">Current member: ${currentMember.memberName} (${currentMember.boatLength} ft)</h3>
      ${renderBumpingQueue()}
      ${renderDockVisualization()}
    </section>
  `;
}

function renderBumpingQueue() {
  const queueMarkup = state.bumping.queue
    .map((entry, idx) => {
      const status = idx < state.bumping.currentIndex ? "Complete" : idx === state.bumping.currentIndex ? "Up now" : "Waiting";
      return `
        <div class="queue-item ${idx === state.bumping.currentIndex ? "active" : ""}">
          <div>
            <span>${entry.memberName}</span><br />
            <small>${CATEGORY_LABEL[entry.category]} &middot; Seniority ${entry.seniority}</small>
          </div>
          <strong>${status}</strong>
        </div>
      `;
    })
    .join("");
  return `<div class="bumping-queue">${queueMarkup}</div>`;
}

function buildSlotsForVisualization() {
  const { assignments, pumpStart } = state.plan;
  const segments = buildSegments(pumpStart);
  const slotsBySegment = {};
  segments.forEach((segment) => {
    slotsBySegment[segment.id] = [];
  });
  state.plan.assigned.forEach((app) => {
    const slot = assignments[app.id];
    if (!slot) return;
    slotsBySegment[slot.segmentId].push({
      ...app,
      order: slot.order,
    });
  });
  Object.keys(slotsBySegment).forEach((id) => {
    slotsBySegment[id].sort((a, b) => a.order - b.order);
  });
  return { segments, slotsBySegment };
}

function renderDockVisualization() {
  const { segments, slotsBySegment } = buildSlotsForVisualization();
  const pumpStart = state.plan.pumpStart;
  const pumpEnd = pumpStart + 60;
  state.bumping.slotsBySegment = {};
  segments.forEach((segment) => {
    const entries = slotsBySegment[segment.id] || [];
    state.bumping.slotsBySegment[segment.id] = entries.map((entry) => ({
      id: entry.id,
      start: computeStartPosition(entries, entry.order, segment),
      length: entry.boatLength,
      app: entry,
      status: determineSlotStatus(entry.id),
    }));
  });

  const smallDock = segments.find((seg) => seg.id === "smallDockRight");
  const mainLeftSegments = segments.filter((seg) => seg.dock === "main-left");
  const mainRightSegments = segments.filter((seg) => seg.dock === "main-right");

  return `
    <div class="dock-layout">
      <div class="dock-column">
        <div class="dock-visual">
          <h3>Small Dock</h3>
          ${renderDockSide(smallDock, state.bumping.slotsBySegment["smallDockRight"], 180, false)}
        </div>
      </div>
      <div class="dock-column">
        <div class="dock-visual">
          <h3>Main Dock &mdash; Inside</h3>
          ${mainLeftSegments
            .map((segment) => renderDockSide(segment, state.bumping.slotsBySegment[segment.id], 470, true))
            .join("")}
        </div>
      </div>
      <div class="dock-column">
        <div class="dock-visual">
          <h3>Main Dock &mdash; Outside</h3>
          ${mainRightSegments
            .map((segment) => renderDockSide(segment, state.bumping.slotsBySegment[segment.id], 470, true, pumpStart, pumpEnd))
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function computeStartPosition(entries, order, segment) {
  const sortedEntries = [...entries].sort((a, b) => a.order - b.order);
  let offset = segment.offset;
  for (const entry of sortedEntries) {
    if (entry.order === order) {
      return offset;
    }
    offset += entry.boatLength + 3;
  }
  return offset;
}

function determineSlotStatus(appId) {
  const queue = state.bumping.queue;
  const index = queue.findIndex((entry) => entry.id === appId);
  if (index < state.bumping.currentIndex) return "locked";
  if (index === state.bumping.currentIndex) return "available";
  return "pending";
}

function renderDockSide(segment, slots, trackHeight, showOffset, pumpStart, pumpEnd) {
  const scale = segment.dock === "small" ? trackHeight / 399 : trackHeight / 1030;
  const pumpZoneMarkup =
    segment.id === "mainOutsideUpper" || segment.id === "mainOutsideLower"
      ? renderPumpZone(segment, scale, pumpStart, pumpEnd)
      : "";
  const slotMarkup = (slots || [])
    .map((slot, idx) => {
      const top = (slot.start - segment.offset) * scale;
      const height = slot.length * scale;
      const statusClass = slot.status;
      const disabled = slot.status !== "available" ? "disabled" : "";
      return `
        <div
          class="boat-slot ${statusClass} ${disabled}"
          data-app-id="${slot.app.id}"
          data-segment="${segment.id}"
          style="top: ${top}px; height: ${Math.max(height, 36)}px;"
        >
          <strong>${slot.app.memberName}</strong>
          <span>${slot.app.boatName}</span>
          <span>${slot.app.boatLength} ft</span>
        </div>
      `;
    })
    .join("");

  return `
    <div class="dock-side">
      <h4>${segment.name}</h4>
      <div class="dock-track ${segment.dock === "small" ? "small" : "main"}">
        ${pumpZoneMarkup}
        ${slotMarkup || `<div class="boat-slot pending" style="position: absolute; top: 16px; left: 8px; right: 8px; height: 48px;">No assignments</div>`}
      </div>
      ${showOffset ? `<div class="segment-label">Start marker: ${segment.offset}’</div>` : ""}
    </div>
  `;
}

function renderPumpZone(segment, scale, pumpStart, pumpEnd) {
  if (pumpStart == null || pumpEnd == null) return "";
  const pumpTop = Math.max(0, (pumpStart - segment.offset) * scale);
  const pumpBottom = Math.min(segment.length, pumpEnd - segment.offset);
  if (pumpBottom <= 0 || pumpTop >= segment.length) {
    return "";
  }
  const height = Math.max(32, (pumpBottom - pumpTop) * scale);
  return `
    <div class="pump-zone" style="top: ${pumpTop}px; height: ${height}px;">
      Pump-out zone
    </div>
  `;
}

function attachFormHandler() {
  const form = document.getElementById("application-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const insurance = Number(formData.get("insurance"));
    if (insurance < 500000) {
      alert("Insurance coverage must be at least $500,000 liability.");
      return;
    }
    const application = {
      id: `app-${applicationCounter++}`,
      memberName: formData.get("memberName").trim(),
      seniority: Number(formData.get("seniority")),
      category: formData.get("category"),
      boatName: formData.get("boatName").trim(),
      boatLength: Number(formData.get("boatLength")),
      boatType: formData.get("boatType").trim(),
      registration: formData.get("registration").trim(),
      insurance: insurance,
      insuranceNotes: formData.get("insuranceNotes").trim(),
      submittedAt: new Date(),
    };
    if (!Number.isInteger(application.boatLength)) {
      alert("Boat length must be a whole number of feet.");
      return;
    }
    state.applications.push(application);
    state.plan = null;
    state.bumping.active = false;
    renderApp();
  });
}

function attachPlanHandler() {
  const button = document.getElementById("compute-plan");
  if (!button) return;
  button.addEventListener("click", () => {
    if (!state.applications.length) return;
    state.plan = computeOptimalPlan(state.applications);
    state.bumping.active = false;
    renderApp();
  });
}

function attachStartBumpingHandler() {
  const button = document.getElementById("start-bumping");
  if (!button) return;
  button.addEventListener("click", () => {
    if (!state.plan) return;
    state.bumping.active = true;
    state.bumping.queue = [...state.plan.assigned].sort(compareApplications);
    state.bumping.currentIndex = 0;
    renderApp();
  });
}

function attachSlotHandlers() {
  if (!state.bumping.active) return;
  const slots = document.querySelectorAll(".boat-slot.available");
  slots.forEach((slot) => {
    slot.addEventListener("click", () => {
      const appId = slot.dataset.appId;
      const currentApp = state.bumping.queue[state.bumping.currentIndex];
      if (!currentApp || currentApp.id !== appId) {
        return;
      }
      lockSlot(appId);
      if (state.bumping.currentIndex < state.bumping.queue.length - 1) {
        state.bumping.currentIndex += 1;
      } else {
        alert("All assigned members have selected their locations.");
      }
      renderApp();
    });
  });
}

function lockSlot(appId) {
  Object.values(state.bumping.slotsBySegment).forEach((segmentSlots) => {
    segmentSlots.forEach((slot) => {
      if (slot.app.id === appId) {
        slot.status = "locked";
      }
    });
  });
}

renderApp();
