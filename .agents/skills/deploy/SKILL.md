---
name: deploy
description: Integrate and deploy changes to hannesdiem.de, then coordinate separate QA with agents sharing this workspace. Use when instructed to deploy or when taking over pending deployment QA.
---

Deploy means integrate the task's changes with current `origin/main`, push to
`main`, and verify the corresponding Deploy workflow succeeds. Preserve other
agents' uncommitted work. A successful deployment includes fast checks and HTTP
health checks; browser QA runs separately.

Before QA, inspect your remaining work queue, other active chats working on this
project, and the shared, gitignored `.deploy-qa.json`. Use the installed
`codex-ssh-coordination` skill for discovery and messaging, including its SSH
fallback. Coordinate explicitly:
finish imminent deployments first when that avoids repeating QA, or agree which
active agent will check the batch. Before finishing your task, either complete QA
or hand it to an agent that accepts responsibility. Report deferred QA honestly.

Keep `.deploy-qa.json` as a small JSON object keyed by target origin. Each target
has only the relevant fields:

- `pending`: `revision`, `owner` (chat ID), `scope` (`anonymous` or `login`).
- `running`: `revision`, `owner`, `scope` for the in-flight check.
- `last`: `revision`, `at` (UTC), `scope`, `result` (`passed` or `failed`).

Serialize file edits with `flock .deploy-qa.lock`: read and update while holding
the lock, then release it before running tests. Record successful deployments as
pending; a newer deployment does not replace a running check. Preserve scope
`login` across newer deployments if any unchecked deployment requires it. Claim pending work
in `running` only after checking the current owner's chat. After checking, update
`last`, remove your `running`, and clear only pending work covered by the checked
revision and scope. Failures remain pending with an owner. Retain no prose or
history. Check an owner's chat before taking over an abandoned claim.

Run `npm run test:qa -- --url <target>` against the running site. Include `--auth`
when authentication flows changed or login QA was explicitly requested. Such work
stays pending with scope `login` if the inbox is unavailable; anonymous success
does not satisfy it.
Read [the QA instructions](../../../website/qa/README.md) for inbox access and CI.
For production bookkeeping, read the latest successful Deploy workflow's SHA and
active runs at the start and finish of QA. A newer active or completed deployment
keeps QA pending for that revision. This identifies the deployment batch, not a
runtime-attested commit. CI results can be recorded by the coordinating agent;
local results for a different revision do not validate production.

Choose relevant synthetic tests for the change; `npm run test:synthetic` runs the
complete fixture suite on a separate port. Run the full suite when warranted by
the change or a QA failure, rather than after every deployment. Investigate QA
failures, fix regressions within the task, and report unresolved failures.
