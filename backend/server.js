require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS
app.use(cors());

// Body parser middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local uploaded images statically
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));
console.log(`📂 Uploads directory served statically at /uploads -> ${uploadsDir}`);

// Wire API routes
const reportsRouter = require('./routes/reports');
const statsRouter = require('./routes/stats');
const aiRouter = require('./routes/ai');

app.use('/api/reports', reportsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/ai', aiRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: process.env.GEMINI_API_KEY ? 'live' : 'mock'
  });
});

// Intercept all invalid /api requests and return JSON 404
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.url} not found` });
});

// Serve frontend static files in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
  console.log(`🌐 Production mode: Serving React frontend from ${frontendDistPath}`);
} else {
  app.get('/', (req, res) => {
    res.send('🏠 Community Hero API Server running! Frontend dist not found. Run "npm run build:frontend" to compile static assets.');
  });
  console.log('ℹ️ Development mode: Serving API endpoints only. Run frontend separately via Dev Server.');
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("🔴 Express Server Error:", err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: "Image size exceeds the maximum allowed limit of 20 MB. Please choose a smaller image or compress it before uploading." });
  }
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// Start listening
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Community Hero Server listening at http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Global unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔴 Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

// Global uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('🔴 Uncaught Exception thrown:', error);
});
