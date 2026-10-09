# Evidence

Proof of building with CodeBuddy, plus screenshots of the app working. CodeBuddy sessions used the rules file [CODEBUDDY.md](../CODEBUDDY.md) and the one-feature prompt pattern:

```
@CODEBUDDY.md @<files>
CONTEXT: <what those files are>
TASK: <one feature, one sentence>
RULES: follow CODEBUDDY.md. <task-specific rule>
DONE WHEN: <testable criteria>
```

## CodeBuddy sessions

Screenshots ending `-a` and `-b` are two views of the same session.

| Day | Screenshot | What was built |
|---|---|---|
| 1 | [D1-scaffold-a](D1-scaffold-a.png) · [b](D1-scaffold-b.png) | Monorepo scaffold (web, api, core) |
| 1 | [D1-core-port-a](D1-core-port-a.png) · [b](D1-core-port-b.png) | Port of the patient record and metrics to `packages/core` with tests |
| 1 | [D1-rules-a](D1-rules-a.png) · [b](D1-rules-b.png) | Alert rules with tests |
| 1 | [D1-db-a](D1-db-a.png) · [b](D1-db-b.png) | SQLite schema, migration, seed and loader |
| 1 | [D1-api-doc-a](D1-api-doc-a.png) · [b](D1-api-doc-b.png) | API contract and shared types |
| 1 | [D1-components-1a](D1-components-1a.png) · [b](D1-components-1b.png) | Design tokens, shared components and gallery |
| 1 | [D1-shell-a](D1-shell-a.png) · [b](D1-shell-b.png) | App shell, routing, mock API, SOS |
| 1 | [D1-fix-ci-1a](D1-fix-ci-1a.png) · [b](D1-fix-ci-1b.png), [D1-fix-ci-3a](D1-fix-ci-3a.png) · [b](D1-fix-ci-3b.png) | CI fixes (GitHub Actions green) |
| 1 | [D1-deploy-a](D1-deploy-a.png) · [b](D1-deploy-b.png) | Free-host deploy path, auto-seed, PORT support |
| 1 | [D1-codebuddy-adp-test](D1-codebuddy-adp-test.png) | ADP chat API test script |
| 2 | [D2-auth-a](D2-auth-a.png) · [b](D2-auth-b.png) | Login with phone + PIN, sessions, patient scoping |