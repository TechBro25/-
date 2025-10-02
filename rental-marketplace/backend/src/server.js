require('dotenv').config();
const app = require('./app');
const Database = require('./db');

const PORT = process.env.PORT || 3000;

// Initialize database connection
const db = new Database();

async function startServer() {
  try {
    // Connect to database
    await db.connect();
    
    // Make database available to the app
    app.locals.db = db;
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Rental Marketplace server running on port ${PORT}`);
      console.log(`📱 WhatsApp Support: ${process.env.WHATSAPP_NUMBER || '09154609327'}`);
      console.log(`🌐 Frontend: http://localhost:${PORT}`);
      console.log(`🔧 Admin Panel: http://localhost:${PORT}/admin.html`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await db.close();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await db.close();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();