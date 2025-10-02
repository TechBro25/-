const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './rental_marketplace.db';

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Promisify database methods for easier async/await usage
db.runAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

db.getAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Run migrations
async function runMigrations() {
  try {
    const migrationFile = path.join(__dirname, '../migrations/init.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await db.runAsync(statement);
      }
    }
    
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

// Run seeds
async function runSeeds() {
  try {
    const seedFile = path.join(__dirname, '../seeds/seed.sql');
    const sql = fs.readFileSync(seedFile, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await db.runAsync(statement);
      }
    }
    
    console.log('✅ Seeds completed successfully');
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  }
}

// CLI commands
if (require.main === module) {
  const command = process.argv[2];
  
  (async () => {
    try {
      if (command === 'migrate') {
        await runMigrations();
      } else if (command === 'seed') {
        await runSeeds();
      } else {
        console.log('Usage: node db.js [migrate|seed]');
      }
      db.close();
    } catch (error) {
      console.error('Error:', error);
      db.close();
      process.exit(1);
    }
  })();
}

module.exports = db;
