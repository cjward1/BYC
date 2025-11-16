import { getDatabase } from '../database/db.js';

export class BumpingState {
  static findBySeason(seasonId) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM bumping_state WHERE season_id = ?');
    return stmt.get(seasonId);
  }

  static create(seasonId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO bumping_state (season_id, current_index)
      VALUES (?, 0)
    `);

    const result = stmt.run(seasonId);
    return BumpingState.findBySeason(seasonId);
  }

  static updateIndex(seasonId, currentIndex) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE bumping_state SET current_index = ? WHERE season_id = ?
    `);

    stmt.run(currentIndex, seasonId);
    return BumpingState.findBySeason(seasonId);
  }

  static complete(seasonId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE bumping_state SET completed_at = CURRENT_TIMESTAMP WHERE season_id = ?
    `);

    stmt.run(seasonId);
    return BumpingState.findBySeason(seasonId);
  }

  static reset(seasonId) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM bumping_state WHERE season_id = ?');
    stmt.run(seasonId);
  }
}
