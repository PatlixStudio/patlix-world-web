import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { WorldStateStore } from './world-state.store';

/**
 * Thin REST client for the Patlix World API. Business state lives in the
 * WorldStateStore; these calls mutate backend state (source of truth) and the
 * live updates arrive back over the WebSocket.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(
    private readonly auth: AuthService,
    private readonly store: WorldStateStore,
  ) {}

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const res = await fetch(`${environment.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(this.auth.authHeader ? { Authorization: this.auth.authHeader } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new Error(body.message ?? `Request failed (${res.status})`);
    }
    return (await res.json()) as T;
  }

  /** Load the full world snapshot into the store. */
  async loadSnapshot(): Promise<void> {
    const snapshot = await this.request<{
      zones: unknown[];
      agents: unknown[];
      companies: unknown[];
      properties: unknown[];
      projects: unknown[];
      tasks: unknown[];
    }>('/world/snapshot');
    this.store.setSnapshot(snapshot as never);
  }

  /** Submit a request to Aurel; returns the created plan. */
  orchestrate(request: {
    title: string;
    description?: string;
    requireApproval?: boolean;
  }): Promise<unknown> {
    return this.request('/orchestration/requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /** Approve a pending plan → assignment + real execution begin. */
  approvePlan(id: string): Promise<unknown> {
    return this.request(`/orchestration/plans/${id}/approve`, { method: 'POST' });
  }

  /** Reject a pending plan (no work is performed). */
  rejectPlan(id: string): Promise<unknown> {
    return this.request(`/orchestration/plans/${id}/reject`, { method: 'POST' });
  }

  listPlans(): Promise<unknown[]> {
    return this.request('/orchestration/plans');
  }

  listToolRuns(): Promise<unknown[]> {
    return this.request('/tools/runs');
  }

  executeTool(dto: {
    taskId: string;
    workdir?: string;
    prompt?: string;
  }): Promise<unknown> {
    return this.request('/tools/execute', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }
}