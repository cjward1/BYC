# Windows Installation Fix

The original code used `better-sqlite3` which requires C++ compilation on Windows. I've updated it to use pure JavaScript libraries that work on Windows without any build tools.

## Quick Fix Steps

1. **Delete the old installation** (if you tried to install):
   ```cmd
   cd C:\Dev\BYC-main\server
   rmdir /s /q node_modules
   del package-lock.json
   ```

2. **Pull the latest changes** from Git:
   ```cmd
   cd C:\Dev\BYC-main
   git pull
   ```

3. **Install dependencies** (should work now):
   ```cmd
   cd server
   npm install
   ```

4. **Initialize the database**:
   ```cmd
   npm run init-db
   ```

5. **Start the server**:
   ```cmd
   npm start
   ```

6. **Open your browser** to:
   - http://localhost:3000

## What Was Changed

- Replaced `better-sqlite3` (requires C++ compiler) with `sql.js` (pure JavaScript)
- Replaced `bcrypt` (requires C++ compiler) with `bcryptjs` (pure JavaScript)
- These changes make the app work on Windows without Visual Studio Build Tools

## If You Still Get Errors

If you see any errors about "module not found" or similar:

1. Make sure you're in the `server` directory when running commands
2. Try deleting `node_modules` again and reinstalling
3. Make sure you have Node.js 18 or higher installed: `node --version`

## Default Login Credentials

After successful installation:
- **Admin**: username: `admin`, password: `admin123`
- **Member**: username: `member1`, password: `member123`

**Remember to change these passwords after first login!**
