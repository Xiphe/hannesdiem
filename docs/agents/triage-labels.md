# Triage labels

[ADR-0001](../adr/0001-independent-issue-label-groups.md) overrides triage's
single-state model. Driver identifies responsibility, not readiness.

| Canonical skill role | Repository representation          |
| -------------------- | ---------------------------------- |
| needs-triage         | `needs: triage`                    |
| needs-info           | `needs: info`                      |
| ready-for-agent      | `driver: agent` + ready            |
| ready-for-human      | `driver: human` + ready            |
| wontfix              | Native closure reason: not planned |
| bug                  | `type: bug`                        |
| enhancement          | `type: enhancement`                |

Ready = open + specified + driver + no outstanding needs/dependencies.
Resolve a need: clear it; info answered: replace `needs: info` with `needs: triage`.
Changing one group preserves others.

Additional labels: `type: documentation`; `needs: help` (blocking outside help).
Types extend beyond triage's bug/enhancement pair.
