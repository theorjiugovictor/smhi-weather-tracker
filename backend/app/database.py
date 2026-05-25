import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "weather_cache.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Create stations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        active INTEGER NOT NULL
    )
    """)
    
    # 2. Create lightning table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS lightning (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        day INTEGER NOT NULL,
        hours INTEGER NOT NULL,
        minutes INTEGER NOT NULL,
        seconds INTEGER NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        peak_current INTEGER NOT NULL,
        cloud_indicator INTEGER NOT NULL
    )
    """)
    
    # 3. Create seeding status table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS seeding_status (
        year INTEGER PRIMARY KEY,
        status TEXT NOT NULL,       -- 'PENDING', 'SEEDING', 'COMPLETED', 'FAILED'
        progress REAL NOT NULL,     -- 0.0 to 100.0
        processed_days INTEGER DEFAULT 0,
        total_days INTEGER DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Create indexes to make coordinate lookup and date groupings fast
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_lightning_coords ON lightning (lat, lon);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_lightning_date ON lightning (year, month, day);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_stations_active ON stations (active);")
    
    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")

if __name__ == "__main__":
    init_db()
