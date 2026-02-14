export interface AuthContext {
  token?: string;
}

export interface AuthProvider {
  getAuthContext(): Promise<AuthContext>;
}
