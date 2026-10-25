/**
 * THRIVE&CO - Backend API Server
 * Node.js & Express.js REST API
 * Marian College of Engineering | CSE 2026-2027
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files (SPA)
app.use(express.static(path.join(__dirname, '..')));

// MongoDB Connection (graceful fallback if local Mongo is not running)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/thrive_and_co';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB (thrive_and_co)'))
  .catch(err => {
    console.warn('⚠️ MongoDB connection note:', err.message);
    console.warn('💡 Tip: Ensure MongoDB service is running (mongod) or use cloud MongoDB Atlas URI in .env');
  });

// Routes (Appendix A)
app.use('/api/facilities', require('./routes/facilities'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/blood-stock', require('./routes/bloodStock'));
app.use('/api/alerts', require('./routes/alerts'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'THRIVE&CO Healthcare Resource Management System',
    timestamp: new Date().toISOString()
  });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Thrive&Co Server listening on http://localhost:${PORT}`);
});
