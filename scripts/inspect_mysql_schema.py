from dotenv import load_dotenv
from pathlib import Path
import os
import pymysql

env_path = Path(__file__).resolve().parents[1] / '.env'
if env_path.exists():
    load_dotenv(env_path)

MYSQL_HOST = os.getenv('MYSQL_HOST','127.0.0.1')
MYSQL_PORT = int(os.getenv('MYSQL_HOST_PORT', os.getenv('MYSQL_PORT','33066')))
MYSQL_USER = os.getenv('MYSQL_USER','tmuser')
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD','tmpassword')
MYSQL_DB = os.getenv('MYSQL_DATABASE','taskmaster')

conn = pymysql.connect(host=MYSQL_HOST, port=MYSQL_PORT, user=MYSQL_USER, password=MYSQL_PASSWORD, database=MYSQL_DB)
try:
    cur = conn.cursor()
    for t in ('projects','ports'):
        try:
            cur.execute(f"SHOW CREATE TABLE {t}")
            row = cur.fetchone()
            print(f"--- CREATE TABLE {t} ---")
            print(row[1])
            print()
        except Exception as e:
            print(f"Could not SHOW CREATE TABLE {t}: {e}")
finally:
    conn.close()
