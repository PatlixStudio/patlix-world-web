import { Injectable, computed, signal } from '@angular/core';
import type {
  AgentDto,
  AgentStatus,
  EventEnvelope,
  PatlixEvent,
  PlanDto,
  CompanyDto,
  ProjectDto,
  PropertyDto,
  TaskDto,
  ZoneDto,
} from '@patlixworld/shared';
import { PlanStepStatus, TaskStatus } from '@patlixworld/shared';

export interface ChatMessage {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  timestamp: string;
}

/**
 * Single source of truth for the live world on the client. Every `/world`
 * event is applied here via signals; the 3D renderer (WorldAdapter) and the UI
 * read from it. The store never produces events — it only consumes them.
 */
@Injectable({ providedIn: 'root' })
export class WorldStateStore {
  readonly connected = signal(false);
  readonly zones = signal<ZoneDto[]>([]);
  readonly agents = signal<AgentDto[]>([]);
  readonly companies = signal<CompanyDto[]>([]);
  readonly properties = signal<PropertyDto[]>([]);
  readonly projects = signal<ProjectDto[]>([]);
  readonly tasks = signal<TaskDto[]>([]);
  readonly plans = signal<PlanDto[]>([]);
  readonly messages = signal<ChatMessage[]>([]);
  /** Recent envelopes (cap 200) — drives the observability feed. */
  readonly feed = signal<EventEnvelope[]>([]);

  readonly selectedAgentId = signal<string | null>(null);
  readonly selectedAgent = computed(
    () =>
      this.agents().find((agent) => agent.id === this.selectedAgentId()) ??
      null,
  );

  readonly busyAgents = computed(
    () => this.agents().filter((agent) => agent.status !== 'IDLE').length,
  );

  /** Initialize from the REST snapshot (full state before the live stream). */
  setSnapshot(snapshot: {
    zones: ZoneDto[];
    agents: AgentDto[];
    companies: CompanyDto[];
    properties: PropertyDto[];
    projects: ProjectDto[];
    tasks: TaskDto[];
  }): void {
    this.zones.set(snapshot.zones);
    this.agents.set(snapshot.agents);
    this.companies.set(snapshot.companies);
    this.properties.set(snapshot.properties);
    this.projects.set(snapshot.projects);
    this.tasks.set(snapshot.tasks);
  }

  /** Replace the Aurel plans list (REST fetch before the live stream). */
  setPlans(plans: PlanDto[]): void {
    this.plans.set(plans);
  }

  selectAgent(id: string | null): void {
    this.selectedAgentId.set(id);
  }

  /** Apply a single domain event to the store. */
  apply(envelope: EventEnvelope): void {
    this.pushFeed(envelope);
    this.applyEvent(envelope.payload);
  }

  private applyEvent(event: PatlixEvent): void {
    switch (event.type) {
      case 'agent.created':
      case 'agent.updated':
        this.upsertAgent(event.agent);
        break;
      case 'agent.status.changed':
        this.patchAgent(event.agentId, {
          status: event.status as AgentStatus,
        });
        break;
      case 'agent.location.changed':
        this.patchAgent(event.agentId, { location: event.location });
        break;
      case 'agent.task.assigned':
        this.patchAgent(event.agentId, { currentTaskId: event.taskId });
        break;
      case 'agent.message.sent':
        this.pushMessage(event.agentId, event.content, event.toAgentId);
        break;
      case 'task.created':
      case 'task.updated':
        this.upsertTask(event.task);
        break;
      case 'task.completed':
        this.patchTask(event.taskId, {
          status: TaskStatus.COMPLETED,
          progress: 100,
        });
        break;
      case 'task.failed':
        this.patchTask(event.taskId, { status: TaskStatus.FAILED });
        break;
      case 'project.created':
      case 'project.updated':
        this.upsert(this.projects, event.project);
        break;
      case 'property.created':
      case 'property.updated':
        this.upsert(this.properties, event.property);
        break;
      case 'company.created':
      case 'company.updated':
        this.upsert(this.companies, event.company);
        break;
      case 'orchestration.plan.created':
      case 'orchestration.plan.updated':
        this.upsert(this.plans, event.plan);
        break;
      case 'orchestration.plan.step.assigned':
        this.patchPlanStep(event.planId, event.stepId, {
          status: PlanStepStatus.ASSIGNED,
          taskId: event.taskId,
          agentId: event.agentId,
        });
        break;
    }
  }

  private upsert<T extends { id: string }>(
    target: ReturnType<typeof signal<T[]>>,
    item: T,
  ): void {
    const list = target();
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) {
      const next = [...list];
      next[idx] = item;
      target.set(next);
    } else {
      target.set([...list, item]);
    }
  }

  private upsertAgent(agent: AgentDto): void {
    this.upsert(this.agents, agent);
  }

  private upsertTask(task: TaskDto): void {
    this.upsert(this.tasks, task);
  }

  private patchAgent(
    id: string,
    patch: Partial<AgentDto>,
  ): void {
    this.agents.update((list) =>
      list.map((agent) => (agent.id === id ? { ...agent, ...patch } : agent)),
    );
  }

  private patchTask(
    id: string,
    patch: Partial<TaskDto>,
  ): void {
    this.tasks.update((list) =>
      list.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    );
  }

  private patchPlanStep(
    planId: string,
    stepId: string,
    patch: { status: PlanStepStatus; taskId?: string; agentId?: string },
  ): void {
    this.plans.update((list) =>
      list.map((plan) => {
        if (plan.id !== planId) return plan;
        return {
          ...plan,
          steps: plan.steps.map((step) =>
            step.id === stepId ? { ...step, ...patch } : step,
          ),
        };
      }),
    );
  }

  private pushMessage(
    agentId: string,
    content: string,
    toAgentId?: string,
  ): void {
    const agent = this.agents().find((a) => a.id === agentId);
    this.messages.update((list) => [
      ...list.slice(-199),
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        agentId,
        agentName: agent?.name ?? agentId.slice(0, 8),
        content,
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  private pushFeed(envelope: EventEnvelope): void {
    this.feed.update((list) => [...list.slice(-199), envelope]);
  }
}