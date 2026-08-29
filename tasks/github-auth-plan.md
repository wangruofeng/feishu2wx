# Implementation Plan: GitHub 登录与加密 AI 配置

## Phase 1: Auth and crypto foundation

- [ ] Define Pages environment types, base64url helpers, AES-GCM config encryption, signed session and OAuth state validation.
- [ ] Add unit tests for encryption round trip, tamper rejection, session verification, and state expiration.

## Phase 2: Pages APIs and storage

- [ ] Add GitHub OAuth start/callback/session/logout Functions.
- [ ] Add authenticated cloud AI-config GET/PUT/DELETE Functions backed by `AI_CONFIGS_KV`.
- [ ] Verify cloud config responses never include API keys and empty key updates retain existing values.

## Phase 3: AI proxy and frontend

- [ ] Require an authenticated cloud config for signed-in Pages chat requests and resolve the selected provider server-side.
- [ ] Add front-end session/config client and settings UI state; retain local BYOK only while signed out.
- [ ] Add login/logout and cloud-config lifecycle tests.

## Phase 4: Verification and deployment handoff

- [ ] Run focused tests, full tests, build, and Functions typecheck.
- [ ] Document KV binding, four required secrets, GitHub OAuth callback, and manual production verification.
