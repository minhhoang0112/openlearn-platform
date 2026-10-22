import {importVisibleReference} from './reference-content.mjs';

// Preserve old draft records and their learner history, but stop recommending
// unverified/generated content. New installs contain only the observed library.
export function seedScreenshots(db) {
  db.prepare("UPDATE study_sets SET source='draft_authored',content_status='partial' WHERE owner_id IS NULL AND source='curated'").run();
  db.prepare("UPDATE learning_paths SET source='draft_authored',content_status='partial' WHERE owner_id IS NULL AND source='curated'").run();
  db.prepare("UPDATE study_sets SET content_status='unavailable_duplicate' WHERE owner_id IS NULL AND id BETWEEN 314 AND 349 AND source='draft_authored'").run();
  importVisibleReference(db);
}
