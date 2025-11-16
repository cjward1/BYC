# Deploy to Heroku - Quick Guide

## Prerequisites
1. Create a free Heroku account at https://signup.heroku.com/
2. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli

## Deployment Steps

### 1. Login to Heroku
```bash
heroku login
```
This will open your browser to authenticate.

### 2. Create a New Heroku App
```bash
cd /path/to/BYC
heroku create byc-dock-manager
```
(You can choose a different app name - it must be unique across all Heroku apps)

### 3. Set Environment Variables
```bash
heroku config:set SESSION_SECRET=$(openssl rand -hex 32)
heroku config:set NODE_ENV=production
```

### 4. Deploy Your Code
```bash
git push heroku claude/add-database-annual-scheduling-01M78YFTXawFNtN7in5YHEVm:main
```

Or if you've merged to main:
```bash
git push heroku main
```

### 5. Open Your Application
```bash
heroku open
```

Your app will be live at: `https://byc-dock-manager.herokuapp.com` (or whatever name you chose)

## Default Login Credentials

After deployment, you can login with:
- **Admin**: username: `admin`, password: `admin123`
- **Member**: username: `member1`, password: `member123`

**⚠️ Important**: Change these passwords immediately after first login!

## Checking Logs

If you encounter any issues:
```bash
heroku logs --tail
```

## Managing Your App

View your app dashboard:
```bash
heroku dashboard
```

Or visit: https://dashboard.heroku.com/apps/byc-dock-manager

## Database Persistence

The SQLite database is stored in the app's file system. Note:
- **Free tier**: Database will reset when app restarts (dyno sleeps)
- **For production**: Consider upgrading to a paid dyno or use Heroku Postgres

To use Postgres instead (recommended for production):
```bash
heroku addons:create heroku-postgresql:mini
```
(This requires updating the code to use PostgreSQL instead of SQLite)

## Cost

- Free tier available (app sleeps after 30 min of inactivity)
- First deployment is completely free
- Upgrade to "Eco" dyno ($5/month) to keep app always running

## Updating Your App

After making changes:
```bash
git add .
git commit -m "Your update message"
git push heroku main
```

## Troubleshooting

**App won't start?**
```bash
heroku logs --tail
heroku ps
```

**Database issues?**
```bash
heroku run npm run init-db
```

**Need to restart?**
```bash
heroku restart
```

## Support

For Heroku-specific issues: https://help.heroku.com/
