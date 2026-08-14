import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

/**
 * JWT auth state for the web client. Persists the token in localStorage and
 * hands it to the WebSocket service for the `/world` handshake.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'patlixworld.token';
  readonly token = signal<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem(this.TOKEN_KEY) : null,
  );
  readonly user = signal<AuthUser | null>(null);

  get authHeader(): string {
    return this.token() ? `Bearer ${this.token()}` : '';
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${environment.apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return this.handle(res);
  }

  async register(dto: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<LoginResponse> {
    const res = await fetch(`${environment.apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    return this.handle(res);
  }

  private async handle(res: Response): Promise<LoginResponse> {
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(
        body.message ?? `Request failed (${res.status})`,
      );
    }
    const data = (await res.json()) as LoginResponse;
    this.token.set(data.accessToken);
    this.user.set(data.user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, data.accessToken);
    }
    return data;
  }

  logout(): void {
    this.token.set(null);
    this.user.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }
}