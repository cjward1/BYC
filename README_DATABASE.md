# BYC Dock Management System - Database Version

A comprehensive web-based application for managing the Bordentown Yacht Club's annual dock allocation process. This version includes a full database backend, user authentication, and role-based access control.

## Features

### For Members
- **User Authentication**: Secure login with username and password
- **Self-Service Applications**: Submit dock applications with boat details and insurance information
- **Application Tracking**: View application status (pending, approved, assigned, waitlist)
- **Assignment Viewing**: Check dock assignment once bumping party is complete

### For Rear Commodore
- **Application Management**: View all submitted applications with filtering and status updates
- **Optimal Planning**: Automatic computation of optimal dock allocation using dynamic programming
- **Bumping Party Management**: Interactive interface to manage the seniority-based bumping process
- **Season Management**: Control application periods and season status
- **Reporting**: View statistics and progress throughout the season

### Technical Features
- **Database Persistence**: SQLite database for all data (users, applications, assignments, seasons)
- **Annual Scheduling**: Support for multiple seasons with configurable application periods
- **Role-Based Access**: Two user roles (Member and Rear Commodore) with appropriate permissions
- **RESTful API**: Clean API architecture for frontend-backend communication
- **Session Management**: Secure session-based authentication

## Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- npm (comes with Node.js)

### Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Initialize the database and create default users:
```bash
npm run init-db
```

This will create:
- **Admin Account**:
  - Username: `admin`
  - Password: `admin123`
  - Role: Rear Commodore
- **Sample Member Account**:
  - Username: `member1`
  - Password: `member123`
  - Seniority: 1

4. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Usage

### First Time Setup

1. **Access the landing page** at `http://localhost:3000`
2. **Login as Rear Commodore** using the admin credentials
3. **Set up the season**:
   - Go to "Season Management" tab
   - Update status to "Accepting Applications"
4. **Add member accounts** (currently requires database access - see below)

### For Members

1. Navigate to `http://localhost:3000/member`
2. Login with your credentials
3. Submit your dock application with:
   - Application category (renewal same/larger, new)
   - Boat details (name, length, type, registration)
   - Insurance information (minimum $500,000 liability)
4. View your application status
5. Check back after bumping party to see your assignment

### For Rear Commodore

1. Navigate to `http://localhost:3000/admin`
2. Login with admin credentials
3. **Applications Tab**: View all submitted applications
4. **Dock Planning Tab**:
   - Click "Compute Optimal Plan" to calculate best dock allocation
   - Review assigned boats and waitlist
5. **Bumping Party Tab**:
   - Click "Start Bumping Party" to begin the process
   - For each member (in seniority order):
     - Select their dock segment
     - Enter position in feet
     - Confirm selection
6. **Season Management Tab**: Update season status as needed

## Application Flow

1. **Planning Phase**: Rear Commodore creates new season
2. **Application Period**: Status changed to "Accepting Applications", members submit applications
3. **Applications Closed**: Rear Commodore closes applications
4. **Optimal Planning**: Rear Commodore computes optimal dock plan
5. **Bumping Party**: Members select specific dock locations in seniority order
6. **Completed**: All assignments finalized

## Database Schema

### Users
- Authentication credentials
- Full name, email, seniority number
- Role (member or rear_commodore)

### Seasons
- Year and application dates
- Status tracking
- One active season at a time

### Applications
- Member boat and insurance details
- Linked to user and season
- Status tracking (pending, approved, assigned, waitlist)

### Assignments
- Final dock locations
- Segment name and position
- Locked status during bumping

### Optimal Plans
- Computed optimal allocation
- Pump-out zone positioning
- Assignment mapping

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register new member

### Seasons
- `GET /api/seasons/current` - Get current season
- `POST /api/seasons` - Create season (Rear Commodore only)
- `PATCH /api/seasons/:id/status` - Update season status

### Applications
- `GET /api/applications/my-application` - Get user's application
- `POST /api/applications/submit` - Submit/update application
- `GET /api/applications/season/:seasonId` - Get all applications (Rear Commodore only)

### Dock Planning
- `POST /api/dock-planning/compute-plan` - Compute optimal plan
- `GET /api/dock-planning/plan` - Get current plan
- `POST /api/dock-planning/start-bumping` - Start bumping party
- `GET /api/dock-planning/bumping-state` - Get bumping state
- `POST /api/dock-planning/select-dock` - Record dock selection

## Adding New Members

Currently, new members must be added directly to the database or through the registration endpoint. To add a member via database:

```bash
cd server
node -e "
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const db = new Database('./data/byc.db');

const password = 'password123'; // Change this
const passwordHash = bcrypt.hashSync(password, 10);

db.prepare(\`
  INSERT INTO users (username, password_hash, email, full_name, seniority_number, role)
  VALUES (?, ?, ?, ?, ?, 'member')
\`).run('newuser', passwordHash, 'user@email.com', 'Full Name', 10);

console.log('User created!');
db.close();
"
```

Or use the registration API endpoint (requires authentication setup for public access).

## Optimization Algorithm

The dock planning uses a dynamic programming algorithm that:
1. Tests all possible pump-out zone positions (455'-515')
2. For each position, calculates optimal boat assignments
3. Considers boats in priority order (renewals first, then new applications)
4. Within each category, prioritizes by seniority number
5. Maximizes total boats accommodated
6. Secondary optimization: maximizes total boat length

The algorithm ensures:
- 3-foot spacing between boats
- Pump-out zone covers the 515' mark
- Maximum utilization of available dock space

## Directory Structure

```
BYC/
├── server/
│   ├── config.js              # Server configuration
│   ├── server.js              # Main Express application
│   ├── package.json           # Dependencies
│   ├── database/
│   │   ├── db.js              # Database connection
│   │   └── schema.sql         # Database schema
│   ├── models/                # Data models
│   │   ├── User.js
│   │   ├── Season.js
│   │   ├── Application.js
│   │   ├── Assignment.js
│   │   ├── OptimalPlan.js
│   │   └── BumpingState.js
│   ├── routes/                # API routes
│   │   ├── auth.js
│   │   ├── seasons.js
│   │   ├── applications.js
│   │   └── dockPlanning.js
│   ├── middleware/
│   │   └── auth.js            # Authentication middleware
│   ├── scripts/
│   │   └── initDatabase.js    # Database initialization
│   └── data/                  # Database files (created on init)
└── webapp/
    ├── index.html             # Landing page
    ├── member.html            # Member portal
    ├── admin.html             # Rear Commodore portal
    └── src/
        ├── styles.css         # Shared styles
        ├── member.js          # Member portal logic
        └── admin.js           # Admin portal logic
```

## Security Considerations

⚠️ **Important for Production Use**:

1. **Change Default Passwords**: The default admin password should be changed immediately
2. **Session Secret**: Update `SESSION_SECRET` in `.env` to a random secret
3. **HTTPS**: Enable HTTPS in production
4. **Database Backups**: Regular backups of the SQLite database
5. **Access Control**: Consider additional authentication measures for production

## Troubleshooting

### Database Issues
- If database gets corrupted, delete `server/data/byc.db` and run `npm run init-db` again
- Check `server/data/` directory permissions

### Port Conflicts
- If port 3000 is in use, set `PORT` environment variable: `PORT=3001 npm start`

### Session Issues
- Clear browser cookies if experiencing login problems
- Check that session secret is set in config

## Development

For development with auto-reload:
```bash
npm run dev
```

## License

Copyright © Bordentown Yacht Club

## Support

For issues or questions, contact the club's technology committee.
