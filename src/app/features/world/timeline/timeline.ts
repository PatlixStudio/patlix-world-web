import { Component, signal } from '@angular/core';
import type { EventEnvelope } from '@patlixworld/shared';
import { WorldStateStore } from '../../../core/world-state.store';

type Filter = 'all' | 'agent' | 'task' | 'plan' | 'system';

const GROUPED: Record<Filter, RegExp> = {
  all: /.*/,
  agent: /^(agent|orchestration\.plan\.step)/,
  task: /^task/,
  plan: /^orchestration\.plan/,
  system: /^(project|property|company)/,
};

/** Live observability feed: every domain event with type coloring + filters. */
@Component({
  selector: 'app-timeline',
  standalone: true,
  template: `
    <section class="timeline">
      <div class="head">
        <h2>Live events</h2>
        <div class="filters">
          @for (f of filters; track f) {
            <button [class.on]="filter() === f" (click)="filter.set(f)">{{ f }}</button>
          }
        </div>
      </div>
      <ul>
        @for (event of visible(); track event.id) {
          <li>
            <span class="dot {{ groupOf(event.type) }}"></span>
            <span class="t">{{ time(event.timestamp) }}</span>
            <span class="type">{{ shortType(event.type) }}</span>
          </li>
        } @empty {
          <li class="empty">Waiting for world events…</li>
        }
      </ul>
    </section>
  `,
  styles: `
    .timeline {
      h2 {
        margin: 0;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #93b6d6;
      }
      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .filters {
        display: flex;
        gap: 4px;
        button {
          background: none;
          border: 1px solid rgba(120, 190, 255, 0.2);
          color: #6d92b4;
          border-radius: 999px;
          font-size: 9px;
          padding: 1px 7px;
          cursor: pointer;
          text-transform: uppercase;
          &.on {
            background: rgba(79, 163, 255, 0.25);
            color: #cfe6ff;
            border-color: #4aa3ff;
          }
        }
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 210px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      li {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        font-family: ui-monospace, monospace;
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex: none;
          &.agent { background: #8fd0ff; }
          &.task { background: #ffe08a; }
          &.plan { background: #c9b0ff; }
          &.system { background: #6fe08a; }
        }
        .t { color: #4a6a8a; flex: none; }
        .type { color: #cfe6ff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      }
      .empty { color: #6d92b4; font-size: 11px; }
    }
  `,
})
export class Timeline {
  readonly filters: Filter[] = ['all', 'agent', 'task', 'plan', 'system'];
  readonly filter = signal<Filter>('all');

  constructor(private readonly store: WorldStateStore) {}

  get feed() {
    return this.store.feed;
  }

  visible(): EventEnvelope[] {
    const f = this.filter();
    return this.store.feed().filter((e) => GROUPED[f].test(e.type)).slice(-80);
  }

  groupOf(type: string): string {
    if (/^orchestration\.plan/.test(type)) return 'plan';
    if (/^task/.test(type)) return 'task';
    if (/^(project|property|company)/.test(type)) return 'system';
    return 'agent';
  }

  shortType(type: string): string {
    return type.length > 48 ? `${type.slice(0, 45)}…` : type;
  }

  time(iso: string): string {
    return new Date(iso).toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}