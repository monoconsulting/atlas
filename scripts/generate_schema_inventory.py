import os
import csv
import pymysql


def get_connection():
    host = os.getenv("MYSQL_HOST", "127.0.0.1")
    port = int(os.getenv("MYSQL_PORT", "3306"))
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "")
    database = os.getenv("MYSQL_DATABASE", "transcription_db_dev")
    return pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        cursorclass=pymysql.cursors.DictCursor,
    )


def write_schema_inventory(csv_path: str, schema: str):
    query = """
    SELECT 
      C.TABLE_SCHEMA,
      C.TABLE_NAME,
      C.COLUMN_NAME,
      C.ORDINAL_POSITION,
      C.DATA_TYPE,
      C.CHARACTER_MAXIMUM_LENGTH,
      C.NUMERIC_PRECISION,
      C.NUMERIC_SCALE,
      C.DATETIME_PRECISION,
      C.IS_NULLABLE,
      C.COLUMN_DEFAULT,
      KCU.CONSTRAINT_NAME,
      TC.CONSTRAINT_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS C
    LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU
      ON KCU.TABLE_SCHEMA = C.TABLE_SCHEMA
     AND KCU.TABLE_NAME = C.TABLE_NAME
     AND KCU.COLUMN_NAME = C.COLUMN_NAME
    LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS TC
      ON TC.TABLE_SCHEMA = KCU.TABLE_SCHEMA
     AND TC.TABLE_NAME = KCU.TABLE_NAME
     AND TC.CONSTRAINT_NAME = KCU.CONSTRAINT_NAME
    WHERE C.TABLE_SCHEMA = %s
    ORDER BY C.TABLE_NAME, C.ORDINAL_POSITION;
    """

    with get_connection() as conn, conn.cursor() as cur, open(csv_path, "w", newline="", encoding="utf-8") as fh:
        cur.execute("SELECT DATABASE() AS db")
        db = cur.fetchone()["db"]
        if schema.lower() == "__current__":
            schema = db
        cur.execute(query, (schema,))
        rows = cur.fetchall()
        writer = csv.writer(fh)
        writer.writerow(
            [
                "table_schema",
                "table_name",
                "column_name",
                "ordinal_position",
                "data_type",
                "char_length",
                "numeric_precision",
                "numeric_scale",
                "datetime_precision",
                "is_nullable",
                "column_default",
                "constraint_name",
                "constraint_type",
            ]
        )
        for r in rows:
            writer.writerow(
                [
                    r["TABLE_SCHEMA"],
                    r["TABLE_NAME"],
                    r["COLUMN_NAME"],
                    r["ORDINAL_POSITION"],
                    r["DATA_TYPE"],
                    r["CHARACTER_MAXIMUM_LENGTH"],
                    r["NUMERIC_PRECISION"],
                    r["NUMERIC_SCALE"],
                    r["DATETIME_PRECISION"],
                    r["IS_NULLABLE"],
                    r["COLUMN_DEFAULT"],
                    r["CONSTRAINT_NAME"],
                    r["CONSTRAINT_TYPE"],
                ]
            )


def write_er_mermaid(mmd_path: str, schema: str):
    query_fk = """
    SELECT 
      TABLE_NAME,
      COLUMN_NAME,
      REFERENCED_TABLE_NAME,
      REFERENCED_COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = %s
      AND REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY TABLE_NAME, COLUMN_NAME;
    """
    with get_connection() as conn, conn.cursor() as cur, open(mmd_path, "w", encoding="utf-8") as fh:
        cur.execute("SELECT DATABASE() AS db")
        db = cur.fetchone()["db"]
        if schema.lower() == "__current__":
            schema = db
        cur.execute(query_fk, (schema,))
        rows = cur.fetchall()
        fh.write("erDiagram\n")
        edges = set()
        for r in rows:
            a = r["TABLE_NAME"]
            b = r["REFERENCED_TABLE_NAME"]
            edges.add((a, b))
        for a, b in sorted(edges):
            fh.write(f"  {a} }o--|| {b} : FK\n")


def main():
    out_dir = os.getenv("OUT_DIR", "artifacts")
    schema = os.getenv("MYSQL_DATABASE", "transcription_db_dev")
    db_dir = os.path.join(out_dir, "db")
    os.makedirs(db_dir, exist_ok=True)
    write_schema_inventory(os.path.join(db_dir, "schema_inventory.csv"), schema)
    graphs_dir = os.path.join(out_dir, "graphs")
    os.makedirs(graphs_dir, exist_ok=True)
    write_er_mermaid(os.path.join(graphs_dir, "er_graph.mmd"), schema)
    print("Wrote schema_inventory.csv and er_graph.mmd")


if __name__ == "__main__":
    main()

