export interface AuthProvider {
  getAccessToken(): Promise<string | null>;
  refresh(): Promise<void>;
  signOut(): Promise<void>;
  // TODO(BE): clarify Bearer vs Cookie auth, refresh endpoint, expiry windows, and SSO flow.
}
