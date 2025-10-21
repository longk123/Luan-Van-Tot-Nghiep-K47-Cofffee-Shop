// File path: D:\my-thesis\backend\src\utils\eventBus.js
// src/utils/eventBus.js
import { EventEmitter } from 'events';

export const bus = new EventEmitter();

// helper gói chuẩn dữ liệu
export function emitChange(type, payload) {
  bus.emit('change', { type, payload, ts: Date.now() });
}
