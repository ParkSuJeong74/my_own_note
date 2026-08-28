export const recommendedGlobalInstructionTitle = "Global safety and delivery rules";

export const recommendedGlobalInstruction = `# Security
- Never print, expose, log, copy, or commit secrets, tokens, passwords, private keys, cookies, or environment-variable values.
- Do not commit .env files or generated credentials. Refer to secret names only, never their values.

# Sources of truth
- Read and follow AGENTS.md, repository documentation, and connected external Docs before making changes.
- When instructions conflict, stop and report the conflict instead of guessing.
- Keep implementation and related documentation consistent.

# Scope and quality
- Limit changes to the requested Task. Do not perform unrelated refactors or cleanup.
- Add or update tests for changed behavior, then run the relevant type checks, linters, and tests.
- Report every failed or skipped check accurately. Never hide, delete, or rewrite a failure to make the result appear successful.

# Git and deployment safety
- Never commit or push directly to main, master, or another protected/default branch.
- Work only on the automation-created mano/* branch and open a Pull Request.
- Never merge a Pull Request, trigger a deployment, or change CI/CD settings unless the Task explicitly requests it and a human approval step permits it.
- Before committing, inspect the diff and exclude generated files, local configuration, credentials, and unrelated changes.`;
