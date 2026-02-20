# Backend Test Results

**Date:** Run after `pip3 install email-validator` (from project backend directory)  
**Command:** `python3 -m pytest tests/ -v --tb=short`

---

## Session info

- **Platform:** darwin (macOS)
- **Python:** 3.9.13
- **pytest:** 8.4.2
- **Rootdir:** DBLens 2/backend
- **Config:** pytest.ini
- **Plugins:** asyncio 1.2.0, anyio 4.12.0
- **Asyncio:** mode=auto, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function

---

## Summary

| Metric        | Count |
|---------------|-------|
| **Collected** | 51    |
| **Passed**    | 42    |
| **Failed**    | 9     |
| **Warnings**  | 15    |
| **Duration** | ~2.08s |

---

## Per-test results

### API tests

| Test | Result |
|------|--------|
| tests/api/test_auth.py::test_setup_status_when_no_users | PASSED |
| tests/api/test_auth.py::test_register_validation_short_password | **FAILED** |
| tests/api/test_auth.py::test_register_validation_weak_password | PASSED |
| tests/api/test_auth.py::test_login_missing_credentials | PASSED |
| tests/api/test_auth.py::test_login_wrong_credentials | PASSED |
| tests/api/test_exception_handler.py::test_unhandled_exception_returns_500_and_correlation_id | **FAILED** |
| tests/api/test_health.py::test_root | PASSED |
| tests/api/test_health.py::test_health_live | PASSED |
| tests/api/test_health.py::test_health | PASSED |
| tests/api/test_health.py::test_metrics | PASSED |
| tests/api/test_health.py::test_health_ready_without_db | PASSED |
| tests/api/test_health.py::test_api_v1_health_exists | **FAILED** |
| tests/api/test_list_endpoints.py::test_audit_logs_list_returns_items_and_total | PASSED |
| tests/api/test_list_endpoints.py::test_migrations_list_returns_items_and_total | PASSED |
| tests/api/test_list_endpoints.py::test_backups_list_returns_items_and_total | PASSED |
| tests/api/test_middleware.py::test_request_id_in_response | PASSED |
| tests/api/test_middleware.py::test_security_headers_present | PASSED |
| tests/api/test_middleware.py::test_rate_limit_header_on_response | **FAILED** |

### Unit tests

| Test | Result |
|------|--------|
| tests/unit/test_backup_encryption.py::TestIsEncryptedPath::test_returns_true_for_enc_suffix | PASSED |
| tests/unit/test_backup_encryption.py::TestIsEncryptedPath::test_returns_true_for_enc_in_basename | PASSED |
| tests/unit/test_backup_encryption.py::TestIsEncryptedPath::test_returns_false_for_plain_path | PASSED |
| tests/unit/test_backup_encryption.py::TestEncryptDecryptRoundtrip::test_encrypt_backup_file_creates_enc_file_and_removes_original | PASSED |
| tests/unit/test_backup_encryption.py::TestEncryptDecryptRoundtrip::test_decrypt_backup_to_file | PASSED |
| tests/unit/test_config.py::TestSettings::test_is_production_false_when_development | PASSED |
| tests/unit/test_config.py::TestSettings::test_is_production_true_when_production | PASSED |
| tests/unit/test_config.py::TestSettings::test_is_production_case_insensitive | PASSED |
| tests/unit/test_config.py::TestSettings::test_validate_production_secrets_passes_in_development | PASSED |
| tests/unit/test_config.py::TestSettings::test_validate_production_secrets_raises_in_production_with_default_jwt | PASSED |
| tests/unit/test_config.py::TestSettings::test_validate_production_secrets_raises_in_production_with_default_encryption_key | PASSED |
| tests/unit/test_config.py::TestSettings::test_database_url_format | PASSED |
| tests/unit/test_config.py::TestSettings::test_cors_origins_default_no_wildcard | PASSED |
| tests/unit/test_logging.py::TestRequestIdCtx::test_default_empty | PASSED |
| tests/unit/test_logging.py::TestRequestIdCtx::test_set_and_get | PASSED |
| tests/unit/test_logging.py::TestGetLogger::test_returns_logger | PASSED |
| tests/unit/test_logging.py::TestGetLogger::test_same_name_same_logger | PASSED |
| tests/unit/test_logging.py::TestRequestIdFilter::test_filter_adds_request_id_to_record | PASSED |
| tests/unit/test_rate_limiter.py::TestCheckApiRateLimit::test_allows_first_request | PASSED |
| tests/unit/test_rate_limiter.py::TestCheckApiRateLimit::test_allows_under_limit | PASSED |
| tests/unit/test_rate_limiter.py::TestCheckApiRateLimit::test_denies_over_limit | PASSED |
| tests/unit/test_rate_limiter.py::TestCheckApiRateLimit::test_different_ips_tracked_separately | **FAILED** |
| tests/unit/test_security.py::TestHashPassword::test_returns_non_empty_string | **FAILED** |
| tests/unit/test_security.py::TestHashPassword::test_different_each_time | **FAILED** |
| tests/unit/test_security.py::TestVerifyPassword::test_verifies_correct_password | **FAILED** |
| tests/unit/test_security.py::TestVerifyPassword::test_rejects_wrong_password | **FAILED** |
| tests/unit/test_security.py::TestVerifyPassword::test_rejects_invalid_hash_gracefully | PASSED |
| tests/unit/test_security.py::TestValidatePassword::test_accepts_valid_password | PASSED |
| tests/unit/test_security.py::TestValidatePassword::test_rejects_short_password | PASSED |
| tests/unit/test_security.py::TestValidatePassword::test_rejects_no_uppercase | PASSED |
| tests/unit/test_security.py::TestValidatePassword::test_rejects_no_lowercase | PASSED |
| tests/unit/test_security.py::TestValidatePassword::test_rejects_no_digit | PASSED |
| tests/unit/test_security.py::TestValidatePassword::test_rejects_no_special_char | PASSED |

---

## Failure details

### 1. test_register_validation_short_password (test_auth.py)

- **Assertion:** `assert r.status_code == 400`
- **Actual:** `422` (Unprocessable Entity)
- **Reason:** Short password is rejected by Pydantic validation (422) before the route returns 400 for business-rule validation. Test expectation could be updated to accept 422 or the API could return 400 for this case.

### 2. test_unhandled_exception_returns_500_and_correlation_id (test_exception_handler.py)

- **Error:** `RuntimeError: Intentional DB failure for test` propagated to the client instead of being caught by the global exception handler.
- **Reason:** The exception is raised in dependency resolution; the handler may not be wrapping dependency failures, or the test hits a code path where the 500 response is not returned (e.g. middleware/stream handling). The test expects 500 with `correlation_id` in the JSON body.

### 3. test_api_v1_health_exists (test_health.py)

- **Error:** `ModuleNotFoundError: No module named 'psutil'`
- **Reason:** The `/api/v1/health/` route (or a dependency) imports or uses `psutil`, which is not installed in the test environment. Add `psutil` to requirements or make the import optional.

### 4. test_rate_limit_header_on_response (test_middleware.py)

- **Error:** `ModuleNotFoundError: No module named 'psutil'`
- **Reason:** Same as above; the app or middleware uses `psutil` when handling the request.

### 5. test_different_ips_tracked_separately (test_rate_limiter.py)

- **Assertion:** `assert False is True` (or equivalent—second IP was expected to be allowed).
- **Reason:** Rate limiter may be keyed by something other than IP in tests (e.g. shared state or single key), so the second “different IP” is still considered over limit.

### 6–9. test_security.py (4 failures)

- **Tests:** `test_returns_non_empty_string`, `test_different_each_time`, `test_verifies_correct_password`, `test_rejects_wrong_password`
- **Error:** `ValueError: password cannot be longer than 72 bytes, truncate manually if necessary`
- **Reason:** passlib’s bcrypt backend uses an internal 72-byte test during initialization (`detect_wrap_bug`). Combined with `AttributeError: module 'bcrypt' has no attribute '__about__'` (version check), this points to a passlib/bcrypt version mismatch: newer `bcrypt` vs older passlib expectations. Environment-specific; may pass with a different bcrypt/passlib combination (e.g. in CI or another venv).

---

## Warnings summary

- **Pydantic:** Several schemas use class-based `config`; deprecated in Pydantic v2 in favor of `ConfigDict` (e.g. `DatabaseConnectionResponse`, `ColumnInfo`, `AuditLogResponse`, `HealthMetricResponse`, `BackupResponse`, `BackupScheduleResponse`, `SnapshotResponse`, `MigrationResponse`).
- **FastAPI:** `on_event("startup")` and `on_event("shutdown")` are deprecated; recommended to use lifespan event handlers instead.

---

## How to re-run

From **DBLens 2/backend** with dependencies installed (including `email-validator`):

```bash
pip install -r requirements.txt -r requirements-dev.txt
# If needed: pip install email-validator psutil
pytest tests/ -v --tb=short
```

To capture output again into a file:

```bash
pytest tests/ -v --tb=short 2>&1 | tee result.txt
```
