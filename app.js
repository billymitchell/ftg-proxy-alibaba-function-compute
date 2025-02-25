const express = require('express');
const serverless = require('serverless-http'); // Required for Function Compute
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path'); // added dependency

const app = express();

// Secure headers
app.use(helmet());

// Set up CORS
const allowedOrigins = [
  /^https?:\/\/(www\.)?ftg-redemption-test\.mybrightsites\.com$/,
  /^https?:\/\/(www\.)?ftg-redemption\.mybrightsites\.com$/,
  /^https?:\/\/(www\.)?redeem\.forbestravelguide\.com$/
];

app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.some(regex => regex.test(origin)) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

// Middleware to parse JSON body
app.use(express.json());

// Serve the testing HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rate Limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
});
app.use(limiter);

// Import routes
const getRedemptionStatus = require('./routes/getRedemptionStatus');
const receiveOrderData = require('./routes/receiveOrderData');

// Use the routes
app.use('/api/redemption-code-status', getRedemptionStatus);
app.use('/api', receiveOrderData);

// Error handling middleware
app.use((err, req, res, next) => {
  if (err) {
    res.status(500).json({ error: err.message });
  } else {
    next();
  }
});

// ✅ Export as a function for Alibaba Function Compute
module.exports.handler = serverless(app);
