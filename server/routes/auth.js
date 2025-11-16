import express from 'express';
import { User } from '../models/User.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.verifyPassword(username, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.userRole = user.role;
    req.session.seniorityNumber = user.seniority_number;

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        seniorityNumber: user.seniority_number,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = User.findById(req.session.userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    seniorityNumber: user.seniority_number,
    role: user.role
  });
});

// Register new member (can be restricted to admin only if needed)
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, fullName, seniorityNumber } = req.body;

    // Validate input
    if (!username || !password || !email || !fullName || !seniorityNumber) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if username already exists
    const existingUser = User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if seniority number already exists
    const existingSeniority = User.findBySeniority(seniorityNumber);
    if (existingSeniority) {
      return res.status(400).json({ error: 'Seniority number already assigned' });
    }

    const user = await User.create({
      username,
      password,
      email,
      fullName,
      seniorityNumber,
      role: 'member'
    });

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        seniorityNumber: user.seniority_number,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
