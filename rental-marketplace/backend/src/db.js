const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './database.sqlite';

class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          resolve(this.db);
        }
      });
    });
  }

  async migrate() {
    if (!this.db) await this.connect();
    
    const migrationPath = path.join(__dirname, '../migrations/init.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    return new Promise((resolve, reject) => {
      this.db.exec(migration, (err) => {
        if (err) {
          console.error('Migration failed:', err);
          reject(err);
        } else {
          console.log('Migration completed successfully');
          resolve();
        }
      });
    });
  }

  async seed() {
    if (!this.db) await this.connect();
    
    const seedPath = path.join(__dirname, '../seeds/seed.sql');
    const seedData = fs.readFileSync(seedPath, 'utf8');
    
    return new Promise((resolve, reject) => {
      this.db.exec(seedData, (err) => {
        if (err) {
          console.error('Seeding failed:', err);
          reject(err);
        } else {
          console.log('Database seeded successfully');
          resolve();
        }
      });
    });
  }

  query(sql, params = []) {
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

  run(sql, params = []) {
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

  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) console.error('Error closing database:', err);
          else console.log('Database connection closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// CLI commands for migration and seeding
if (require.main === module) {
  const db = new Database();
  const command = process.argv[2];

  (async () => {
    try {
      if (command === 'migrate') {
        await db.migrate();
      } else if (command === 'seed') {
        await db.seed();
      } else {
        console.log('Usage: node db.js [migrate|seed]');
      }
    } catch (error) {
      console.error('Command failed:', error);
      process.exit(1);
    } finally {
      await db.close();
    }
  })();
}

module.exports = Database;