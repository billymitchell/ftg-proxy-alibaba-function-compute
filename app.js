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
const cors = require('cors'); // Handles Cross-Origin Resource Sharing
const rateLimit = require('express-rate-limit'); // Middleware for rate limiting requests
const helmet = require('helmet'); // Secures the app by setting various HTTP headers
const path = require('path'); // Node.js module for handling file paths
const { URL } = require('url'); // For handling URLs and query parameters

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

// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: false }));

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

// Function to parse query parameters using URLSearchParams
function parseQueryParams(url) {
  try {
    // Handle URLs that might not have a protocol by adding a dummy one
    const urlWithProtocol = url.startsWith('http') ? url : `http://dummy.com${url}`;
    const urlObj = new URL(urlWithProtocol);
    const params = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return {};
  }
}

// Export direct handler function for Alibaba Function Compute
exports.handler = (req, resp, context) => {
  try {
    // Create Express request and response objects
    const expressReq = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.queries || parseQueryParams(req.url),
      params: {},
      path: req.path,
      get: (header) => req.headers[header.toLowerCase()]
    };

    const expressRes = {
      statusCode: 200,
      headers: {},
      body: '',
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      set: function(key, value) {
        this.headers[key] = value;
        return this;
      },
      json: function(body) {
        this.set('Content-Type', 'application/json');
        this.body = JSON.stringify(body);
        this.send(this.body);
      },
      send: function(body) {
        this.body = body;
        
        // Transfer to Alibaba Function Compute response
        resp.statusCode = this.statusCode;
        
        // Set headers
        Object.keys(this.headers).forEach(header => {
          resp.setHeader(header, this.headers[header]);
        });
        
        // Set body
        resp.send(this.body);
      },
      sendFile: function(filePath) {
        const fs = require('fs');
        try {
          const content = fs.readFileSync(filePath);
          const ext = path.extname(filePath);
          const contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif'
          }[ext] || 'text/plain';
          
          this.set('Content-Type', contentType);
          this.send(content);
        } catch (error) {
          this.status(404).send('File not found');
        }
      }
    };

    // Process the request through Express app
    app(expressReq, expressRes, (err) => {
      if (err) {
        // Use the appropriate properties/methods for the Alibaba response object
        resp.statusCode = 500;
        resp.setHeader('Content-Type', 'application/json');
        resp.send(JSON.stringify({ error: err.message }));
      }
    });

    console.log('Response object methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(resp)));
    console.log('Response object properties:', Object.keys(resp));
  } catch (error) {
    // Handle errors - use the appropriate properties/methods for Alibaba
    resp.statusCode = 500;
    resp.setHeader('Content-Type', 'application/json');
    resp.send(JSON.stringify({ error: error.message }));
  }
};

// Start server if running locally
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
