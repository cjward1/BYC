# Bordentown Yacht Club Dock Planner

This repository contains a self-contained web application for managing Bordentown Yacht Club dock applications, generating an optimal dock plan, and facilitating the bumping party selection process.

## Getting started

No build step is required. Open `webapp/index.html` in a modern browser to launch the tool.

## Features

- Collects member applications (member, seniority, category, boat specs, and insurance details).
- Validates that insurance coverage meets the $500,000 liability requirement and that boat lengths use whole feet.
- Optimizes dock assignments using the club’s small dock and both sides of the main dock while respecting the pump-out zone, spacing requirements, and bumping order priorities.
- Summarizes assigned boats and waitlisted applications after optimization.
- Guides the bumping party process so members lock in their dock locations sequentially without reducing the maximum achievable boat count.
- Provides a dock visualization with clickable slots that snap to the 3-foot spacing standard and clearly marks the pump-out zone on the main outside dock.

## Project layout

```
webapp/
├── index.html      # Entry point
└── src/
    ├── main.js     # Application logic and UI rendering
    └── styles.css  # Styling for the interface and dock visualization
```

## Notes

- The optimizer considers all permissible pump-out zone locations that cover the 515’ mark and selects the placement that admits the most boats.
- Dock segments always maintain 3 feet of separation between boats in both the optimization and bumping workflows.
