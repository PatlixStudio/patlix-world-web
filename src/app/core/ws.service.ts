import { Injectable, signal } from '@angular/core';
import { io, type Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { WorldStateStore } from './world-state.store';

/**
 * WebSocket client for the `/world` namespace. Connects with the JWT on the
 * handshake and pipes every incoming `event` envelope into the WorldStateStore.
 */
@Injectable({ providedIn: 'root' })
export class WorldSocketService {
  private socket: Socket | null = null;

  constructor(private readonly store: WorldStateStore) {}

  connect(token: string): void {
    this.disconnect();
    this.socket = io(`${environment.wsUrl}/world`, {
      auth: { token },
      transports: ['websocket'],
    });
    this.socket.on('connect', () => this.store.connected.set(true));
    this.socket.on('disconnect', () => this.store.connected.set(false));
    this.socket.on('connect_error', () => this.store.connected.set(false));
    this.socket.on('event', (envelope) => this.store.apply(envelope));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.store.connected.set(false);
  }
}