// Run npm install on startup to ensure all dependencies are installed
const { execSync } = require('child_process');

try {
  console.log("Installing dependencies...");
  execSync('npm install', { stdio: 'inherit' }); // executes "npm install" synchronously
  console.log("Dependencies installed!");
} catch (error) {
  console.error("Failed to install dependencies:", error);
}

// Import necessary dependencies
const express = require('express'); // Express framework for building web apps
const serverless = require('serverless-http'); // Wraps Express app for serverless deployment
const cors = require('cors'); // Handles Cross-Origin Resource Sharing
const rateLimit = require('express-rate-limit'); // Middleware for rate limiting requests
const helmet = require('helmet'); // Secures the app by setting various HTTP headers
const path = require('path'); // Node.js module for handling file paths

// Create an instance of an Express app
const app = express();

// Use Helmet to secure HTTP headers
app.use(helmet());

// Set up CORS with allowed origins
const allowedOrigins = [
  /^https?:\/\/(www\.)?ftg-redemption-test\.mybrightsites\.com$/,
  /^https?:\/\/(www\.)?ftg-redemption\.mybrightsites\.com$/,
  /^https?:\/\/(www\.)?redeem\.forbestravelguide\.com$/
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow request if origin matches allowedOrigins regex or if origin is not provided (e.g., same-origin requests)
    if (allowedOrigins.some(regex => regex.test(origin)) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Serve the testing HTML page located in the project root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Set up rate limiting: limit each IP to 100 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Maximum 100 requests per window per IP
});
app.use(limiter);

// Import application routes
const getRedemptionStatus = require('./routes/getRedemptionStatus');
const receiveOrderData = require('./routes/receiveOrderData');

// Mount routes on specific paths
app.use('/api/redemption-code-status', getRedemptionStatus);
app.use('/api', receiveOrderData);

// Global error handling middleware
app.use((err, req, res, next) => {
  if (err) {
    // Send error response if an error occurs
    res.status(500).json({ error: err.message });
  } else {
    next();
  }
});

// Create serverless handler with proper configuration for Alibaba Function Compute
const handler = serverless(app, {
  binary: ['application/octet-stream', 'image/*', 'audio/*', 'video/*', 'font/*']
});

// Export the handler with Alibaba Function Compute compatible interface
exports.handler = async (req, resp, context) => {
  // Call the serverless handler and return the response
  const result = await handler(req, context);
  return result;
};
