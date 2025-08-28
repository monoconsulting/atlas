#!/usr/bin/env python3
"""
Import ports from a Markdown table into MySQL.

Usage: python scripts/import_ports_mysql.py --md-file "C:\\Users\\matti\\Desktop\\ports.md"

This script reads the .env file for MYSQL_* settings and connects to the MySQL instance.
It upserts projects into a `projects` table and ports into a `ports` table. Ports are unique and marked
with `locked` = 1 to indicate the port should not be changed via the UI.

This script intentionally avoids SQLite and uses MySQL per repository conventions.
"""

import os
import re
import argparse
from pathlib import Path

import pymysql
from dotenv import load_dotenv


def parse_markdown_table(md_text):
    # Find the first table in the markdown and parse rows
    lines = md_text.splitlines()
    table_lines = []
    in_table = False
    for line in lines:
        if line.strip().startswith('|'):
            table_lines.append(line.strip())
            in_table = True
        elif in_table:
            break

    if not table_lines:
        return []

    # Remove header divider (---)
    header = table_lines[0]
    cols = [c.strip() for c in header.strip('|').split('|')]
    rows = []
    for r in table_lines[2:]:
        parts = [c.strip() for c in r.strip('|').split('|')]
        # pad
        while len(parts) < len(cols):
            parts.append('')
        row = dict(zip(cols, parts))
        rows.append(row)
    return rows


def ensure_tables(conn):
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS ports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                port INT NOT NULL UNIQUE,
                description TEXT,
                locked TINYINT NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
            """
        )
    conn.commit()


def upsert_project(conn, name, description):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM projects WHERE name=%s", (name,))
        row = cur.fetchone()
        if row:
            pid = row[0]
            cur.execute("UPDATE projects SET description=%s WHERE id=%s", (description, pid))
        else:
            cur.execute("INSERT INTO projects (name, description) VALUES (%s,%s)", (name, description))
            pid = cur.lastrowid
    conn.commit()
    return pid


def upsert_port(conn, project_id, port, description, locked=1):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM ports WHERE port=%s", (port,))
        row = cur.fetchone()
        if row:
            # update description and project if different, but keep locked as 1
            cur.execute("UPDATE ports SET project_id=%s, description=%s, locked=%s WHERE port=%s", (project_id, description, locked, port))
            pid = row[0]
        else:
            cur.execute("INSERT INTO ports (project_id, port, description, locked) VALUES (%s,%s,%s,%s)", (project_id, port, description, locked))
            pid = cur.lastrowid
    conn.commit()
    return pid


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--md-file', required=True, help='Path to ports.md')
    args = parser.parse_args()

    env_path = Path(__file__).resolve().parents[1] / '.env'
    if env_path.exists():
        load_dotenv(env_path)

    MYSQL_HOST = os.getenv('MYSQL_HOST', '127.0.0.1')
    MYSQL_PORT = int(os.getenv('MYSQL_HOST_PORT', os.getenv('MYSQL_PORT', '33066')))
    MYSQL_USER = os.getenv('MYSQL_USER', 'tmuser')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', 'tmpassword')
    MYSQL_DB = os.getenv('MYSQL_DATABASE', 'taskmaster')

    md_path = Path(args.md_file)
    if not md_path.exists():
        print(f"Markdown file {md_path} not found")
        return

    text = md_path.read_text(encoding='utf-8')
    rows = parse_markdown_table(text)
    if not rows:
        print('No table rows parsed from markdown')
        return

    conn = pymysql.connect(host=MYSQL_HOST, port=MYSQL_PORT, user=MYSQL_USER, password=MYSQL_PASSWORD, database=MYSQL_DB, autocommit=False)
    try:
        ensure_tables(conn)
        inserted_projects = 0
        inserted_ports = 0
        for r in rows:
            system = r.get('System') or r.get('System                ') or r.get('System                |') or r.get('System')
            port = r.get('Port') or r.get('Port      ')
            desc = r.get('Description') or r.get('Description           ')
            notes = r.get('Notes') or r.get('Notes ')
            url = r.get('URL') or r.get('URL ') or r.get('URL                                                                                                                                                                                                                                ')

            if not system:
                continue
            project_name = system.strip()
            description = ' '.join(filter(None, [desc, notes, url]))[:2000]

            pid = upsert_project(conn, project_name, description)
            inserted_projects += 1

            # extract numeric port
            port_num = None
            if port:
                m = re.search(r"(\d{2,5})", port)
                if m:
                    port_num = int(m.group(1))

            if port_num:
                upsert_port(conn, pid, port_num, description, locked=1)
                inserted_ports += 1

        print(f"Processed {len(rows)} rows, inserted/updated {inserted_projects} projects and {inserted_ports} ports.")
    finally:
        conn.close()


if __name__ == '__main__':
    main()
