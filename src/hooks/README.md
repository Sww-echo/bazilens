# Hooks

Custom React hooks. Spec: `.trellis/spec/frontend/state-management.md` (Server State 同步).

| Hook | What it does | Backed by |
|------|-------------|-----------|
| `useReading` | Drives a streaming AI reading via SSE; tracks delta/done/error | `api/readings.ts` `streamReading()` |
| `useReportProgress` | Live PDF progress + auto signed-URL fetch on `ready` | `api/reports.ts` Realtime |
| `useSubscription` | Reads + syncs current user's subscription row | `api/subscriptions.ts` |
| `useCharts` | Lists / creates / deletes / favourites charts | `api/charts.ts` |

UI components consume these — never import `api/` directly from a component.
