import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let SQL = null;
let db = null;

export async function initDatabase() {
  try {
    // Initialize SQL.js
    if (!SQL) {
      SQL = await initSqlJs();
    }

    // Ensure data directory exists
    const dbDir = dirname(config.database.path);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    // Load or create database
    if (existsSync(config.database.path)) {
      const buffer = readFileSync(config.database.path);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    // Read and execute schema
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);

    // Save database to file
    saveDatabase();

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function saveDatabase() {
  if (db && config.database.path) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(config.database.path, buffer);
  }
}

export function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}
