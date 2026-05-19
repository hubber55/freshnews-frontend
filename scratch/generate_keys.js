const crypto = require('crypto');

const secret = "2ab66d967f03456470870b033c50532498c96d42961655e224fad6d1abbbe5d5";

function signToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = crypto.createHmac('sha256', secret)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');
    
  return `${base64Header}.${base64Payload}.${signature}`;
}

const anonPayload = {
  role: "anon",
  iss: "supabase",
  iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 3600) // 10 years expiry
};

const servicePayload = {
  role: "service_role",
  iss: "supabase",
  iat: Math.floor(Date.now() / 1000) - 3600,
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 3600)
};

console.log("--- GENERATED KEYS ---");
console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:");
console.log(signToken(anonPayload));
console.log("\nSUPABASE_SERVICE_ROLE_KEY:");
console.log(signToken(servicePayload));
