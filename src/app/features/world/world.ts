import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Inject,
  effect,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { WorldSocketService } from '../../core/ws.service';
import { WorldStateStore } from '../../core/world-state.store';
import type { WorldAdapter } from '../../core/world-adapter';
import { WORLD_ADAPTER } from '../../core/world-adapter';
import { ThreeWorldAdapter } from '../../three/three-world-adapter';
import { RendererService } from '../../three/renderer.service';
import { AgentList } from './agent-list/agent-list';
import { Inspector } from './inspector/inspector';
import { TaskPanel } from './task-panel/task-panel';
import { PlanPanel } from './plan-panel/plan-panel';
import { ChatFeed } from './chat-feed/chat-feed';

@Component({
  selector: 'app-world',
  standalone: true,
  imports: [AgentList, Inspector, TaskPanel, PlanPanel, ChatFeed],
  templateUrl: './world.html',
  styleUrl: './world.scss',
  providers: [{ provide: WORLD_ADAPTER, useClass: ThreeWorldAdapter }],
})
export class World implements OnInit {
  @ViewChild('viewport') viewport!: ElementRef<HTMLElement>;

  constructor(
    private readonly auth: AuthService,
    private readonly api: ApiService,
    private readonly socket: WorldSocketService,
    private readonly store: WorldStateStore,
    @Inject(WORLD_ADAPTER) private readonly adapter: WorldAdapter,
    private readonly renderer: RendererService,
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

  ngAfterViewInit(): void {
    this.renderer.mount(this.viewport.nativeElement);
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