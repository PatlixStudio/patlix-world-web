import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { WorldStateStore } from '../../../core/world-state.store';

@Component({
  selector: 'app-chat-feed',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './chat-feed.html',
  styleUrl: './chat-feed.scss',
})
export class ChatFeed {
  get messages() {
    return this.store.messages;
  }
  get feed() {
    return this.store.feed;
  }
  readonly tab = signal<'chat' | 'events'>('chat');

  constructor(private readonly store: WorldStateStore) {}

  switchTab(tab: 'chat' | 'events'): void {
    this.tab.set(tab);
  }

  shortType(type: string): string {
    return type;
  }
}