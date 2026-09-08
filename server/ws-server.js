import http from 'http'
import { WebSocketServer } from 'ws'
import { setupWSConnection } from 'y-websocket/bin/utils'

const host = 'localhost'
const port = 1234

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('NeuralSync CRDT Server\n')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (conn, req) => {
  const docName = req.url.slice(1).split('?')[0] || 'default'
  console.log(`[CRDT] Client connected to room: ${docName}`)
  setupWSConnection(conn, req, { docName, gc: true })
})

server.listen(port, host, () => {
  console.log(`[CRDT] WebSocket server running on ws://${host}:${port}`)
})
