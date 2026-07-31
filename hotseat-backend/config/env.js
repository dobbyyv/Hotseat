const path = require('path');
require('dotenv').config();

const {
  DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT,
  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL,
  CORS_ORIGIN, SERVER_PORT = '5000'
} = process.env;

// The server will refuse to start if any are missing.
const required = [
  'DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT',
  'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_EMAIL',
  'CORS_ORIGIN'
];

const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(
    `[FATAL] Missing required environment variables: ${missing.join(', ')}\n` +
    `Check your .env file against .env.example.`
  );
  process.exit(1);
}

module.exports = {
  DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT: parseInt(DB_PORT, 10),
  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL,
  CORS_ORIGIN, SERVER_PORT: parseInt(SERVER_PORT, 10)
};