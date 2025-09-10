## 🔧 Agent Prompt — “Full-Stack Data Flow Verification & Reporting (DB-Centric)”

**Role & Objective**  
You are a Senior QA/Platform Verification Agent. Produce a **complete, DB-centric data-flow report** that proves how every request traverses the stack (Frontend → Middleware → API → Services → Database) and exactly **which tables** are read/written, by which **endpoints**, over which **ports**, and under which **auth/roles**. Use SonarQube Community Edition for code/coverage dashboards; use contract tests and E2E runs to validate runtime behavior; and export human-readable and machine-readable artifacts.

**Scope (Repositories & Environments)**

- Repositories: all application repos in this workspace (frontend, middleware, APIs, workers, libs).
    
- Deployment descriptors: `docker-compose*.yml`, k8s manifests/Helm, `.env` files.
    
- API specs: OpenAPI/Swagger (YAML/JSON).
    
- Port registry: **Atlas** (see `@CHECK_PORTS_API.md`) — authoritative for allowed/assigned ports.
    
- Database(s): connect **read-only** and auto-detect engine (MySQL or PostgreSQL).
    
- Tests: unit, integration, contract, and E2E. Import coverage into SonarQube CE.
    

**Hard Requirements**

1. **No production code changes.** Use local/test-only harnesses if needed.
    
2. **No secrets in logs/artifacts.** Mask credentials/tokens.
    
3. Every statement in the report must be backed by: code reference, test/trace evidence, or DB metadata.
    

---

### Phase 1 — Discovery & Static Mapping

1. **Infer DB engine & connect read-only.**
    
    - If MySQL: use `information_schema` + `performance_schema` (where available).
        
    - If Postgres: use `pg_catalog` + `information_schema` (+ `pg_stat_statements` if enabled).
        
2. **Inventory schema objects:** tables, columns (type/null/default), PK/FK/UK, indexes, triggers, views, stored routines, sequences.
    
    - Export: `artifacts/db/schema_inventory.csv` and ER graph `artifacts/db/er_graph.mmd` (Mermaid).
        
3. **Static code scan for data access points:**
    
    - Detect ORM models, repositories, mappers, and **inline SQL**.
        
    - Build a **CRUD map per table** with code locations:  
        `Table | Operation (R/W/C/D) | Code Symbol/File:Line | Service/Process | Notes`.
        
    - Export: `artifacts/static/crud_map.csv`.
        
4. **Compose/K8s → Ports/Services:**
    
    - Parse ports, containerPorts, services, ingresses, health endpoints.
        
    - Build **Ports & Endpoints Matrix (PEM)** joining with OpenAPI + Atlas:  
        `Service | Exposed Port(s) | Protocol | Endpoint (method/path) | Auth | Source (Compose/K8s/OpenAPI/Atlas) | DiffFlag`.
        
    - Export: `artifacts/static/ports_endpoints_matrix.csv`.
        

---

### Phase 2 — Contract Tests (Spec Correctness)

1. Validate every OpenAPI path/method/auth against the running services using Schemathesis/Dredd/Prism.
    
2. Export JUnit/XML results to `artifacts/tests/contract/` and import into SonarQube CE (coverage where supported).
    
3. Produce a **Spec Drift** list: endpoints in code not in spec, and spec endpoints not implemented.
    
    - Export: `artifacts/tests/spec_drift.csv`.
        

---

### Phase 3 — Runtime Flow Probes (End-to-End)

1. **Correlation ID / Trace:**
    
    - For test runs, propagate a `x-correlation-id` header from frontend/E2E into API/middleware logs.
        
    - If OpenTelemetry is present, capture traces; otherwise parse app logs with the correlation id.
        
2. **E2E Journeys:**
    
    - Implement synthetic flows that exercise typical user paths (login → UI action → API call → DB write → follow-up read).
        
    - Use Playwright (UI) + Newman/k6 (API).
        
    - Persist JUnit XML, screenshots, and videos under `artifacts/tests/e2e/` and import coverage into SonarQube CE.
        
3. **SQL Activity Capture (non-invasive):**
    
    - MySQL: enable session-scoped statement/transaction logging for the **test session** or query `performance_schema.events_statements_*` if available.
        
    - PostgreSQL: use `pg_stat_statements` (if enabled) or log statements at the **test session** level.
        
    - Correlate each statement to the `x-correlation-id` to map **which tables** were touched per **endpoint** and **operation**.
        
4. **DB Effects Verification (read-only assertions):**
    
    - After each flow, verify expected row counts/keys changed using **read-only** SELECTs.
        

---

### Phase 4 — Security & Access Surface

1. Extract GRANTS/roles relevant to each table and join with endpoints calling those tables.
    
2. Flag high-risk tables (PII/credentials/tokens/payment).
    
3. Export: `artifacts/security/table_access_matrix.csv` with:  
    `Table | Endpoint(s) | Service | Role/Grant | Operation | RiskTag | Evidence`.
    

---

### Phase 5 — Synthesis & Reporting

1. **DB-Centric Data-Lineage Graph**
    
    - From evidence, generate `artifacts/graphs/data_lineage.mmd` depicting:  
        `UI/Event → HTTP Method/Path → Service → Function → (SQL/ORM op) → Table`.
        
2. **Heatmap of Table Touches**
    
    - `artifacts/analytics/table_touch_heatmap.csv`:  
        `Table | Reads | Writes | Distinct Endpoints | Distinct Services | Last Seen In E2E`.
        
3. **Anomalies & Mismatches**
    
    - Ports/Endpoints vs Atlas, OpenAPI vs Code, declared vs observed DB ops, missing auth, unindexed hot queries.
        
    - Export: `artifacts/findings/anomalies.md` with remediation steps and code/manifest references.
        
4. **SonarQube CE Focus**
    
    - Tag issues that affect data flow as `data-flow-critical`.
        
    - Summarize Quality Gate, coverage by component, and top hotspots that can break flows.
        

---

### Deliverables (must exist at the end)

- `artifacts/db/schema_inventory.csv`
    
- `artifacts/static/crud_map.csv`
    
- `artifacts/static/ports_endpoints_matrix.csv`
    
- `artifacts/tests/contract/*.xml` (and `spec_drift.csv`)
    
- `artifacts/tests/e2e/*.xml` + screenshots/videos
    
- `artifacts/analytics/table_touch_heatmap.csv`
    
- `artifacts/security/table_access_matrix.csv`
    
- `artifacts/graphs/er_graph.mmd` + `data_lineage.mmd`
    
- **Final report:** `artifacts/report/data_flow_report.md` containing:
    
    - Executive summary (one page)
        
    - Diagram links (ER + Data Lineage)
        
    - Per-table CRUD map with calling endpoints/services and observed ops
        
    - Ports/Endpoints Matrix (with Atlas/OpenAPI diffs)
        
    - Contract/E2E results + coverage links (SonarQube CE)
        
    - Security/access observations (GRANTS/roles/PII hotspots)
        
    - Ranked remediation checklist with owners and PR pointers
        

---

### Acceptance Criteria (build must FAIL if any is violated)

- Any unresolved **DiffFlag** in the Ports & Endpoints Matrix
    
- Any **Spec Drift** remaining (missing or extra endpoints)
    
- Any table used in code but **never hit** in E2E probes (coverage gap)
    
- Any endpoint performing **write** without explicit auth/role mapping
    
- SonarQube Application/Projects fail Quality Gate on **New Code**
    

### Output Format Notes

- CSVs must use UTF-8 with header row.
    
- All references to code must include **file path + line**.
    
- Mask secrets in logs and artifacts.
    
- Link SonarQube CE dashboard(s) at the top of `data_flow_report.md`.
    

---

### Engine-Specific Introspection (use whichever matches the connected DB)

**MySQL (examples)**

- Tables/columns: `SELECT TABLE_SCHEMA,TABLE_NAME,COLUMN_NAME,DATA_TYPE,IS_NULLABLE,COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA NOT IN ('mysql','performance_schema','information_schema','sys');`
    
- Keys/indexes: `INFORMATION_SCHEMA.STATISTICS`, PK/FK: `INFORMATION_SCHEMA.KEY_COLUMN_USAGE`
    
- Triggers: `INFORMATION_SCHEMA.TRIGGERS`
    
- Grants: `SHOW GRANTS FOR CURRENT_USER;` (and role mapping if enabled)
    

**PostgreSQL (examples)**

- Tables/columns: join `information_schema.columns` with `pg_class/pg_namespace`
    
- PK/FK/UK: `information_schema.table_constraints` + `key_column_usage`
    
- Indexes: `pg_indexes` / `pg_stat_all_indexes`
    
- Triggers: `information_schema.triggers`
    
- Grants: `pg_catalog.pg_roles`, `information_schema.role_table_grants`
    

---

**Now run the plan and produce the artifacts and the final `/docs/SQ_data_flow_report_YYYY-MM-DD.md`.** (provide date as end)  
If something cannot be collected (e.g., pg_stat_statements disabled), state the limitation and provide the nearest reliable evidence.