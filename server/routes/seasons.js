import express from 'express';
import { Season } from '../models/Season.js';
import { requireAuth, requireRearCommodore } from '../middleware/auth.js';

const router = express.Router();

// Get all seasons
router.get('/', requireAuth, (req, res) => {
  try {
    const seasons = Season.getAll();
    res.json(seasons);
  } catch (error) {
    console.error('Error fetching seasons:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current season
router.get('/current', requireAuth, (req, res) => {
  try {
    const season = Season.getCurrent();
    if (!season) {
      return res.status(404).json({ error: 'No current season found' });
    }
    res.json(season);
  } catch (error) {
    console.error('Error fetching current season:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get season by ID
router.get('/:id', requireAuth, (req, res) => {
  try {
    const season = Season.findById(req.params.id);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }
    res.json(season);
  } catch (error) {
    console.error('Error fetching season:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new season (Rear Commodore only)
router.post('/', requireRearCommodore, (req, res) => {
  try {
    const { year, applicationStartDate, applicationEndDate, bumpingDate } = req.body;

    if (!year || !applicationStartDate || !applicationEndDate) {
      return res.status(400).json({ error: 'Year and application dates are required' });
    }

    // Check if season already exists
    const existing = Season.findByYear(year);
    if (existing) {
      return res.status(400).json({ error: 'Season already exists for this year' });
    }

    const season = Season.create({
      year,
      applicationStartDate,
      applicationEndDate,
      bumpingDate,
      status: 'planning'
    });

    res.status(201).json(season);
  } catch (error) {
    console.error('Error creating season:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update season (Rear Commodore only)
router.put('/:id', requireRearCommodore, (req, res) => {
  try {
    const season = Season.findById(req.params.id);
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }

    const updated = Season.update(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Error updating season:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update season status (Rear Commodore only)
router.patch('/:id/status', requireRearCommodore, (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['planning', 'accepting_applications', 'applications_closed', 'bumping_in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = Season.updateStatus(req.params.id, status);
    res.json(updated);
  } catch (error) {
    console.error('Error updating season status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
