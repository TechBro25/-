const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 3000;

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 WhatsApp verification: ${process.env.WHATSAPP_PHONE}`);
  console.log(`🔐 Admin login: ${process.env.ADMIN_EMAIL}`);
});

module.exports = app;