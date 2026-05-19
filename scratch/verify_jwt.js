const crypto = require('crypto');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc4ODY5ODAwLCJleHAiOjE5MzY2MzYyMDB9.9s1We9fcPL4DNehqzfFFk4fVGV_fUfrglkniEd0Yk7s";
const secretHex = "2ab66d967f03456470870b033c50532498c96d42961655e224fad6d1abbbe5d5";

const [header, payload, signature] = token.split('.');
const message = `${header}.${payload}`;

// Test 1: Literal plain text secret
const hmacPlain = crypto.createHmac('sha256', secretHex)
  .update(message)
  .digest('base64url');

console.log("Test 1 (Literal plain text):", hmacPlain === signature ? "MATCH!" : "No match");

// Test 2: Hex-decoded byte array secret
const hmacHex = crypto.createHmac('sha256', Buffer.from(secretHex, 'hex'))
  .update(message)
  .digest('base64url');

console.log("Test 2 (Hex-decoded bytes):", hmacHex === signature ? "MATCH!" : "No match");
