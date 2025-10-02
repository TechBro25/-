const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './database.sqlite';

class Database {
  constructor() {
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async runMigrations() {
    try {
      const migrationPath = path.join(__dirname, '../migrations/init.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await this.run(statement);
        }
      }
      
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async runSeeds() {
    try {
      const seedPath = path.join(__dirname, '../seeds/seed.sql');
      const seedSQL = fs.readFileSync(seedPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = seedSQL.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await this.run(statement);
        }
      }
      
      console.log('✅ Database seeding completed');
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Create singleton instance
const db = new Database();

// Initialize database on startup
async function initializeDatabase() {
  try {
    await db.connect();
    await db.runMigrations();
    await db.runSeeds();
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Initialize if this file is run directly
if (require.main === module) {
  initializeDatabase();
}

// Export functions for npm scripts
module.exports = { 
  db, 
  initializeDatabase,
  runMigrations: async () => {
    await db.connect();
    await db.runMigrations();
    await db.close();
  },
  runSeeds: async () => {
    await db.connect();
    await db.runSeeds();
    await db.close();
  }
};