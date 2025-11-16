import { getDatabase } from '../database/db.js';

export class Assignment {
  static findById(id) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT a.*, u.full_name, u.username, app.boat_name
      FROM assignments a
      JOIN users u ON a.user_id = u.id
      JOIN applications app ON a.application_id = app.id
      WHERE a.id = ?
    `);
    return stmt.get(id);
  }

  static findBySeason(seasonId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT a.*, u.full_name, u.username, u.seniority_number, app.boat_name
      FROM assignments a
      JOIN users u ON a.user_id = u.id
      JOIN applications app ON a.application_id = app.id
      WHERE a.season_id = ?
      ORDER BY a.segment_name, a.position
    `);
    return stmt.all(seasonId);
  }

  static findByUser(userId, seasonId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT a.*, u.full_name, u.username, app.boat_name
      FROM assignments a
      JOIN users u ON a.user_id = u.id
      JOIN applications app ON a.application_id = app.id
      WHERE a.user_id = ? AND a.season_id = ?
    `);
    return stmt.get(userId, seasonId);
  }

  static create(assignmentData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO assignments (
        season_id, application_id, user_id, segment_name,
        position, boat_length, locked
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      assignmentData.seasonId,
      assignmentData.applicationId,
      assignmentData.userId,
      assignmentData.segmentName,
      assignmentData.position,
      assignmentData.boatLength,
      assignmentData.locked || 0
    );

    return Assignment.findById(result.lastInsertRowid);
  }

  static lock(id) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE assignments SET locked = 1 WHERE id = ?
    `);

    stmt.run(id);
    return Assignment.findById(id);
  }

  static lockByUser(userId, seasonId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE assignments SET locked = 1 WHERE user_id = ? AND season_id = ?
    `);

    stmt.run(userId, seasonId);
  }

  static delete(id) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM assignments WHERE id = ?');
    return stmt.run(id);
  }

  static deleteByUser(userId, seasonId) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM assignments WHERE user_id = ? AND season_id = ?');
    return stmt.run(userId, seasonId);
  }

  static clearUnlockedBySeason(seasonId) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM assignments WHERE season_id = ? AND locked = 0');
    return stmt.run(seasonId);
  }
}
