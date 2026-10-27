
CREATE TABLE IF NOT EXISTS admins (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 name TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS members (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 membership_no TEXT UNIQUE NOT NULL,
 full_name TEXT NOT NULL,
 email TEXT NOT NULL,
 phone TEXT,
 district TEXT,
 category TEXT,
 status TEXT DEFAULT 'pending',
 password_hash TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS projects (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 programme TEXT,
 district TEXT,
 beneficiaries TEXT,
 start_date TEXT,
 end_date TEXT,
 status TEXT DEFAULT 'planned',
 description TEXT,
 budget REAL DEFAULT 0,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS project_updates (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 project_id INTEGER NOT NULL,
 title TEXT NOT NULL,
 body TEXT NOT NULL,
 progress INTEGER DEFAULT 0,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS volunteer_applications (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 full_name TEXT NOT NULL,
 phone TEXT,
 email TEXT,
 district TEXT,
 skills TEXT,
 availability TEXT,
 reason TEXT,
 status TEXT DEFAULT 'new',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS contact_messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT,
 phone TEXT,
 subject TEXT,
 message TEXT NOT NULL,
 status TEXT DEFAULT 'new',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 date TEXT,
 time TEXT,
 location TEXT,
 description TEXT,
 registration_url TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS news (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL,
 body TEXT NOT NULL,
 location TEXT,
 programme TEXT,
 published_at TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS documents (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL,
 category TEXT,
 file_url TEXT NOT NULL,
 visibility TEXT DEFAULT 'public',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS donations (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 donor_name TEXT,
 email TEXT,
 phone TEXT,
 amount REAL NOT NULL,
 currency TEXT DEFAULT 'UGX',
 purpose TEXT,
 status TEXT DEFAULT 'pending',
 provider TEXT,
 reference TEXT,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payments (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 member_id INTEGER,
 amount REAL NOT NULL,
 currency TEXT DEFAULT 'UGX',
 purpose TEXT NOT NULL,
 provider TEXT,
 reference TEXT,
 status TEXT DEFAULT 'pending',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(member_id) REFERENCES members(id)
);
CREATE TABLE IF NOT EXISTS audit_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 admin_id INTEGER,
 action TEXT NOT NULL,
 entity TEXT,
 entity_id INTEGER,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(admin_id) REFERENCES admins(id)
);
