import { Component } from '@angular/core';
import { WorldStateStore } from '../../../core/world-state.store';

@Component({
  selector: 'app-task-panel',
  standalone: true,
  templateUrl: './task-panel.html',
  styleUrl: './task-panel.scss',
})
export class TaskPanel {
  get tasks() {
    return this.store.tasks;
  }
  get agents() {
    return this.store.agents;
  }

  constructor(private readonly store: WorldStateStore) {}

  agentName(id?: string): string {
    if (!id) return '—';
    return this.agents().find((agent) => agent.id === id)?.name ?? '—';
  }

  statusClass(status: string): string {
    return status.toLowerCase();
  }
}