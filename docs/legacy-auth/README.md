# Archived email authentication (inactive)

The previous public email login, email registration, and email password reset are **not** part of the current phone-only pilot. The exact source removed by commit `998eb8a44cf6593c8b6dcaf4c185f261f0736fd7` is retained in [`restore-email-auth-from-c2e7850.patch`](restore-email-auth-from-c2e7850.patch). This is a readable, inactive source archive: it is not imported, built, served, or reachable as a route. Keeping thousands of lines as live-file comments would obscure the code that actually runs.

The patch includes the original components, BFF handlers, service, translations, and their related changes from `c2e78507dfe304c36c51b88eff4e359f04163d25`. To inspect an old file without applying anything:

```bash
git show c2e78507dfe304c36c51b88eff4e359f04163d25:components/auth/LoginForm.tsx
```

For a future, separately approved product change, branch from the current code and compare the patch with the then-current backend contract. Do not blindly apply it to a newer branch: those endpoints included a now-disabled email sign-in and their response/session contracts have changed. The archive preserves source for adaptation, not a switch that bypasses the phone-only pilot.
