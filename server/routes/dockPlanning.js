import express from 'express';
import { Application } from '../models/Application.js';
import { Season } from '../models/Season.js';
import { OptimalPlan } from '../models/OptimalPlan.js';
import { Assignment } from '../models/Assignment.js';
import { BumpingState } from '../models/BumpingState.js';
import { requireAuth, requireRearCommodore } from '../middleware/auth.js';

const router = express.Router();

const CATEGORY_ORDER = {
  renewal_same: 1,
  renewal_larger: 2,
  new: 3,
};

function compareApplications(a, b) {
  const categoryDiff = CATEGORY_ORDER[a.application_category] - CATEGORY_ORDER[b.application_category];
  if (categoryDiff !== 0) return categoryDiff;
  return a.seniority_number - b.seniority_number;
}

function buildSegments(pumpStart) {
  return [
    {
      id: "small",
      name: "Small Dock (Right Side)",
      length: 399,
      dock: "small",
      offset: 0,
      orientation: "right",
    },
    {
      id: "mainInsideSouth",
      name: "South Inside",
      length: 448,
      dock: "main-left",
      offset: 0,
      orientation: "left",
    },
    {
      id: "mainInsideNorth",
      name: "North Inside",
      length: 425,
      dock: "main-left",
      offset: 448 + 157,
      orientation: "left",
    },
    {
      id: "mainOutsideUpper",
      name: "Main Outside (Upper)",
      length: pumpStart,
      dock: "main-right",
      offset: 0,
      orientation: "right",
    },
    {
      id: "mainOutsideLower",
      name: "Main Outside (Lower)",
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
    if (!canFitBoat(segmentState, app.boat_length)) continue;
    const newSegments = cloneSegments(segmentsState);
    newSegments[i].boatCount += 1;
    newSegments[i].boatLength += app.boat_length;
    const subResult = exploreAssignments(applications, index + 1, newSegments, memo);
    const totalCount = subResult.count + 1;
    const totalLength = subResult.totalLength + app.boat_length;
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
  const assigned = sorted.filter((app) => assignedIds.includes(String(app.id)));
  const waitlist = sorted.filter((app) => !assignedIds.includes(String(app.id)));

  return {
    maxBoats: bestPlan.count,
    totalLength: bestPlan.totalLength,
    pumpOutStart: bestPlan.pumpStart,
    assigned,
    waitlist,
    sorted,
    assignments: bestPlan.assignments,
  };
}

// Compute optimal plan for current season (Rear Commodore only)
router.post('/compute-plan', requireRearCommodore, (req, res) => {
  try {
    const season = Season.getCurrent();
    if (!season) {
      return res.status(404).json({ error: 'No current season found' });
    }

    const applications = Application.findBySeason(season.id);
    if (!applications.length) {
      return res.status(400).json({ error: 'No applications to process' });
    }

    const plan = computeOptimalPlan(applications);

    if (!plan) {
      return res.status(400).json({ error: 'Failed to compute plan' });
    }

    // Save the plan to database
    const savedPlan = OptimalPlan.save(season.id, plan);

    // Update application statuses
    plan.assigned.forEach(app => {
      Application.updateStatus(app.id, 'approved');
    });

    plan.waitlist.forEach(app => {
      Application.updateStatus(app.id, 'waitlist');
    });

    res.json({
      success: true,
      plan: savedPlan
    });
  } catch (error) {
    console.error('Error computing optimal plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get optimal plan for current season
router.get('/plan', requireAuth, (req, res) => {
  try {
    const season = Season.getCurrent();
    if (!season) {
      return res.status(404).json({ error: 'No current season found' });
    }

    const plan = OptimalPlan.findBySeason(season.id);
    if (!plan) {
      return res.status(404).json({ error: 'No plan computed yet' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start bumping party (Rear Commodore only)
router.post('/start-bumping', requireRearCommodore, (req, res) => {
  try {
    const season = Season.getCurrent();
    if (!season) {
      return res.status(404).json({ error: 'No current season found' });
    }

    const plan = OptimalPlan.findBySeason(season.id);
    if (!plan) {
      return res.status(400).json({ error: 'No optimal plan computed yet' });
    }

    // Check if bumping already started
    let bumpingState = BumpingState.findBySeason(season.id);
    if (bumpingState && !bumpingState.completed_at) {
      return res.status(400).json({ error: 'Bumping party already in progress' });
    }

    // Reset bumping state
    if (bumpingState) {
      BumpingState.reset(season.id);
    }

    // Create new bumping state
    bumpingState = BumpingState.create(season.id);

    // Update season status
    Season.updateStatus(season.id, 'bumping_in_progress');

    res.json({
      success: true,
      bumpingState
    });
  } catch (error) {
    console.error('Error starting bumping party:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bumping state
router.get('/bumping-state', requireAuth, (req, res) => {
  try {
    const season = Season.getCurrent();
    if (!season) {
      return res.status(404).json({ error: 'No current season found' });
    }

    const bumpingState = BumpingState.findBySeason(season.id);
    if (!bumpingState) {
      return res.status(404).json({ error: 'Bumping party not started' });
    }

    const plan = OptimalPlan.findBySeason(season.id);
    const assignments = Assignment.findBySeason(season.id);

    res.json({
      bumpingState,
      plan,
      assignments
    });
  } catch (error) {
    console.error('Error fetching bumping state:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Make dock selection during bumping (Rear Commodore only)
router.post('/select-dock', requireRearCommodore, (req, res) => {
  try {
    const { applicationId, segmentName, position } = req.body;

    if (!applicationId || !segmentName || position === undefined) {
      return res.status(400).json({ error: 'Application ID, segment name, and position are required' });
    }

    const season = Season.getCurrent();
    if (!season) {
      return res.status(404).json({ error: 'No current season found' });
    }

    const bumpingState = BumpingState.findBySeason(season.id);
    if (!bumpingState || bumpingState.completed_at) {
      return res.status(400).json({ error: 'Bumping party not in progress' });
    }

    const application = Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const plan = OptimalPlan.findBySeason(season.id);
    if (!plan) {
      return res.status(400).json({ error: 'No optimal plan found' });
    }

    // Delete any existing assignment for this application
    Assignment.deleteByUser(application.user_id, season.id);

    // Create new assignment
    const assignment = Assignment.create({
      seasonId: season.id,
      applicationId: application.id,
      userId: application.user_id,
      segmentName,
      position,
      boatLength: application.boat_length,
      locked: true
    });

    // Update application status
    Application.updateStatus(application.id, 'assigned');

    // Advance bumping state
    const newIndex = bumpingState.current_index + 1;
    const totalAssigned = plan.plan_data.assigned.length;

    if (newIndex >= totalAssigned) {
      // Bumping complete
      BumpingState.complete(season.id);
      Season.updateStatus(season.id, 'completed');
    } else {
      BumpingState.updateIndex(season.id, newIndex);
    }

    res.json({
      success: true,
      assignment,
      bumpingComplete: newIndex >= totalAssigned
    });
  } catch (error) {
    console.error('Error selecting dock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
