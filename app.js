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
exports.handler = async (req, resp, context) => {
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

    // Response data to capture Express output
    let responseData = {
      statusCode: 200,
      headers: {},
      body: ''
    };

    const expressRes = {
      statusCode: 200,
      headers: {},
      body: '',
      status: function(code) {
        this.statusCode = code;
        responseData.statusCode = code;
        return this;
      },
      set: function(key, value) {
        this.headers[key] = value;
        responseData.headers[key] = value;
        return this;
      },
      json: function(body) {
        this.set('Content-Type', 'application/json');
        const jsonBody = JSON.stringify(body);
        this.body = jsonBody;
        responseData.body = jsonBody;
      },
      send: function(body) {
        this.body = body;
        responseData.body = body;
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

    // Process the request through Express app - but wait for completion
    await new Promise((resolve, reject) => {
      app(expressReq, expressRes, (err) => {
        if (err) {
          responseData.statusCode = 500;
          responseData.headers['Content-Type'] = 'application/json';
          responseData.body = JSON.stringify({ error: err.message });
          resolve();
        } else {
          resolve();
        }
      });
    });

    // Apply the collected response data to Alibaba's response object
    resp.statusCode = responseData.statusCode;
    
    // Set headers directly on resp.headers
    resp.headers = resp.headers || {};
    Object.keys(responseData.headers).forEach(header => {
      resp.headers[header] = responseData.headers[header];
    });
    
    // Return the body directly - this is what Alibaba Function Compute expects
    return responseData.body;
    
  } catch (error) {
    // Set error status code if possible
    if (resp && typeof resp.statusCode !== 'undefined') {
      resp.statusCode = 500;
    }
    
    // Set headers if possible
    if (resp && typeof resp.headers !== 'undefined') {
      resp.headers = resp.headers || {};
      resp.headers['Content-Type'] = 'application/json';
    }
    
    // Return error response as string
    return JSON.stringify({ error: error.message });
  }
};

// Start server if running locally
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
