import { Component, type OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlanStatus, type PlanDto } from '@patlixworld/shared';
import { ApiService } from '../../../core/api.service';
import { WorldStateStore } from '../../../core/world-state.store';

@Component({
  selector: 'app-plan-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './plan-panel.html',
  styleUrl: './plan-panel.scss',
})
export class PlanPanel implements OnInit {
  get plans() {
    return this.store.plans;
  }
  readonly title = signal('');
  readonly description = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly actingOn = signal<string | null>(null);

  constructor(
    private readonly api: ApiService,
    private readonly store: WorldStateStore,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const plans = (await this.api.listPlans()) as PlanDto[];
      this.store.setPlans(plans);
    } catch {
      // Live events will fill the panel; a REST failure is non-fatal.
    }
  }

  async submit(): Promise<void> {
    const title = this.title().trim();
    if (!title || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.orchestrate({
        title,
        description: this.description().trim() || undefined,
        requireApproval: true,
      });
      this.title.set('');
      this.description.set('');
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  isPendingApproval(plan: PlanDto): boolean {
    return plan.status === PlanStatus.PENDING_APPROVAL;
  }

  async approve(plan: PlanDto): Promise<void> {
    this.actingOn.set(plan.id);
    this.error.set(null);
    try {
      await this.api.approvePlan(plan.id);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.actingOn.set(null);
    }
  }

  async reject(plan: PlanDto): Promise<void> {
    this.actingOn.set(plan.id);
    this.error.set(null);
    try {
      await this.api.rejectPlan(plan.id);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.actingOn.set(null);
    }
  }

  statusClass(status: string): string {
    return status.toLowerCase();
  }
}