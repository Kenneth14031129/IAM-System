const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./config/database');
const { securityHeaders } = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const roleRoutes = require('./routes/roles');
const moduleRoutes = require('./routes/modules');
const permissionRoutes = require('./routes/permissions');
const relationshipRoutes = require('./routes/relationships');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(securityHeaders);

// Routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', groupRoutes);
app.use('/api', roleRoutes);
app.use('/api', moduleRoutes);
app.use('/api', permissionRoutes);
app.use('/api', relationshipRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Debug route for API
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working', environment: process.env.NODE_ENV });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database
try {
  console.log('Initializing database...');
  initDatabase();
  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('❌ Error initializing database:', error.message);
}

// For Vercel, export the app instead of listening
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log('Default admin credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
  });
}

module.exports = app;