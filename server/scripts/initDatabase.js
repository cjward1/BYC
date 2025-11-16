import bcrypt from 'bcrypt';
import { initDatabase } from '../database/db.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { config } from '../config.js';

// Ensure data directory exists
mkdirSync(dirname(config.database.path), { recursive: true });

// Initialize database
const db = initDatabase();

// Create a default Rear Commodore user
const defaultPassword = 'admin123'; // Should be changed on first login
const passwordHash = bcrypt.hashSync(defaultPassword, 10);

try {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO users (username, password_hash, email, full_name, seniority_number, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    'admin',
    passwordHash,
    'admin@bycclub.org',
    'Administrator',
    0,
    'rear_commodore'
  );

  console.log('Default admin user created:');
  console.log('  Username: admin');
  console.log('  Password: admin123');
  console.log('  Role: rear_commodore');
  console.log('\nPlease change the password after first login!');

  // Create a sample member user for testing
  const memberStmt = db.prepare(`
    INSERT OR IGNORE INTO users (username, password_hash, email, full_name, seniority_number, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  memberStmt.run(
    'member1',
    bcrypt.hashSync('member123', 10),
    'member1@bycclub.org',
    'John Doe',
    1,
    'member'
  );

  console.log('\nSample member user created:');
  console.log('  Username: member1');
  console.log('  Password: member123');
  console.log('  Seniority: 1');

  // Create current season
  const currentYear = new Date().getFullYear();
  const seasonStmt = db.prepare(`
    INSERT OR IGNORE INTO seasons (year, application_start_date, application_end_date, status)
    VALUES (?, ?, ?, ?)
  `);

  seasonStmt.run(
    currentYear,
    `${currentYear}-01-01`,
    `${currentYear}-03-31`,
    'accepting_applications'
  );

  console.log(`\n${currentYear} season created with status: accepting_applications`);

} catch (error) {
  console.error('Error creating default data:', error);
}

db.close();
console.log('\nDatabase initialization complete!');
