# Use independent issue-label groups and native GitHub status

Use `prefix: value` labels: independent `needs:` and `driver:` groups,
normally at most one per group. Unlike the skills' single-state model,
this preserves responsibility while blocked (`driver: agent` + `needs: info`).

Status/outcomes use native GitHub issue state and closure reasons.
Extend labels on demand; defer experience/accessibility labels.
Mappings: [triage labels](../agents/triage-labels.md).
