import { getDatabase } from '../database/db.js';

export class Application {
  static findById(id) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT a.*, u.full_name as user_full_name, u.username
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `);
    return stmt.get(id);
  }

  static findBySeason(seasonId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT a.*, u.full_name as user_full_name, u.username
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE a.season_id = ?
      ORDER BY
        CASE a.application_category
          WHEN 'renewal_same' THEN 1
          WHEN 'renewal_larger' THEN 2
          WHEN 'new' THEN 3
        END,
        a.seniority_number ASC
    `);
    return stmt.all(seasonId);
  }

  static findByUser(userId, seasonId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT a.*, u.full_name as user_full_name, u.username
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ? AND a.season_id = ?
    `);
    return stmt.get(userId, seasonId);
  }

  static create(applicationData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO applications (
        season_id, user_id, member_name, seniority_number,
        application_category, boat_name, boat_length, boat_type,
        boat_registration, insurance_coverage, insurance_notes, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      applicationData.seasonId,
      applicationData.userId,
      applicationData.memberName,
      applicationData.seniorityNumber,
      applicationData.applicationCategory,
      applicationData.boatName,
      applicationData.boatLength,
      applicationData.boatType,
      applicationData.boatRegistration,
      applicationData.insuranceCoverage,
      applicationData.insuranceNotes || null,
      applicationData.status || 'pending'
    );

    return Application.findById(result.lastInsertRowid);
  }

  static update(id, updates) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    const allowedFields = [
      'application_category', 'boat_name', 'boat_length', 'boat_type',
      'boat_registration', 'insurance_coverage', 'insurance_notes', 'status'
    ];

    const fieldMap = {
      applicationCategory: 'application_category',
      boatName: 'boat_name',
      boatLength: 'boat_length',
      boatType: 'boat_type',
      boatRegistration: 'boat_registration',
      insuranceCoverage: 'insurance_coverage',
      insuranceNotes: 'insurance_notes',
      status: 'status'
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (updates[key] !== undefined && allowedFields.includes(dbField)) {
        fields.push(`${dbField} = ?`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) {
      return Application.findById(id);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE applications SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return Application.findById(id);
  }

  static updateStatus(id, status) {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE applications SET status = ? WHERE id = ?
    `);

    stmt.run(status, id);
    return Application.findById(id);
  }

  static delete(id) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM applications WHERE id = ?');
    return stmt.run(id);
  }

  static getStatsBySeason(seasonId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
        SUM(CASE WHEN status = 'waitlist' THEN 1 ELSE 0 END) as waitlist
      FROM applications
      WHERE season_id = ?
    `);
    return stmt.get(seasonId);
  }
}
