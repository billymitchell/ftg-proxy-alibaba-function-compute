# Proxy Server Application

## Overview

A Node.js and Express.js-based proxy server that handles redemption codes, interfacing with Airtable to manage and update redemption statuses.

## Features

- **Receive Order Data:** Processes incoming order data and updates redemption statuses in Airtable.
- **Get Redemption Status:** Retrieves the status of redemption codes with caching for improved performance.
- **Security:** Implements rate limiting, CORS restrictions, and secure HTTP headers using Helmet.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Dependencies](#dependencies)
- [Environment Variables](#environment-variables)
- [License](#license)

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v12 or later)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Git](https://git-scm.com/)

### Steps

1. **Clone the repository:**

   ```sh
   git clone <repository-url>
   ```

2. **Navigate to the project directory:**

   ```sh
   cd <project-directory>
   ```

3. **Install dependencies:**

   ```sh
   npm install
   ```

4. **Configure Environment Variables:**

   Create a .env file in the root directory based on the provided .env file and set your Airtable API key:

   ```sh
   cp .env.example .env
   ```

## Running the Application

1. **Start the server:**

   ```sh
   npm start
   ```

   The server will run on the port specified in the .env file or default to port 3000.

## API Endpoints

### POST /api/order-data

Receives order data and updates redemption statuses in Airtable.

### GET /api/redemption-code-status/:redemptionCode

Retrieves the status of a specific redemption code.

## Project Structure

- [`app.js`](app.js): Entry point of the application. Sets up the Express server and middleware.
- [`routes/receiveOrderData.js`](routes/receiveOrderData.js): Handles POST requests to receive and process order data.
- [`routes/getRedemptionStatus.js`](routes/getRedemptionStatus.js): Handles GET requests to fetch the status of a redemption code.
- [`utils/airtable.js`](utils/airtable.js): Contains functions to interact with the Airtable API.
- [`utils/cache.js`](utils/cache.js): Implements caching for redemption code statuses.
- [`package.json`](package.json): Project dependencies and scripts.
- [`Procfile`](Procfile): Configuration for deploying the application.
- [`.env`](.env): Environment variables, including Airtable API key.

## Dependencies

- **Express:** Web framework for Node.js.
- **Airtable:** Client for interacting with the Airtable API.
- **dotenv:** Loads environment variables from a .env file.
- **helmet:** Secures Express apps by setting various HTTP headers.
- **cors:** Enables Cross-Origin Resource Sharing.
- **express-rate-limit:** Basic rate-limiting middleware for Express.

For a full list of dependencies, refer to the package.json file.

## Environment Variables

- `AIRTABLE_API_KEY`: Your Airtable API key.

## License

