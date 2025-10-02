require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 RentalHub Server Started');
  console.log('================================');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`⚡ API: http://localhost:${PORT}/api`);
  console.log(`👨‍💼 Admin Panel: http://localhost:${PORT}/admin`);
  console.log(`📱 WhatsApp Support: 091-546-09327`);
  console.log('================================');
  console.log('');
});
