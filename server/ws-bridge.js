import { WebSocketServer } from 'ws';
import net from 'net';

const WS_PORT = 9090;   // browser connects here
const TCP_PORT = 9091;  // C++ server listens here

const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
    const tcp = new net.Socket();
    tcp.connect(TCP_PORT, 'localhost');

    ws.on('message', (data) => tcp.write(data + '\n'));
    tcp.on('data', (data) => ws.send(data.toString()));

    ws.on('close', () => tcp.destroy());
    tcp.on('close', () => ws.close());
    tcp.on('error', () => ws.close());
});

console.log(`[Bridge] WS:${WS_PORT} <-> TCP:${TCP_PORT}`);

