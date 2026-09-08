import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Aura IDE...');
console.log('Make sure C++ server is compiled: run build_server.bat first');
console.log('Make sure Python AI server is running: python server/ai_server.py\n');

// Node.js static file server (unchanged)
const staticServer = spawn('node', [path.join(__dirname, 'server/static-server.js')], {
    stdio: 'inherit'
});

// WebSocket bridge: browser <-> C++ TCP server
const wsBridge = spawn('node', [path.join(__dirname, 'server/ws-bridge.js')], {
    stdio: 'inherit'
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    staticServer.kill('SIGINT');
    wsBridge.kill('SIGINT');
    process.exit(0);
});
