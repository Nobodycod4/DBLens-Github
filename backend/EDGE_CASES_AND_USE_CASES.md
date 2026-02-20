# Edge Cases and Use Cases Not Covered (or Partially Covered) in DBLens

This document lists **edge cases** (boundary/error scenarios the app doesn’t fully handle) and **use cases** (features or workflows users might expect but that don’t exist yet). It is scoped to the **DBLens 2** codebase.

---

## 1. Authentication & sessions

| Item | Type | Description |
|------|------|-------------|
| **Forgot / reset password** | Use case | Frontend has `/forgot-password` and a “Reset instructions sent” flow, but there is **no backend** `POST /auth/forgot-password` or reset-token flow. The page only simulates success. |
| **Concurrent sessions** | Edge case | Multiple tabs or devices: refresh token rotation and session invalidation are not clearly documented; “logout everywhere” or “revoke other sessions” is not exposed. |
| **Token in URL** | Edge case | If a link ever passes a token as a query param, it could leak in Referer or logs; no explicit guard against token-in-URL. |
| **Session expiry UX** | Edge case | After 401 + failed refresh, the app redirects to login and shows a toast; there is no “session expired” modal or “you were logged out elsewhere” message. |

---

## 2. Authorization & API protection

| Item | Type | Description |
|------|------|-------------|
| **Unprotected routes** | Edge case | Several routes use only `Depends(get_db)` and **not** `Depends(get_current_user)` (e.g. backups: create, list, download, delete, restore; migrations: list, get, start, status, clone; audit-logs list). If the API is called without `Authorization`, those actions may still run. Auth may be enforced elsewhere (e.g. gateway); if not, this is a gap. |
| **RBAC on resources** | Edge case | Permission checks (e.g. “can this user access this connection?”) are not consistently applied on backups, migrations, and audit-logs; roles define “audit.export” but there is no export implementation to gate. |
| **Org-scoped access** | Edge case | Frontend sends `X-Org-Id`; backend may not enforce that the user can only see/edit connections (or backups, migrations) belonging to that org. |

---

## 3. Backups

| Item | Type | Description |
|------|------|-------------|
| **Concurrent backup same connection** | Edge case | Two “Create backup” requests for the same connection can both create rows with `IN_PROGRESS` and run backups in parallel; no “already in progress” check. |
| **Disk full during backup** | Edge case | If the backup directory runs out of space during write, the process may fail without a clear “disk full” message or cleanup of partial files. |
| **Restore overwrite confirmation** | Use case | Restore always overwrites the **same** connection the backup was taken from. There is no “This will overwrite the current database. Confirm?” step in the API or UI. |
| **Restore to different connection** | Use case | Restore is fixed to the original connection. Users cannot “restore this backup into connection B” (e.g. clone to another server). |
| **Backup list pagination bounds** | Edge case | `list_backups` uses `skip` and `limit` with defaults but no `Query(..., ge=..., le=...)`; very large or negative values could be accepted (unlike audit_logs which uses `ge=0, le=500`). |
| **Backup in progress when connection deleted** | Edge case | If a connection is deleted while its backup is still running, the background backup may keep running and write to a path that is no longer tied to a valid connection. |

---

## 4. Migrations

| Item | Type | Description |
|------|------|-------------|
| **Source = target** | Edge case | **Handled:** API returns 400 “Source and target cannot be the same”. |
| **Concurrent migrations same target** | Edge case | Two migrations targeting the same DB could run at once; no “target busy” lock or queue. |
| **Migration list pagination bounds** | Edge case | `skip` and `limit` have no `Query` bounds (e.g. `limit` could be 1_000_000). |
| **Failed migration row** | Use case | Doc mentions keeping a failed migration row (e.g. `status=FAILED`, `error_message`) instead of deleting it so the UI can show the failure reason; not implemented. |
| **Very long migration** | Edge case | Long-running migration can hit HTTP/client timeouts; status polling helps but there is no “job timeout” or “cancel after N hours” policy. |

---

## 5. Query execution

| Item | Type | Description |
|------|------|-------------|
| **Read-only vs write** | Edge case | Read path validates SELECT/SHOW/DESCRIBE/EXPLAIN and blocks dangerous keywords; write path (`execute_write_query`) exists separately with `confirm`. Need to ensure no route allows write without confirmation. |
| **Multiple statements** | Edge case | Validation is by keyword and first token; a string like `SELECT 1; DROP TABLE x` might be rejected by keyword, but `SELECT 1; SELECT 2` could be driver-dependent (single vs multiple execution). No explicit “single statement only” rule. |
| **Query length / size limit** | Edge case | No explicit max length for the query string; extremely long queries could stress the server or DB. |
| **Result set size** | Edge case | `QueryRequest.limit` is 1–1000; the executor appends `LIMIT` for SQL when missing. Very wide or heavy rows could still cause memory pressure; no streaming or cursor-based export. |
| **Execution timeout** | Edge case | Some code paths use 10s or 30s timeouts; not consistently configurable per connection or per request. |

---

## 6. Connections & schema

| Item | Type | Description |
|------|------|-------------|
| **Connection list pagination** | Edge case | `list_databases` uses `skip` and `limit` with no bounds; same as backups/migrations. |
| **Connection name uniqueness** | Edge case | Uniqueness is checked at create; it may be global rather than per-organization, so two orgs cannot have a connection with the same name if that’s desired. |
| **Test connection timeout** | Edge case | `DatabaseConnector.test_connection` may not expose a short timeout; a hanging host could block the request. |
| **Schema diagram scale** | Edge case | Very large schemas (hundreds of tables) may slow or overwhelm the schema diagram UI; no “load partial” or “filter by table name”. |

---

## 7. Audit logs

| Item | Type | Description |
|------|------|-------------|
| **Export audit logs** | Use case | RBAC defines “audit.export” but there is **no** export endpoint (e.g. CSV/JSON download) or UI for “Export”. |
| **Audit log retention** | Use case | No automated retention or “delete logs older than N days”; table can grow unbounded. |
| **Filter by date range / actor** | Use case | List supports pagination; rich filters (date range, user, action type, resource) may be partial or missing in API/UI. |

---

## 8. Pagination & list APIs

| Item | Type | Description |
|------|------|-------------|
| **Consistent bounds** | Edge case | `audit_logs` uses `Query(0, ge=0, le=500)` for skip/limit; `backups`, `migrations`, `databases` do not. Negative or huge values could be accepted. |
| **Skip beyond total** | Edge case | Returning `items=[]` when `skip >= total` is fine; some UIs don’t handle “total=0” or “empty last page” consistently. |

---

## 9. Frontend & UX

| Item | Type | Description |
|------|------|-------------|
| **429 rate limit** | Edge case | API returns 429 with `Retry-After`; frontend doesn’t specifically show “Too many requests; retry after X seconds” or auto-retry with backoff. |
| **Offline / no network** | Edge case | “Network Error” is caught and a toast is shown; there is no offline indicator or queue-for-later for actions. |
| **Large file download** | Edge case | Backup download is streaming; very large backups might still hit browser or proxy limits; no “download in chunks” or resume. |
| **Form validation** | Edge case | Connection form (host, port, name, etc.) may not validate everything (e.g. port range, hostname format) before submit; backend may return 422 with detail. |

---

## 10. Infrastructure & config

| Item | Type | Description |
|------|------|-------------|
| **Backup directory quota** | Edge case | No check that the backup filesystem has enough free space before starting a backup. |
| **ENCRYPTION_KEY rotation** | Edge case | If `ENCRYPTION_KEY` is rotated, old encrypted backups cannot be decrypted; no key-versioning or re-encrypt workflow. |
| **Rate limit per user** | Edge case | Rate limiting is per-IP; one user behind a shared IP can exhaust the limit for others. |

---

## 11. Optional / nice-to-have use cases

| Item | Type | Description |
|------|------|-------------|
| **Read-only connection flag** | Use case | Mark a connection as “read-only” and block any write/restore/backup that would modify it. |
| **Scheduled migrations** | Use case | Migrations can be tied to schedules; full “run migration at 2am every Sunday” with retries and notifications may be partial. |
| **Webhook on migration complete/fail** | Use case | Fields like `webhook_url`, `notify_on_complete`, `notify_on_failure` exist; implementation and testing may be partial. |
| **Connection usage / cost** | Use case | No “connection usage” or “cost” view (e.g. backup size per connection, query count). |
| **API keys for automation** | Use case | If API keys exist, scoping (e.g. “this key can only run backups”) and rotation are worth defining. |

---

## Summary table

| Category           | Edge cases | Use cases |
|--------------------|------------|-----------|
| Auth & sessions    | 3          | 1 (forgot/reset password) |
| Authorization      | 3          | 0         |
| Backups            | 4          | 2 (restore confirm, restore to different connection) |
| Migrations         | 3          | 2 (keep failed row, long-run policy) |
| Query execution    | 5          | 0         |
| Connections        | 3          | 0         |
| Audit logs         | 0          | 3 (export, retention, filters) |
| Pagination         | 2          | 0         |
| Frontend/UX        | 4          | 0         |
| Infrastructure     | 3          | 0         |
| Nice-to-have       | 0          | 5         |

**Suggested priorities**

1. **High:** Auth on backups/migrations/audit-logs (or document that a gateway enforces it); restore confirmation; forgot-password backend (or remove the UI).  
2. **Medium:** Concurrent backup/migration guards; pagination bounds; audit export and retention.  
3. **Lower:** Key rotation story; per-user rate limits; read-only connection flag; UX for 429 and offline.
