import { getDatabase } from '../database/db.js';

export class Season {
  static findById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM seasons WHERE id = ?');
    return stmt.get(id);
  }

  static findByYear(year) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM seasons WHERE year = ?');
    return stmt.get(year);
  }

  static getCurrent() {
    const currentYear = new Date().getFullYear();
    return Season.findByYear(currentYear);
  }

  static getAll() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM seasons ORDER BY year DESC');
    return stmt.all();
  }

  static create(seasonData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO seasons (year, application_start_date, application_end_date, bumping_date, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      seasonData.year,
      seasonData.applicationStartDate,
      seasonData.applicationEndDate,
      seasonData.bumpingDate || null,
      seasonData.status || 'planning'
    );

    return Season.findById(result.lastInsertRowid);
  }

  static updateStatus(id, status) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE seasons SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);

    stmt.run(status, id);
    return Season.findById(id);
  }

  static update(id, updates) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    if (updates.applicationStartDate) {
      fields.push('application_start_date = ?');
      values.push(updates.applicationStartDate);
    }
    if (updates.applicationEndDate) {
      fields.push('application_end_date = ?');
      values.push(updates.applicationEndDate);
    }
    if (updates.bumpingDate) {
      fields.push('bumping_date = ?');
      values.push(updates.bumpingDate);
    }
    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE seasons SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return Season.findById(id);
  }

  static isAcceptingApplications(seasonId) {
    const season = Season.findById(seasonId);
    return season && season.status === 'accepting_applications';
  }
}
