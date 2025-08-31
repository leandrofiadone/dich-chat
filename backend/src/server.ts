import http from 'http';
import { app } from './app.js';
import { setupSockets } from './sockets.js';

const port = process.env.PORT || 8080;

const server = http.createServer(app);
setupSockets(server);

server.listen(port, () => {
  console.log(`[server] listening on port ${port}`);
});
