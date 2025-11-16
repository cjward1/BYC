import { getDatabase } from '../database/db.js';

export class OptimalPlan {
  static findBySeason(seasonId) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM optimal_plans WHERE season_id = ?');
    const row = stmt.get(seasonId);

    if (row) {
      // Parse the JSON plan data
      row.plan_data = JSON.parse(row.plan_data);
    }

    return row;
  }

  static save(seasonId, planData) {
    const db = getDatabase();

    // Delete existing plan if any
    const deleteStmt = db.prepare('DELETE FROM optimal_plans WHERE season_id = ?');
    deleteStmt.run(seasonId);

    // Insert new plan
    const insertStmt = db.prepare(`
      INSERT INTO optimal_plans (season_id, pump_out_start, total_boats, total_length, plan_data)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      seasonId,
      planData.pumpOutStart,
      planData.maxBoats,
      planData.totalLength,
      JSON.stringify(planData)
    );

    return OptimalPlan.findBySeason(seasonId);
  }
}
