import { spawn } from 'child_process';
import http from 'http';

const server = spawn('npm', ['run', 'dev'], { shell: true });

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('Next.js:', output);
  if (output.includes('Ready in') || output.includes('started server on') || output.includes('ready started server')) {
    console.log("Server ready, making request...");
    http.get('http://localhost:3000/api/debug/test-edit', (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log("RESPONSE:", body);
        server.kill();
        process.exit(0);
      });
    }).on('error', (e) => {
      console.error("Request error:", e);
      server.kill();
      process.exit(1);
    });
  }
});

server.stderr.on('data', (data) => {
  console.error('Next.js Error:', data.toString());
});
