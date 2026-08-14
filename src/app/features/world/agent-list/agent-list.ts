import { Component } from '@angular/core';
import { WorldStateStore } from '../../../core/world-state.store';

@Component({
  selector: 'app-agent-list',
  standalone: true,
  templateUrl: './agent-list.html',
  styleUrl: './agent-list.scss',
})
export class AgentList {
  get agents() {
    return this.store.agents;
  }
  get selectedId() {
    return this.store.selectedAgentId;
  }

  constructor(private readonly store: WorldStateStore) {}

  select(id: string): void {
    this.store.selectAgent(this.selectedId() === id ? null : id);
  }

  statusClass(status: string): string {
    return status.toLowerCase();
  }
}