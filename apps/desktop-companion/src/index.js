import 'dotenv/config';
import { WebSocketServer } from 'ws';

// MVP NOTE:
// - This file exposes a local WS API for the mobile app.
// - In a full implementation, you will also connect to OBS via obs-websocket and call:
//   - StartReplayBuffer / SaveReplayBuffer
//   - TakeSourceScreenshot
//   - Optional: listen for replay-saved events
//
// For now, it demonstrates the event relay and clip marker state machine.

const port = Number(process.env.COMPANION_PORT || 8787);

/** Clip marker state */
let clipStartTs = null;

const wss = new WebSocketServer({ port });
console.log(`[companion] WS listening on ws://127.0.0.1:${port}`);

wss.on('connection', (socket) => {
  socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(String(raw));

      // Expected messages from mobile:
      // { type: 'marker.clipStart', ts: <unix ms>, source: 'button|gesture|voice' }
      // { type: 'marker.clipEnd', ts: <unix ms>, source: 'button|gesture|voice' }

      if (msg.type === 'marker.clipStart') {
        clipStartTs = msg.ts;
        broadcast({ type: 'ack', ack: 'clipStart', ts: msg.ts });
        return;
      }

      if (msg.type === 'marker.clipEnd') {
        const clipEndTs = msg.ts;
        const start = clipStartTs ?? (clipEndTs - 30_000);
        clipStartTs = null;

        // TODO: call OBS SaveReplayBuffer and trim to [start, clipEndTs]
        // For scaffold: emit a placeholder clipSaved event.
        broadcast({
          type: 'media.clipSaved',
          path: 'sessions/<sessionId>/media/clips/placeholder.mp4',
          startTs: start,
          endTs: clipEndTs,
          durationMs: Math.max(0, clipEndTs - start)
        });
        return;
      }

      broadcast({ type: 'echo', msg });

    } catch (e) {
      broadcast({ type: 'error', message: 'Invalid JSON', detail: String(e) });
    }
  });
});

function broadcast(obj) {
  const data = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(data);
  }
}
