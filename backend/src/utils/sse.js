// src/utils/sse.js
import { EventEmitter } from 'events';

// Create a global event emitter for SSE
const sseEmitter = new EventEmitter();

// Store connected clients
const clients = new Set();

/**
 * Add a new SSE client
 */
export function addSSEClient(res) {
  clients.add(res);
  
  // Remove client when connection closes
  res.on('close', () => {
    clients.delete(res);
  });
}

/**
 * Emit event to all connected SSE clients
 */
export function emitEvent(type, data) {
  console.log(`📡 SSE Emit: ${type}`, data);
  
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString()
  });
  
  // Send to all connected clients
  clients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (err) {
      console.error('Error sending SSE message:', err);
      clients.delete(client);
    }
  });
  
  // Also emit to event emitter for other uses
  sseEmitter.emit(type, data);
}

/**
 * Get SSE event emitter
 */
export function getSSEEmitter() {
  return sseEmitter;
}
