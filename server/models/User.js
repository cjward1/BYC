import { getDatabase, saveDatabase } from '../database/db.js';
import bcrypt from 'bcryptjs';

export class User {
  static findByUsername(username) {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM users WHERE username = ?', [username]);

    if (!result.length || !result[0].values.length) return null;

    const columns = result[0].columns;
    const values = result[0].values[0];
    const row = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx];
    });
    return row;
  }

  static findById(id) {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM users WHERE id = ?', [id]);

    if (!result.length || !result[0].values.length) return null;

    const columns = result[0].columns;
    const values = result[0].values[0];
    const row = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx];
    });
    return row;
  }

  static findBySeniority(seniorityNumber) {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM users WHERE seniority_number = ?', [seniorityNumber]);

    if (!result.length || !result[0].values.length) return null;

    const columns = result[0].columns;
    const values = result[0].values[0];
    const row = {};
    columns.forEach((col, idx) => {
      row[col] = values[idx];
    });
    return row;
  }

  static async create(userData) {
    const db = getDatabase();
    const passwordHash = await bcrypt.hash(userData.password, 10);

    db.run(`
      INSERT INTO users (username, password_hash, email, full_name, seniority_number, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userData.username,
      passwordHash,
      userData.email,
      userData.fullName,
      userData.seniorityNumber,
      userData.role || 'member'
    ]);

    saveDatabase();

    const result = db.exec('SELECT last_insert_rowid() as id');
    const newId = result[0].values[0][0];

    return User.findById(newId);
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
    const result = db.exec('SELECT id, username, email, full_name, seniority_number, role, created_at FROM users ORDER BY seniority_number');

    if (!result.length || !result[0].values.length) return [];

    const columns = result[0].columns;
    return result[0].values.map(values => {
      const row = {};
      columns.forEach((col, idx) => {
        row[col] = values[idx];
      });
      return row;
    });
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

    db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();

    return User.findById(id);
  }

  static async updatePassword(id, newPassword) {
    const db = getDatabase();
    const passwordHash = await bcrypt.hash(newPassword, 10);

    db.run(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [passwordHash, id]);
    saveDatabase();

    return true;
  }
}
