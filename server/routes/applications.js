import express from 'express';
import { Application } from '../models/Application.js';
import { Season } from '../models/Season.js';
import { User } from '../models/User.js';
import { requireAuth, requireRearCommodore } from '../middleware/auth.js';

const router = express.Router();

// Get all applications for current season (Rear Commodore only)
router.get('/', requireRearCommodore, (req, res) => {
  try {
    const season = Season.getCurrent();
    if (!season) {
      return res.status(404).json({ error: 'No current season found' });
    }

    const applications = Application.findBySeason(season.id);
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get applications for specific season (Rear Commodore only)
router.get('/season/:seasonId', requireRearCommodore, (req, res) => {
  try {
    const applications = Application.findBySeason(req.params.seasonId);
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user's application
router.get('/my-application', requireAuth, (req, res) => {
  try {
    const season = Season.getCurrent();
    if (!season) {
      return res.status(404).json({ error: 'No current season found' });
    }

    const application = Application.findByUser(req.session.userId, season.id);

    if (!application) {
      return res.status(404).json({ error: 'No application found' });
    }

    res.json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit or update application
router.post('/submit', requireAuth, (req, res) => {
  try {
    const season = Season.getCurrent();
    if (!season) {
      return res.status(404).json({ error: 'No current season found' });
    }

    // Check if season is accepting applications
    if (!Season.isAcceptingApplications(season.id)) {
      return res.status(400).json({ error: 'Season is not accepting applications' });
    }

    const user = User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const {
      applicationCategory,
      boatName,
      boatLength,
      boatType,
      boatRegistration,
      insuranceCoverage,
      insuranceNotes
    } = req.body;

    // Validate required fields
    if (!applicationCategory || !boatName || !boatLength || !boatType || !boatRegistration || !insuranceCoverage) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Validate insurance coverage
    if (insuranceCoverage < 500000) {
      return res.status(400).json({ error: 'Minimum insurance coverage of $500,000 required' });
    }

    // Check if user already has an application
    const existing = Application.findByUser(req.session.userId, season.id);

    let application;
    if (existing) {
      // Update existing application
      application = Application.update(existing.id, {
        applicationCategory,
        boatName,
        boatLength,
        boatType,
        boatRegistration,
        insuranceCoverage,
        insuranceNotes
      });
    } else {
      // Create new application
      application = Application.create({
        seasonId: season.id,
        userId: user.id,
        memberName: user.full_name,
        seniorityNumber: user.seniority_number,
        applicationCategory,
        boatName,
        boatLength,
        boatType,
        boatRegistration,
        insuranceCoverage,
        insuranceNotes,
        status: 'pending'
      });
    }

    res.json(application);
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get application statistics (Rear Commodore only)
router.get('/stats', requireRearCommodore, (req, res) => {
  try {
    const season = Season.getCurrent();
    if (!season) {
      return res.status(404).json({ error: 'No current season found' });
    }

    const stats = Application.getStatsBySeason(season.id);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching application stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update application status (Rear Commodore only)
router.patch('/:id/status', requireRearCommodore, (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['pending', 'approved', 'assigned', 'waitlist', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = Application.updateStatus(req.params.id, status);
    res.json(updated);
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
