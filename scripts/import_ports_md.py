import re
import sqlite3
import os
from pathlib import Path

MD_PATH = Path(r"c:\Users\matti\Desktop\ports.md")
DB_PATH = Path(r"e:\projects\taskmasterweb\taskmaster_local.db")

TABLES_SQL = {
    'projects': '''
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);
''',
    'ports': '''
CREATE TABLE IF NOT EXISTS ports (
    id INTEGER PRIMARY KEY,
    project_id INTEGER,
    system TEXT,
    port TEXT NOT NULL UNIQUE,
    description TEXT,
    notes TEXT,
    url TEXT,
    locked INTEGER DEFAULT 1,
    FOREIGN KEY(project_id) REFERENCES projects(id)
);
'''
}

ROW_RE = re.compile(r"^\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$")


def parse_md_table(md_text):
    lines = md_text.splitlines()
    rows = []
    in_table = False
    for line in lines:
        if line.strip().startswith('|') and '---' in line:
            in_table = True
            continue
        if in_table:
            m = ROW_RE.match(line)
            if m:
                system, port, desc, notes, url = [g.strip() for g in m.groups()]
                rows.append({
                    'system': system,
                    'port': port,
                    'description': desc,
                    'notes': notes,
                    'url': url,
                })
            else:
                # stop on first non-matching
                pass
    return rows


def normalize_project_name(system):
    # take first token or the System field
    return system.strip()


def upsert(db, rows):
    cur = db.cursor()
    cur.execute(TABLES_SQL['projects'])
    cur.execute(TABLES_SQL['ports'])
    inserted_projects = 0
    inserted_ports = 0
    updated_ports = 0
    for r in rows:
        project_name = normalize_project_name(r['system'])
        # ensure project exists
        cur.execute('SELECT id FROM projects WHERE name = ?', (project_name,))
        pr = cur.fetchone()
        if pr:
            project_id = pr[0]
        else:
            cur.execute('INSERT INTO projects (name, description) VALUES (?, ?)', (project_name, f"Auto-imported project {project_name}"))
            project_id = cur.lastrowid
            inserted_projects += 1
        # port value: attempt to extract primary number (or keep as-is)
        port_val = r['port']
        # upsert into ports by unique port field
        cur.execute('SELECT id, project_id, description, notes, url, locked FROM ports WHERE port = ?', (port_val,))
        p = cur.fetchone()
        if p:
            port_id = p[0]
            cur.execute('UPDATE ports SET project_id=?, system=?, description=?, notes=?, url=?, locked=? WHERE id=?', (
                project_id, r['system'], r['description'], r['notes'], r['url'], 1, port_id
            ))
            updated_ports += 1
        else:
            cur.execute('INSERT INTO ports (project_id, system, port, description, notes, url, locked) VALUES (?, ?, ?, ?, ?, ?, ?)', (
                project_id, r['system'], port_val, r['description'], r['notes'], r['url'], 1
            ))
            inserted_ports += 1
    db.commit()
    return inserted_projects, inserted_ports, updated_ports


def main():
    if not MD_PATH.exists():
        print(f"Markdown file not found at {MD_PATH}")
        return
    md_text = MD_PATH.read_text(encoding='utf-8')
    rows = parse_md_table(md_text)
    print(f"Parsed {len(rows)} rows")
    db = sqlite3.connect(DB_PATH)
    inserted_projects, inserted_ports, updated_ports = upsert(db, rows)
    print(f"Inserted projects: {inserted_projects}, Inserted ports: {inserted_ports}, Updated ports: {updated_ports}")


if __name__ == '__main__':
    main()
