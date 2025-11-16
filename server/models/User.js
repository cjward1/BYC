import { getDatabase } from '../database/db.js';
import bcrypt from 'bcrypt';

export class User {
  static findByUsername(username) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  }

  static findById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  static findBySeniority(seniorityNumber) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM users WHERE seniority_number = ?');
    return stmt.get(seniorityNumber);
  }

  static async create(userData) {
    const db = getDatabase();
    const passwordHash = await bcrypt.hash(userData.password, 10);

    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, email, full_name, seniority_number, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userData.username,
      passwordHash,
      userData.email,
      userData.fullName,
      userData.seniorityNumber,
      userData.role || 'member'
    );

    return User.findById(result.lastInsertRowid);
  }

  static async verifyPassword(username, password) {
    const user = User.findByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    // Remove password hash from returned user
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static getAll() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT id, username, email, full_name, seniority_number, role, created_at FROM users ORDER BY seniority_number');
    return stmt.all();
  }

  static update(id, updates) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    if (updates.email) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.fullName) {
      fields.push('full_name = ?');
      values.push(updates.fullName);
    }
    if (updates.role) {
      fields.push('role = ?');
      values.push(updates.role);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE users SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return User.findById(id);
  }

  static async updatePassword(id, newPassword) {
    const db = getDatabase();
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const stmt = db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);

    stmt.run(passwordHash, id);
    return true;
  }
}
