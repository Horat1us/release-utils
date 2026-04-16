# Changelog

## [4.12.0] - 2026-04-16

### Added
- `send-notification`: new optional `--environment` CLI flag and `RELEASE_ENVIRONMENT` env variable (values: `dev`, `test`, `staging`, `production`)
- When provided, a `Environment: <emoji> <label>.` line is included in the Telegram message, placed before the version line
- Resolution priority: `env.json` field → `--environment=<value>` CLI argument → `RELEASE_ENVIRONMENT` environment variable