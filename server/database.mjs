import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDatabase(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename, { timeout: 5000 });
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version > 14) throw new Error('Database version is newer than this server.');
  if (version === 0) db.exec(`
    BEGIN;
    CREATE TABLE users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, settings TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL);
    CREATE TABLE auth_sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
    CREATE TABLE study_sets(id INTEGER PRIMARY KEY, owner_id INTEGER REFERENCES users(id), title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', learning_language TEXT NOT NULL DEFAULT 'en', native_language TEXT NOT NULL DEFAULT 'vi', visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','public')), tag TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'user', content_status TEXT NOT NULL DEFAULT 'complete', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE words(id INTEGER PRIMARY KEY, set_id INTEGER NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE, term TEXT NOT NULL, definition TEXT NOT NULL, part_of_speech TEXT NOT NULL DEFAULT '', phonetic TEXT NOT NULL DEFAULT '', example TEXT NOT NULL DEFAULT '', synonyms TEXT NOT NULL DEFAULT '', image_url TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL);
    CREATE INDEX words_set ON words(set_id,position);
    CREATE TABLE learning_paths(id INTEGER PRIMARY KEY, owner_id INTEGER REFERENCES users(id), title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', learning_language TEXT NOT NULL DEFAULT 'en', native_language TEXT NOT NULL DEFAULT 'vi', visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','public')), tag TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'user', content_status TEXT NOT NULL DEFAULT 'complete', expected_set_count INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE path_sets(path_id INTEGER REFERENCES learning_paths(id) ON DELETE CASCADE, set_id INTEGER REFERENCES study_sets(id) ON DELETE CASCADE, position INTEGER NOT NULL, PRIMARY KEY(path_id,set_id));
    CREATE TABLE bookmarks(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL CHECK(kind IN ('set','path','word')), resource_id INTEGER NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(user_id,kind,resource_id));
    CREATE TABLE word_progress(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, word_id INTEGER REFERENCES words(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'new', starred INTEGER NOT NULL DEFAULT 0, repetitions INTEGER NOT NULL DEFAULT 0, interval_days REAL NOT NULL DEFAULT 0, ease REAL NOT NULL DEFAULT 2.5, due_at TEXT, last_reviewed_at TEXT, PRIMARY KEY(user_id,word_id));
    CREATE INDEX progress_due ON word_progress(user_id,due_at);
    CREATE TABLE study_sessions(id TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, set_id INTEGER NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE, mode TEXT NOT NULL, state TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT);
    CREATE TABLE study_answers(id INTEGER PRIMARY KEY, session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE, question_id TEXT NOT NULL, word_id INTEGER REFERENCES words(id) ON DELETE SET NULL, answer TEXT NOT NULL, correct INTEGER NOT NULL, created_at TEXT NOT NULL, UNIQUE(session_id,question_id));
    CREATE TABLE activity(id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, resource_id TEXT, points INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
    CREATE INDEX activity_user ON activity(user_id,created_at);
    CREATE TABLE folders(id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id), name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#94a3b8');
    CREATE TABLE folder_sets(folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE, set_id INTEGER REFERENCES study_sets(id) ON DELETE CASCADE, PRIMARY KEY(folder_id,set_id));
    CREATE TABLE classes(id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id), name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', join_code TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE class_members(class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL DEFAULT 'student', joined_at TEXT NOT NULL, PRIMARY KEY(class_id,user_id));
    CREATE TABLE assignments(id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE, title TEXT NOT NULL, set_id INTEGER REFERENCES study_sets(id), mode TEXT NOT NULL, due_at TEXT, created_at TEXT NOT NULL);
    CREATE TABLE assignment_submissions(id INTEGER PRIMARY KEY, assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id), session_id TEXT NOT NULL REFERENCES study_sessions(id), submitted_at TEXT NOT NULL, UNIQUE(assignment_id,user_id,session_id));
    CREATE TABLE conversations(id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), set_id INTEGER NOT NULL REFERENCES study_sets(id), title TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE messages(id INTEGER PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE generated_content(id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), set_id INTEGER NOT NULL REFERENCES study_sets(id), kind TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE feedback(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), category TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL);
    PRAGMA user_version=1;
    COMMIT;
  `);
  if(version<2)db.exec(`BEGIN; CREATE TABLE comprehensive_progress(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,set_id INTEGER NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE,lesson_index INTEGER NOT NULL,step_index INTEGER NOT NULL,evidence TEXT NOT NULL,completed_at TEXT NOT NULL,PRIMARY KEY(user_id,set_id,lesson_index,step_index)); PRAGMA user_version=2; COMMIT;`);
  if(version<3)db.exec(`BEGIN;
    CREATE TABLE courses(id INTEGER PRIMARY KEY,owner_id INTEGER REFERENCES users(id),title TEXT NOT NULL,language TEXT NOT NULL,competence TEXT NOT NULL,visibility TEXT NOT NULL DEFAULT 'private',source TEXT NOT NULL DEFAULT 'user',created_at TEXT NOT NULL);
    CREATE TABLE course_parts(id INTEGER PRIMARY KEY,course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,title TEXT NOT NULL,position INTEGER NOT NULL);
    CREATE TABLE course_lessons(id INTEGER PRIMARY KEY,part_id INTEGER NOT NULL REFERENCES course_parts(id) ON DELETE CASCADE,title TEXT NOT NULL,position INTEGER NOT NULL,content TEXT,content_status TEXT NOT NULL DEFAULT 'metadata_only');
    CREATE TABLE course_progress(user_id INTEGER NOT NULL REFERENCES users(id),lesson_id INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,score INTEGER NOT NULL,total INTEGER NOT NULL,answers TEXT NOT NULL,completed_at TEXT NOT NULL,PRIMARY KEY(user_id,lesson_id));
    PRAGMA user_version=3; COMMIT;`);
  if(version<4)db.exec(`BEGIN;
    CREATE TABLE user_ai_settings(user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,provider TEXT NOT NULL,model TEXT NOT NULL,api_key TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL);
    CREATE TABLE word_notes(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,example TEXT NOT NULL,translation TEXT NOT NULL DEFAULT '',synonyms TEXT NOT NULL DEFAULT '',origin TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,word_id));
    PRAGMA user_version=4; COMMIT;`);
  if(version<5)db.exec(`BEGIN;
    ALTER TABLE conversations ADD COLUMN settings TEXT NOT NULL DEFAULT '{}';
    CREATE TABLE exercise_attempts(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,content_id TEXT NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,state TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,completed_at TEXT);
    CREATE INDEX exercise_attempts_user ON exercise_attempts(user_id,updated_at);
    PRAGMA user_version=5; COMMIT;`);
  if(version<6)db.exec(`BEGIN;
    CREATE TABLE course_learning_sessions(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,lesson_id INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,state TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,completed_at TEXT);
    CREATE INDEX course_learning_sessions_user ON course_learning_sessions(user_id,lesson_id,updated_at);
    PRAGMA user_version=6; COMMIT;`);
  if(version<7)db.exec(`BEGIN;
    CREATE TABLE learning_programs(id TEXT PRIMARY KEY,title TEXT NOT NULL,kind TEXT NOT NULL,version INTEGER NOT NULL,status TEXT NOT NULL);
    CREATE TABLE learning_lesson_versions(lesson_id TEXT NOT NULL,version INTEGER NOT NULL,program_id TEXT NOT NULL REFERENCES learning_programs(id),title TEXT NOT NULL,position INTEGER NOT NULL,content TEXT NOT NULL,published INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(lesson_id,version));
    CREATE TABLE learning_sessions(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,lesson_id TEXT NOT NULL,content_version INTEGER NOT NULL,revision INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,completed_at TEXT,FOREIGN KEY(lesson_id,content_version) REFERENCES learning_lesson_versions(lesson_id,version));
    CREATE INDEX learning_sessions_user ON learning_sessions(user_id,updated_at);
    CREATE TABLE learning_step_attempts(session_id TEXT NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,submission_id TEXT NOT NULL,request_hash TEXT NOT NULL,step_id TEXT NOT NULL,response TEXT NOT NULL,feedback TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(session_id,submission_id),UNIQUE(session_id,step_id));
    CREATE TABLE daily_learning_plans(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,local_date TEXT NOT NULL,timezone TEXT NOT NULL,budget_minutes INTEGER NOT NULL,items TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(user_id,local_date));
    PRAGMA user_version=7; COMMIT;`);
  if(version<8)db.exec(`BEGIN;
    CREATE TABLE learning_mistakes(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,lesson_id TEXT NOT NULL,content_version INTEGER NOT NULL,step_id TEXT NOT NULL,wrong_count INTEGER NOT NULL DEFAULT 1,review_count INTEGER NOT NULL DEFAULT 0,correct_streak INTEGER NOT NULL DEFAULT 0,due_at TEXT,last_wrong_at TEXT NOT NULL,last_reviewed_at TEXT,resolved_at TEXT,UNIQUE(user_id,lesson_id,content_version,step_id),FOREIGN KEY(lesson_id,content_version) REFERENCES learning_lesson_versions(lesson_id,version));
    CREATE INDEX learning_mistakes_user_due ON learning_mistakes(user_id,resolved_at,due_at);
    CREATE TABLE learning_mistake_reviews(mistake_id TEXT NOT NULL REFERENCES learning_mistakes(id) ON DELETE CASCADE,submission_id TEXT NOT NULL,request_hash TEXT NOT NULL,response TEXT NOT NULL,feedback TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(mistake_id,submission_id));
    INSERT INTO learning_mistakes(id,user_id,lesson_id,content_version,step_id,wrong_count,due_at,last_wrong_at)
      SELECT lower(hex(randomblob(16))),s.user_id,s.lesson_id,s.content_version,a.step_id,COUNT(*),MAX(a.created_at),MAX(a.created_at)
      FROM learning_step_attempts a JOIN learning_sessions s ON s.id=a.session_id
      WHERE json_extract(a.feedback,'$.assessment_status')='graded' AND json_extract(a.feedback,'$.correct')=0
      GROUP BY s.user_id,s.lesson_id,s.content_version,a.step_id;
    PRAGMA user_version=8; COMMIT;`);
  if(version<9)db.exec(`BEGIN;
    CREATE TABLE learning_ai_feedback(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,session_id TEXT NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,step_id TEXT NOT NULL,source_hash TEXT NOT NULL,content TEXT NOT NULL,provider TEXT NOT NULL,model TEXT,created_at TEXT NOT NULL,UNIQUE(session_id,step_id,source_hash));
    CREATE INDEX learning_ai_feedback_user ON learning_ai_feedback(user_id,created_at);
    PRAGMA user_version=9; COMMIT;`);
  if(version<10)db.exec(`BEGIN;
    CREATE TABLE listening_practice_sessions(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,lesson_id TEXT NOT NULL,content_version INTEGER NOT NULL,revision INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,completed_at TEXT,FOREIGN KEY(lesson_id,content_version) REFERENCES learning_lesson_versions(lesson_id,version));
    CREATE INDEX listening_practice_user ON listening_practice_sessions(user_id,updated_at);
    CREATE TABLE listening_practice_events(session_id TEXT NOT NULL REFERENCES listening_practice_sessions(id) ON DELETE CASCADE,submission_id TEXT NOT NULL,sentence_id TEXT NOT NULL,request_hash TEXT NOT NULL,result TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(session_id,submission_id),UNIQUE(session_id,sentence_id));
    PRAGMA user_version=10; COMMIT;`);
  if(version<11)db.exec(`BEGIN;
    CREATE TABLE learning_audio_reviews(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,session_id TEXT NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,step_id TEXT NOT NULL,request_hash TEXT NOT NULL,target TEXT NOT NULL,mime_type TEXT NOT NULL,audio_bytes INTEGER NOT NULL,content TEXT NOT NULL,provider TEXT NOT NULL,model TEXT,created_at TEXT NOT NULL,UNIQUE(session_id,step_id,request_hash));
    CREATE INDEX learning_audio_reviews_user ON learning_audio_reviews(user_id,created_at);
    CREATE TABLE learning_audio_review_requests(session_id TEXT NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,submission_id TEXT NOT NULL,request_hash TEXT NOT NULL,review_id TEXT NOT NULL REFERENCES learning_audio_reviews(id) ON DELETE CASCADE,PRIMARY KEY(session_id,submission_id));
    PRAGMA user_version=11; COMMIT;`);
  if(version<12)db.exec(`BEGIN;
    CREATE TABLE learning_phrase_collections(user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,set_id INTEGER NOT NULL UNIQUE REFERENCES study_sets(id) ON DELETE CASCADE);
    CREATE TABLE learning_phrase_links(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,lesson_id TEXT NOT NULL,content_version INTEGER NOT NULL,step_id TEXT NOT NULL,phrase_index INTEGER NOT NULL,word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,created_at TEXT NOT NULL,PRIMARY KEY(user_id,lesson_id,content_version,step_id,phrase_index),FOREIGN KEY(lesson_id,content_version) REFERENCES learning_lesson_versions(lesson_id,version) ON DELETE CASCADE);
    CREATE INDEX learning_phrase_links_word ON learning_phrase_links(user_id,word_id);
    PRAGMA user_version=12; COMMIT;`);
  if(version<13)db.exec(`BEGIN;
    CREATE TABLE learning_materials(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,transcript TEXT NOT NULL,translation TEXT NOT NULL,source_note TEXT NOT NULL,mime_type TEXT NOT NULL,audio BLOB NOT NULL,duration_ms INTEGER NOT NULL,duration_source TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0,import_id TEXT NOT NULL,import_hash TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(user_id,import_id));
    CREATE INDEX learning_materials_user ON learning_materials(user_id,updated_at);
    CREATE TABLE learning_material_playback(material_id TEXT PRIMARY KEY REFERENCES learning_materials(id) ON DELETE CASCADE,revision INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL,updated_at TEXT NOT NULL);
    PRAGMA user_version=13; COMMIT;`);
  if(version<14)db.exec(`BEGIN;
    CREATE TABLE learning_material_cues(material_id TEXT PRIMARY KEY REFERENCES learning_materials(id) ON DELETE CASCADE,revision INTEGER NOT NULL DEFAULT 0,cues TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE learning_material_dictations(material_id TEXT NOT NULL REFERENCES learning_materials(id) ON DELETE CASCADE,submission_id TEXT NOT NULL,request_hash TEXT NOT NULL,result TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(material_id,submission_id));
    PRAGMA user_version=14; COMMIT;`);
  return db;
}

export function transaction(db, action) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = action(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
