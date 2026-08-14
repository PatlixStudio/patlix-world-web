import { Component, OnInit, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { WorldSocketService } from '../../core/ws.service';
import { WorldStateStore } from '../../core/world-state.store';
import { ConsoleWorldAdapter } from '../../core/world-adapter';
import { AgentList } from './agent-list/agent-list';
import { Inspector } from './inspector/inspector';
import { TaskPanel } from './task-panel/task-panel';
import { PlanPanel } from './plan-panel/plan-panel';
import { ChatFeed } from './chat-feed/chat-feed';

@Component({
  selector: 'app-world',
  standalone: true,
  imports: [
    AgentList,
    Inspector,
    TaskPanel,
    PlanPanel,
    ChatFeed,
  ],
  templateUrl: './world.html',
  styleUrl: './world.scss',
})
export class World implements OnInit {
  constructor(
    private readonly auth: AuthService,
    private readonly api: ApiService,
    private readonly socket: WorldSocketService,
    private readonly store: WorldStateStore,
    private readonly adapter: ConsoleWorldAdapter,
    private readonly router: Router,
  ) {
    effect(() => {
      this.adapter.setZones(this.store.zones());
      this.adapter.setAgents(this.store.agents());
      this.adapter.setTasks(this.store.tasks());
    });
  }

  async ngOnInit(): Promise<void> {
    if (!this.auth.token()) {
      await this.router.navigate(['/']);
      return;
    }
    try {
      await this.api.loadSnapshot();
    } catch (err) {
      console.error('snapshot failed', err);
    }
    this.socket.connect(this.auth.token() as string);
  }

  get connected() {
    return this.store.connected;
  }
  get agents() {
    return this.store.agents;
  }
  get zones() {
    return this.store.zones;
  }
  get busyAgents() {
    return this.store.busyAgents;
  }
  get user() {
    return this.auth.user;
  }

  logout(): void {
    this.socket.disconnect();
    this.auth.logout();
    void this.router.navigate(['/']);
  }
}