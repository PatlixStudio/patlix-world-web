import { TestBed } from '@angular/core/testing';
import type {
  AgentDto,
  EventEnvelope,
  ZoneDto,
} from '@patlixworld/shared';
import { TaskStatus } from '@patlixworld/shared';
import { AgentStatus } from '@patlixworld/shared';
import { PlanStatus, PlanStepStatus } from '@patlixworld/shared';
import { WorldStateStore } from './world-state.store';

describe('WorldStateStore', () => {
  let store: WorldStateStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(WorldStateStore);
  });

  const envelope = (payload: EventEnvelope['payload']): EventEnvelope => ({
    id: 'evt-1',
    type: payload.type,
    timestamp: new Date().toISOString(),
    payload,
  });

  it('loads a snapshot', () => {
    const zone: ZoneDto = {
      id: 'beach',
      name: 'Beach',
      kind: 'beach',
      center: { x: 0, y: 0, z: 0 },
      radius: 100,
    };
    store.setSnapshot({
      zones: [zone],
      agents: [],
      companies: [],
      properties: [],
      projects: [],
      tasks: [],
    });
    expect(store.zones().length).toBe(1);
    expect(store.zones()[0].name).toBe('Beach');
  });

  it('applies agent.created and agent.status.changed events', () => {
    const agent: AgentDto = {
      id: 'a-1',
      name: 'Developer-01',
      role: 'Backend Developer',
      persona: 'focused',
      status: AgentStatus.IDLE,
      model: { provider: 'openrouter', model: 'x' },
      location: { zoneId: 'hq', x: 1, y: 0, z: 2, heading: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.apply(envelope({ type: 'agent.created', agent }));
    expect(store.agents().length).toBe(1);

    store.apply(
      envelope({
        type: 'agent.status.changed',
        agentId: 'a-1',
        status: AgentStatus.WORKING,
        previous: 'IDLE',
      }),
    );
    expect(store.agents()[0].status).toBe('WORKING');
    expect(store.busyAgents()).toBe(1);
  });

  it('applies task events and message events', () => {
    store.apply(
      envelope({
        type: 'agent.message.sent',
        agentId: 'a-1',
        content: 'working on it',
      }),
    );
    expect(store.messages().length).toBe(1);
    expect(store.messages()[0].agentName).toBe('a-1');

    store.apply(
      envelope({
        type: 'task.completed',
        taskId: 't-1',
      }),
    );
    // no matching task yet → patch is a no-op, feed still recorded
    expect(store.feed().length).toBe(2);
  });

  it('selects an agent for the inspector', () => {
    const agent: AgentDto = {
      id: 'a-2',
      name: 'Aurel',
      role: 'Orchestrator',
      persona: '',
      status: AgentStatus.IDLE,
      model: { provider: 'openrouter', model: 'x' },
      location: { zoneId: 'hq', x: 0, y: 0, z: 0, heading: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.apply(envelope({ type: 'agent.created', agent }));
    store.selectAgent('a-2');
    expect(store.selectedAgent()?.name).toBe('Aurel');
    store.selectAgent(null);
    expect(store.selectedAgent()).toBeNull();
  });

  it('handles plan.step.assigned against a known plan', () => {
    store.apply(
      envelope({
        type: 'orchestration.plan.created',
        plan: {
          id: 'p-1',
          requestTitle: 'Fix login',
          requestDescription: '',
          status: PlanStatus.ACTIVE,
          steps: [
            {
              id: 'step-1',
              title: 'Analyze',
              description: '',
              role: 'Backend Developer',
              status: PlanStepStatus.PENDING,
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    );
    store.apply(
      envelope({
        type: 'orchestration.plan.step.assigned',
        planId: 'p-1',
        stepId: 'step-1',
        taskId: 't-1',
        agentId: 'a-1',
      }),
    );
    const step = store.plans()[0].steps[0];
    expect(step.status).toBe('ASSIGNED');
    expect(step.taskId).toBe('t-1');
  });

  it('replaces the plan list via setPlans', () => {
    store.setPlans([
      {
        id: 'p-9',
        requestTitle: 'Footer',
        requestDescription: '',
        status: PlanStatus.PENDING_APPROVAL,
        steps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    expect(store.plans()[0].status).toBe(PlanStatus.PENDING_APPROVAL);
    expect(store.plans().length).toBe(1);
  });
});