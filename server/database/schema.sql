-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  seniority_number INTEGER UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'member' or 'rear_commodore'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seasons table (for annual dock scheduling)
CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER UNIQUE NOT NULL,
  application_start_date DATE NOT NULL,
  application_end_date DATE NOT NULL,
  bumping_date DATE,
  status TEXT NOT NULL DEFAULT 'planning', -- 'planning', 'accepting_applications', 'applications_closed', 'bumping_in_progress', 'completed'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dock applications table
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  member_name TEXT NOT NULL,
  seniority_number INTEGER NOT NULL,
  application_category TEXT NOT NULL, -- 'renewal_same', 'renewal_larger', 'new'
  boat_name TEXT NOT NULL,
  boat_length INTEGER NOT NULL,
  boat_type TEXT NOT NULL,
  boat_registration TEXT NOT NULL,
  insurance_coverage INTEGER NOT NULL,
  insurance_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'assigned', 'waitlist', 'rejected'
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(season_id, user_id)
);

-- Dock assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  application_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  segment_name TEXT NOT NULL, -- 'small', 'mainInsideSouth', 'mainInsideNorth', 'mainOutsideUpper', 'mainOutsideLower'
  position REAL NOT NULL, -- Position in feet along the dock
  boat_length INTEGER NOT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  locked BOOLEAN DEFAULT 0, -- Whether the assignment is locked during bumping
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(season_id, application_id)
);

-- Optimal plans table (stores the computed optimal plan for each season)
CREATE TABLE IF NOT EXISTS optimal_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER UNIQUE NOT NULL,
  pump_out_start REAL NOT NULL,
  total_boats INTEGER NOT NULL,
  total_length REAL NOT NULL,
  plan_data TEXT NOT NULL, -- JSON string of the complete plan
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

-- Bumping state table (tracks bumping party progress)
CREATE TABLE IF NOT EXISTS bumping_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER UNIQUE NOT NULL,
  current_index INTEGER NOT NULL DEFAULT 0,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_applications_season ON applications(season_id);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_season ON assignments(season_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_seniority ON users(seniority_number);
