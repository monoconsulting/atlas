# Atlas: Prompts till Taskmaster (Uppdrag 1) och Parallell Databas (Uppdrag 2)

## Syfte
- Uppdrag 1: Införa ett nytt fält `prompt` på varje task och subtask som kan läsas/skrivas från Kanban‑UI, MCP och CLI, med bibehållen bakåtkompatibilitet och följsamhet mot fil‑lagringens regler (atomiska skrivningar, soft delete, streaming för stora filer, id‑regler, fil‑merge).
- Uppdrag 2: Införa en parallell MySQL‑databas som är en dynamisk, fungerande kopia av `tasks.json` (inkl. `.taskmaster/tasks/tasks.json` + rotens `tasks.json`) för robusthet, sökbarhet och transaktionssäkerhet. Utvärdera direkt‑DB‑åtkomst från MCP/CLI och föreslå övergångsstrategi.

## Nulägesanalys (kort)
- Lagring: `app/storage.py` hanterar JSON‑struktur, fil‑merge och låsning via `portalocker` (+ atomiska `.tmp` → replace). Stöd för streamande läsning (`ijson`) vid >100KB. Soft delete via `deleted=true`.
- Modell/API: `app/models.py` definierar `Task`/`SubTask` (saknar `prompt` men har `extra`), plus Add*/Update*‑requester. `app/main.py` exponerar CRUD för task/subtask via FastAPI (Pydantic‑modeller saknar `prompt`).
- Frontend: `app/static/js` (api.js, main.js, render.js, state.js) renderar Kanban och modaler. Inga UI‑fält för prompt idag.
- MCP/CLI: Minimal MCP i `mcp-server-taskmaster/` och Python‑stub i `taskmaster-ai/`. CLI‑exempel `add_tasks.py` använder `TaskStorage` direkt.
- MySQL: `docker-compose.yml` kör MySQL (db=taskmaster). `app/database.py` innehåller ORM för projekt/portar/konfig men inte tasks.

## Krav (funktionella)
- Lägga till `prompt` på task och subtask.
- Visa och redigera `prompt` i Kanban‑UI (create/edit‑modal), MCP och CLI.
- API ska ta emot/returnera `prompt` i Add*/Update* och i `GET /tasks`, `GET /task/{id}`.
- JSON‑lagring ska fortsätta vara källa och följa:
  - Atomiska skrivningar via `.tmp` + replace.
  - Soft delete (aldrig ta bort objekt).
  - Streamingläsning för stora filer (>100KB) med `ijson`.
  - Id‑regler: auto‑increment inom tagg; stöd för numeriska och prickade id:n.
  - Fil‑merge: slå ihop `.taskmaster/tasks/tasks.json` och rotens `tasks.json`; dubbletter ska tyst hoppas över.
- Parallell DB ska spegla JSON‑innehållet, uppdateras löpande (dual‑write + importer), och kunna användas för läs/skriv via adapter.

## Krav (icke‑funktionella)
- Bakåtkompatibelt JSON‑schema (existerande filer utan `prompt` ska fungera).
- Låsningsdisciplin: bibehåll `portalocker` för fil, använd transaktioner/unik‑constraint i DB.
- Observability: logga import, dubbletter, parse‑fel, och DB‑synk.
- UI‑säkerhet: `e.stopPropagation()` för modalens subcomponents (inkl. prompt‑fält/knappar) enligt Frontend‑riktlinjer.

---

## Design – Uppdrag 1: Prompt‑fält i Taskmaster

### Datamodell
- Lägg till explicit fält `prompt: Optional[str]` i:
  - `Task` (app/models.py) – lång text (fri form, kan vara system‑/user‑prompt till agenten).
  - `SubTask` (app/models.py).
- Uppdatera `AddTaskRequest`, `UpdateTaskRequest`, `AddSubTaskRequest`, `UpdateSubTaskRequest` med valfritt `prompt`.
- Bakåtkomp: Om saknas i JSON, tolka som `None`. Behåll `extra` oförändrat.

### API‑kontrakt (FastAPI)
- Pydantic‑modeller i `app/main.py`:
  - `AddTaskModel`, `UpdateTaskModel` → nytt valfritt fält `prompt: Optional[str]`.
  - `AddSubTaskModel`, `UpdateSubTaskModel` → nytt valfritt fält `prompt: Optional[str]`.
- Endpoints påverkas:
  - POST `/task` tar emot `prompt` och returnerar det i `data`.
  - PATCH `/task/{id}` kan uppdatera `prompt`.
  - POST `/task/{id}/subtask` tar emot `prompt`.
  - PATCH `/task/{id}/subtask/{sub_id}` kan uppdatera `prompt`.
  - GET `/tasks` och `/task/{id}` returnerar `prompt` för task och dess subtasks.

### Lagring (JSON)
- `app/storage.py`:
  - Vid add/update ska `prompt` skrivas in i respektive task/subtask‑objekt.
  - Läsa in befintliga filer utan fältet och inte lägga till default‑värden i onödan.
  - Fortsätta använda `.tmp` → `replace()` och `portalocker` i read‑modify‑write.
  - Merge‑logik oförändrad; `prompt` följer med i objektet vid sammanslagning.
  - Vid dubblett‑ID hoppa över inkommande task oavsett `prompt`.

### Frontend (Kanban‑UI)
- Modal (create/edit):
  - Lägg till textarea/input för “Prompt to Agent” på task‑nivå.
  - Lägg till prompt‑fält per subtask‑rad i edit‑läge och i “lägg till subtask”‑formulär.
  - Skicka `prompt` genom `api.js` till POST/PATCH (task/subtask).
  - Se till att alla knappar/inputs i modalens subviews (inkl. promptfält) använder `e.stopPropagation()` där relevant för att aldrig stänga modalen oavsiktligt.
- Render:
  - Visa en diskret ikon/indikator på task‑kort om prompt finns (t.ex. tooltip med första 80 tecken). Ingen hård beroende.
- State/validering:
  - Maxlängds‑guard i UI (t.ex. 20–40k tecken) och enkel sanitation (escape/white‑space).

### MCP & CLI
- MCP (mcp-server-taskmaster):
  - Lägg till actions `get_prompt` (task_id [,sub_id]) och `set_prompt` (task_id [,sub_id], prompt) som anropar REST‑API:t eller DB‑adaptern (se Uppdrag 2). Returnera aktuell `prompt`.
- CLI:
  - Utöka `add_tasks.py`/ev. ny CLI med flagga `--prompt` och kommandon `task set-prompt` och `subtask set-prompt` som uppdaterar via REST‑API eller DB‑adapter.

### Test (Uppdrag 1)
- Enhet: modell → storage → API round‑trip för `prompt` (task + subtask).
- UI: Playwright‑cases för att skapa/uppdatera prompt på task och subtask, samt verifiera att inget oavsiktligt modal‑stäng sker (stopPropagation‑krav).
- Konkurens: oförändrat test (web/tests/test_concurrent_writes.py) ska fortsätta passera.

---

## Design – Uppdrag 2: Parallell MySQL‑databas

### Mål
- 1:1‑spegel av JSON‑innehållet i relationsform för robusthet och sökbarhet.
- Dual‑write från API/storage till både JSON och DB, samt importer som hämtar externa filförändringar.
- Grund för eventuell framtida “DB‑först”‑drift.

### Databasmodell (förslag)
- Tabell `projects` finns redan. Återanvänd `project_id` via slug‑upplösning.
- `tasks`:
  - `id` (PK, surrogate), `project_id` (FK), `tag` (VARCHAR(100)), `local_id` (INT) – id per tag (auto‑increment inom tagg),
  - `title` (VARCHAR), `description` (TEXT), `prompt` (MEDIUMTEXT),
  - `status` (ENUM/VARCHAR), `priority` (ENUM/VARCHAR), `due_date` (DATE NULL),
  - `assigned_to` (VARCHAR NULL), `estimate` (VARCHAR NULL),
  - `labels_json` (JSON), `dependencies_json` (JSON),
  - `deleted` (BOOL), `created_at`, `updated_at` (TIMESTAMP/UTC).
  - Indexer: `(project_id, tag, local_id)` unik, `(project_id, tag, status)`, fulltext på `title/description/prompt` vid behov.
- `subtasks`:
  - `id` (PK), `task_pk` (FK→tasks.id), `local_id` (INT, 1..8),
  - `title`, `description` (TEXT), `prompt` (MEDIUMTEXT),
  - `status`, `priority`, `due_date`, `assigned_to`, `estimate`, `labels_json`, `dependencies_json`,
  - `deleted` (BOOL), `created_at`, `updated_at`.
  - Unik: `(task_pk, local_id)`.
- Dotted IDs: representeras implicit (t.ex. subtask `local_id` + parent `local_id`). Vid framtida djupare hierarki kan `id_path` (VARCHAR) adderas.

### Synkronisering & Konsistens
- Importer (läsa → DB):
  - Komponent `TaskJsonImporter` (ny modul) som läser `.taskmaster/tasks/tasks.json` och ev. rotens `tasks.json` via `ijson` för stora filer.
  - Följer merge‑regeln: läs båda, bygg en sammanlagd struktur per tag → skriv in i DB; hoppa över dubbletter.
  - Upptäcker förändringar via filens mtime/hash. Körs vid start + periodiskt (t.ex. intervall 15–30s, konfigurerbart) eller on‑demand endpoint.
- Dual‑write (API → JSON + DB):
  - I `TaskStorage` efter lyckad JSON‑skriv: uppdatera/insert i DB inom samma logiska operation. Vid fel i DB logga och fortsätt (JSON är fortfarande sanningskälla i fas 1).
  - Transaktionsgaranti i DB‑sidan (per request). Unik‑constraint skyddar mot dubbelinsert vid konkurrens.
- Konfliktstrategi:
  - JSON är primär (fas 1). DB synkas “eventually consistent”.
  - Recovery: periodic importer stämmer av avvikelser.

### API/Adapter för DB‑åtkomst
- REST oförändrat initialt (JSON som källa). Lägg till internt `TaskDbAdapter` med CRUD mot ORM‑modeller (tasks/subtasks) för dual‑write och importer.
- Lättviktsbibliotek för MCP/CLI som kan tala direkt mot DB via SQLAlchemy (läs/skriv prompt, hämta tasks för slug/tag, etc.).

### Direkt‑DB för MCP/CLI – Utvärdering
- Fördelar:
  - Transaktionssäkerhet, bättre samtidighet, snabbare queries/filters.
  - Mindre beroende av JSON‑filernas korruption/lås.
- Nackdelar:
  - Två källor i drift (JSON+DB) tills full övergång – risk för drift.
  - Kräver migrationsdisciplin, indexering, backup‑strategi.
- Rekommendation: Fasat införande
  1) Dual‑write + importer (DB som spegel),
  2) “Läs från DB, skriv till JSON+DB” (feature‑flag),
  3) “DB‑först” där JSON blir derivat/backup (cron export), när stabilitet bevisats.

### Operativ drift
- MySQL i compose redan definierad. Se till att `DATABASE_URL` pekar på `mysql:3306/taskmaster` (redan default i `app/database.py`).
- Lägg till index, initskript (ORM `Base.metadata.create_all()` + migrations vid behov).
- Backup: daglig dump, PITR om möjligt. Larm vid synkfel (importer/dual‑write exceptions).

### Test (Uppdrag 2)
- Importer: stor fil (>100KB), dubbla källor (rot + .taskmaster), dubblett‑skip.
- Dual‑write: skapa/uppdatera/soft‑delete i API → verifiera JSON och motsvarande DB‑rader.
- Samtidighet: flera parallella add/update → unika `(project_id, tag, local_id)` bibehålls.
- Prestanda: listning/filter i DB med index.

---

## Implementationsplan

### Fas 0 – Förberedelser
- Dokumentera JSON‑fältstandard för `prompt` (tom/None tillåts, ingen default‑injektion).
- Sätt max tillåtna storlek UI/API (t.ex. 64KB) – server kan kapa med tydligt fel.

### Fas 1 – Prompt fält end‑to‑end (Uppdrag 1)
1) Modell: Uppdatera `app/models.py` (Task/SubTask + Add/Update requests) med `prompt`.
2) API: Uppdatera Pydantic‑modeller i `app/main.py` och mappa in/ut `prompt` i add/update/list/get.
3) Storage: Utöka `app/storage.py` add/update så att `prompt` persistens sker.
4) Frontend: UI‑fält i modaler (task och subtask), wiring i `app/static/js/api.js`/`main.js`/`render.js`. Lägg på `e.stopPropagation()` på relevanta knappar/inputs.
5) CLI/MCP: lägg till minsta stöd för get/set‑prompt (CLI flagga, MCP actions) som anropar REST.
6) Tester: enhet + UI‑smoke. Konkurens‑test ska fortfarande passera.

### Fas 2 – DB‑spegel (Uppdrag 2, steg 1)
7) ORM: Utöka `app/database.py` med `TaskORM` och `SubTaskORM` + CRUD + index/constraints.
8) Importer: Ny modul `TaskJsonImporter` (streaming med `ijson`) som läser båda JSON‑källor, merge:ar och skriver in i DB.
9) Dual‑write: Koppla `TaskStorage` skrivsteg till `TaskDbAdapter` (best effort; JSON är primär). Fel loggas.
10) Hälsoendpoints/logg: /info visar DB‑synkstatus (antal tasks/subtasks, senaste import‑ts, felstatistik).

### Fas 3 – Direkt‑DB för MCP/CLI (Uppdrag 2, steg 2)
11) TaskDB‑klient: Liten Python‑modul för MPC/CLI (hämta/setta prompt, tasklistor per slug/tag).
12) MCP actions: peka mot DB‑adapter. Feature‑flag att kunna välja REST vs DB.

### Fas 4 – Utvärdering och ev. övergång
13) Mät stabilitet (korruptionsincidenter, latens, throughput). Om gott utfall: introducera läs‑från‑DB i API under flagga.
14) Plan för “DB‑först”: JSON blir export/backup. Dokumentera rollback.

## Risker & Mitigering
- Dubbelkällor (JSON+DB): Inför periodisk reconciler + tydliga loggar/varningar.
- Låskonflikter: Behåll fil‑lås, lägg unik‑constraint i DB. Vid DB‑race: transaktion + `SELECT MAX(local_id)+1 FOR UPDATE` per `(project_id, tag)` eller dedikerad sekvens/tabell.
- Stora prompts: UI/API begränsar, DB‑fält MEDIUMTEXT, sanitera i UI, ingen rendering av rå HTML.
- Bakåtkompatibilitet: `prompt` är valfritt; UI visar fält tomt när det saknas.

## Acceptanskriterier (urval)
- Skapa/uppdatera task/subtask med `prompt` via UI och CLI → `GET /task/{id}` innehåller `prompt` och JSON‑filen återspeglar det.
- Importer läser om `tasks.json` (>100KB) och fyller DB; dubbletter hoppas över.
- Direkt‑DB action i MCP/CLI kan läsa/skriva prompt för en task/subtask när flagga aktiveras.

## Exempel
- JSON (task):
```json
{
  "id": 12,
  "title": "Implementera X",
  "description": "…",
  "status": "in-progress",
  "prompt": "Du är en hjälpsam agent. Lös X stegvis…",
  "subtasks": [
    { "id": 1, "title": "Del 1", "prompt": "Säkerställ A innan B…" }
  ]
}
```

## Påverkade filer (översikt)
- API/Backend:
  - `app/models.py` – +prompt i dataklasser och request‑modeller.
  - `app/main.py` – +prompt i Pydantic‑modeller, i add/update‑flödena.
  - `app/storage.py` – skriv/läs `prompt` (task/subtask), dual‑write hook.
  - `app/database.py` – nya ORM‑modeller + CRUD för tasks/subtasks.
  - Ny: `app/task_db_adapter.py`, `app/task_json_importer.py` (namnförslag).
- Frontend:
  - `app/static/index.html` – fält i modal.
  - `app/static/js/api.js`, `main.js`, `render.js` – dataflöde + UI.
- MCP/CLI:
  - `mcp-server-taskmaster/src/server.ts` – nya actions.
  - `add_tasks.py` – flagga/param för prompt (ev. ny CLI).

## Tidsestimat (grovt)
- Fas 1 (Uppdrag 1): 1–2 dagar inkl. UI, API, lagring och bas‑tester.
- Fas 2 (DB spegel): 2–4 dagar inkl. ORM, importer, dual‑write och tester.
- Fas 3 (MCP/CLI DB‑stöd): 1–2 dagar.
- Fas 4 (utvärdering/flagga för DB‑läsning): 1 dag.

## Nästa steg
1) Bekräfta `prompt`‑fältets längdgräns och UI‑placering.
2) Godkänn DB‑schema och om `labels/dependencies` ska vara JSON‑kolumner (MySQL 8 OK).
3) Starta Fas 1 enligt plan.

