import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { WorldStateStore } from '../../../core/world-state.store';

@Component({
  selector: 'app-inspector',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './inspector.html',
  styleUrl: './inspector.scss',
})
export class Inspector {
  get agent() {
    return this.store.selectedAgent;
  }
  get tasks() {
    return this.store.tasks;
  }

  constructor(private readonly store: WorldStateStore) {}

  tasksFor(agentId: string) {
    return this.tasks().filter((task) => task.assignedAgentId === agentId);
  }
}