# Implemented API routes

Generated from the registered server handlers. See API-CONTRACT.md for payloads.

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| GET | /api/v1/health | Optional | Service readiness |
| GET | /api/v1/capabilities | Optional | Personal app feature support and current user AI connection; no subscriptions |
| POST | /api/v1/auth/register | Optional | Register an independent local account |
| POST | /api/v1/auth/login | Optional | Sign in with email and password |
| POST | /api/v1/auth/logout | Required | Invalidate the current session |
| GET | /api/v1/me | Required | Current user profile and settings |
| PATCH | /api/v1/me | Required | Update profile and persisted study preferences |
| PUT | /api/v1/words/:id/notes | Required | Save a personal example and translation for any accessible word; no subscription gate |
| GET | /api/v1/sets | Optional | Search/filter sets; filter=mine|saved|studying |
| POST | /api/v1/sets | Required | Create a set with validated vocabulary |
| POST | /api/v1/sets/import | Required | Import normalized vocabulary JSON as a new set |
| GET | /api/v1/sets/:id | Optional | Set detail, word list and current user progress |
| GET | /api/v1/sets/:id/export | Required | Export accessible set as JSON |
| PATCH | /api/v1/sets/:id | Required | Edit owned set metadata or visibility |
| DELETE | /api/v1/sets/:id | Required | Delete an owned set; referenced assignments/history return conflict |
| POST | /api/v1/sets/:id/clone | Required | Copy an accessible set into your library |
| POST | /api/v1/sets/:id/words | Required | Append vocabulary to an owned set |
| PATCH | /api/v1/sets/:id/words/:word_id | Required | Edit a vocabulary entry |
| DELETE | /api/v1/sets/:id/words/:word_id | Required | Delete a vocabulary entry; preserve referenced study history |
| PUT | /api/v1/sets/:id/order | Required | Persist vocabulary ordering |
| GET | /api/v1/paths | Optional | Search/filter learning paths |
| POST | /api/v1/paths | Required | Create an ordered learning path |
| GET | /api/v1/paths/:id | Optional | Path detail and ordered accessible sets |
| PUT | /api/v1/paths/:id/sets | Required | Replace/reorder the sets of an owned path |
| PATCH | /api/v1/paths/:id | Required | Edit an owned learning path |
| DELETE | /api/v1/paths/:id | Required | Delete an owned learning path |
| PUT | /api/v1/bookmarks/:kind/:id | Required | Save/unsave a set, path, or word idempotently |
| GET | /api/v1/dictionary | Optional | Dictionary lookup in accessible local vocabulary |
| GET | /api/v1/study/options | Required | Effective study defaults, saved preferences and actual filter counts for FE settings |
| POST | /api/v1/study/sessions | Required | Start a server-graded study session with fixed questions |
| GET | /api/v1/study/sessions | Required | Study history and resumable sessions |
| GET | /api/v1/study/sessions/:id | Required | Resume a session without revealing unsubmitted answers |
| POST | /api/v1/study/sessions/:id/answers | Required | Grade an answer; retries are idempotent; update SRS and real points |
| POST | /api/v1/study/sessions/:id/answers/:question_id/correction | Required | Mark the latest answer wrong once; repair SRS/reward and audit the correction |
| GET | /api/v1/study/sessions/:id/questions | Required | Exam questions without answer keys, for the all-questions test screen |
| POST | /api/v1/study/sessions/:id/submit | Required | Submit a complete exam atomically; server grades every answer once |
| GET | /api/v1/study/sessions/:id/match | Required | Matching game pairs for a match session |
| GET | /api/v1/srs/summary | Required | Due counts, memory states, and a 14-day UTC forecast |
| GET | /api/v1/me/words | Required | All vocabulary actually reviewed by this account, with memory-level metadata |
| GET | /api/v1/srs/queue | Required | Paginated due review queue, optionally scoped to a set/path |
| PATCH | /api/v1/words/:id/progress | Required | Persist star/manual memory status separately from graded reviews |
| GET | /api/v1/sets/:id/progress | Required | Progress screen grouped into new/learning/mastered vocabulary |
| POST | /api/v1/sets/:id/progress/reset | Required | Explicitly reset only your progress in a set |
| GET | /api/v1/dashboard | Required | Personalized home sections; actual due count, history, and recommendations |
| GET | /api/v1/search | Optional | Search accessible sets and paths |
| GET | /api/v1/activity | Required | Current user study activity |
| GET | /api/v1/ranking | Required | Leaderboard from real graded answers; no fabricated users/points |
| GET | /api/v1/folders | Required | Created-library folders |
| POST | /api/v1/folders | Required | Create a folder |
| PUT | /api/v1/folders/:id/sets | Required | Organize accessible sets in an owned folder |
| DELETE | /api/v1/folders/:id | Required | Delete a folder without deleting its vocabulary sets |
| GET | /api/v1/classes | Required | Owned and joined classes |
| POST | /api/v1/classes | Required | Create a class and a private invitation code |
| POST | /api/v1/classes/join | Required | Join a class using a valid invitation code |
| GET | /api/v1/classes/:id | Required | Class roster and assignments, members only |
| POST | /api/v1/classes/:id/assignments | Required | Assign an accessible vocabulary set to a class |
| POST | /api/v1/classes/:id/assignments/:assignment_id/submit | Required | Submit a completed, server-graded study session |
| GET | /api/v1/classes/:id/assignments/:assignment_id/results | Required | Teacher-only real assignment results |
| POST | /api/v1/feedback | Required | Store a bug report or suggestion locally |
| POST | /api/v1/words/:id/learning-details | Required | Read prepared/cached details with allow_ai:false; explicit AI completion otherwise, cached reads never consume AI limits |
| GET | /api/v1/settings/ai | Required | Own AI settings without exposing API keys |
| PUT | /api/v1/settings/ai | Required | Save personal Gemini key or local Ollama model on the backend |
| POST | /api/v1/settings/ai/test | Required | Test the current user provider with a real request |
| POST | /api/v1/ai/generate | Required | Optional AI gateway: explicit 503 until configured, no simulated scores |
| GET | /api/v1/ai/history | Required | Current user AI history excluding server-graded exercise answer keys |
| GET | /api/v1/ai/history/:id | Required | Read owned AI history without exposing exercise answer keys |
| POST | /api/v1/conversations | Required | Create a private English conversation with persisted topic, exam and vocabulary filters |
| GET | /api/v1/conversations | Required | Current user conversation history |
| GET | /api/v1/conversations/:id | Required | Resume an owned conversation and its messages |
| DELETE | /api/v1/conversations/:id | Required | Delete an owned conversation, messages and its cached translations |
| POST | /api/v1/conversations/:id/start | Required | Generate and persist a real assistant opening without a fabricated user turn |
| POST | /api/v1/conversations/:id/messages | Required | Generate and atomically persist learner message and AI reply; failures preserve history |
| POST | /api/v1/conversations/:id/hint | Required | Get a contextual response hint without inserting fake conversation messages |
| POST | /api/v1/conversations/:id/messages/:message_id/translation | Required | Translate and cache an owned message in Vietnamese |
| GET | /api/v1/srs/practice | Required | Read-only per-set SRS practice scopes for all learning modes; real counts, selected IDs and explicit scheduling effects |
| GET | /api/v1/dictionary/entry | Required | Exact English word/phrase details for synonym popovers, with local Vietnamese senses and examples; no AI |
| GET | /api/v1/sets/:id/lessons | Required | Observed comprehensive plan: five words per lesson, five named steps |
| GET | /api/v1/sets/:id/lessons/:lesson_index | Required | Lesson words, step progress, and provider availability |
| POST | /api/v1/sets/:id/lessons/:lesson_index/steps/:step_index/start | Required | Start a lesson step with a validated five-word subset |
| POST | /api/v1/sets/:id/lessons/:lesson_index/steps/:step_index/complete | Required | Complete a step using actual server-owned session/AI/conversation evidence |
| GET | /api/v1/courses | Optional | Personal course catalog with authored content; legacy duplicates are preserved but not listed twice |
| POST | /api/v1/courses | Required | Create a course for your own/authorized teaching materials |
| GET | /api/v1/courses/:id | Optional | Ordered course parts/lessons with current learner progress |
| POST | /api/v1/courses/:id/parts | Required | Add an ordered part to an owned course |
| POST | /api/v1/courses/:id/parts/:part_id/lessons | Required | Import a validated write/choice lesson into an owned course |
| GET | /api/v1/course-lessons/:id/activities | Required | Resolve real lesson activities and linked topic routes without hardcoded sets or invented completion |
| GET | /api/v1/course-lessons/:id | Required | Course lesson content without answer keys |
| POST | /api/v1/course-lessons/:id/submit | Required | Grade an imported course lesson and persist learner completion |
| POST | /api/v1/course-lessons/:id/sessions | Required | Build a real course lesson flow from its phrases/questions, or resume the saved step |
| GET | /api/v1/course-learning-sessions | Required | Own resumable course lesson history |
| GET | /api/v1/course-learning-sessions/:id | Required | Resume exact course step and feedback without answer keys |
| PUT | /api/v1/course-learning-sessions/:id/draft | Required | Persist a private course quiz draft before grading |
| POST | /api/v1/course-learning-sessions/:id/steps/:step_id/complete | Required | Complete the current course step; speech checks transcript only, final quiz grades on server atomically |
| POST | /api/v1/exercise-attempts/:id/translation | Required | Read cached Vietnamese reading translation or explicitly request AI once; never grade or replace learner answers |
| GET | /api/v1/exercise-attempts/:id/questions | Required | Reading full-page safe questions and saved selections; only graded feedback reveals answers |
| PUT | /api/v1/exercise-attempts/:id/drafts | Required | Persist or clear reading full-page selections without grading |
| POST | /api/v1/exercise-attempts/:id/submit | Required | Atomically grade all reading gaps and comprehension answers; preserve previous grades and replay safely |
| GET | /api/v1/exercise-attempts | Required | Own grammar/reading attempt history and saved exercises |
| POST | /api/v1/exercise-attempts | Required | Create or resume a private server-graded sentence-ordering/reading exercise |
| GET | /api/v1/exercise-attempts/:id | Required | Resume an exercise without leaking answer keys |
| PUT | /api/v1/exercise-attempts/:id | Required | Persist own selected tokens/option or bookmark exercise |
| POST | /api/v1/exercise-attempts/:id/answers | Required | Server grade once; reveal only the submitted question answer |
| POST | /api/v1/exercise-attempts/:id/next | Required | Advance after feedback, idempotently persist completion |
| GET | /api/v1/learning/profile | Required | Own learning preferences; general foundation defaults, no inferred level or program enrollment |
| PUT | /api/v1/learning/profile | Required | Save own learning preferences atomically, retaining existing study settings; does not create a plan or enroll a course |
| GET | /api/v1/learning/mistakes | Required | Own real learning mistakes, due/resolved filters and actual counts; no generated errors |
| GET | /api/v1/learning/mistakes/:id | Required | Pinned original question and audio for a mistake; expected option hidden until review |
| GET | /api/v1/learning/mistakes/:id/reviews | Required | Own saved review feedback and answers; opening this history is assistance, not independent recall |
| POST | /api/v1/learning/mistakes/:id/reviews | Required | Idempotent spaced review; resolve after two unassisted correct recalls on due dates, not repeated clicks |
| GET | /api/v1/learning/programs | Required | Published pilot programs and actual lesson counts; separate foundation and IT/System tracks |
| GET | /api/v1/learning/programs/:id | Required | Real program lessons, objectives and own completion; no answer keys |
| GET | /api/v1/learning/today | Required | Stable own local-day plan from available content, active sessions and real due reviews |
| GET | /api/v1/learning/media/:id | Required | Authenticated saved English TTS WAV, including range requests; no external AI call |
| POST | /api/v1/learning/sessions | Required | Start/resume own pinned-version lesson session without invoking Gemini |
| GET | /api/v1/learning/sessions/:id | Required | Restore exact V2 lesson step, draft and feedback; no future answer keys |
| PUT | /api/v1/learning/sessions/:id/draft | Required | Validate and persist own step draft with optimistic revision control |
| POST | /api/v1/learning/sessions/:id/submit | Required | Grade deterministic tasks or record explicit self-review, atomically and idempotently; never fabricate AI scores |
| POST | /api/v1/learning/sessions/:id/advance | Required | Advance only after saved feedback; completion records activity, not a claim of mastery |
| GET | /api/v1/learning/listening | Required | Saved English listening materials with real sentence availability; no AI or guessed timestamps |
| GET | /api/v1/learning/listening/sessions | Required | Own saved sentence-listening/shadowing session history |
| GET | /api/v1/learning/listening/:lesson_id | Required | Full transcript/translation and separately synthesized sentence WAVs; not aligned cuts of the full recording |
| GET | /api/v1/learning/listening/media/:lesson_id/:version/:sentence_id | Required | Authenticated versioned sentence WAV with range support and real samples |
| POST | /api/v1/learning/listening/sessions | Required | Start/resume own listening or shadowing practice without grading or AI requests |
| GET | /api/v1/learning/listening/sessions/:id | Required | Resume exact saved sentence, settings and self-reported practice |
| POST | /api/v1/learning/listening/sessions/:id/sentences/:sentence_id/complete | Required | Save explicit self-reported sentence practice or skip, with revisions and idempotency; never invent a pronunciation score |
| GET | /api/v1/learning/progress | Required | Own evidence-based V2 progress by local date; no fabricated skill or proficiency scores |
| GET | /api/v1/learning/history | Required | Own resumable/completed V2 session history with real step counts and pinned content versions |
| GET | /api/v1/learning/sessions/:id/evidence | Required | Read own submitted writing/transcripts and graded evidence after reload; no future answer keys |
| GET | /api/v1/learning/sessions/:id/ai-feedback | Required | Read own saved V2 AI feedback without invoking a model or spending request slots |
| POST | /api/v1/learning/sessions/:id/steps/:step_id/ai-feedback | Required | User-triggered qualitative feedback on saved writing/transcript, cached/deduplicated and separate from grades; no pronunciation score |
| GET | /api/v1/learning/sessions/:id/audio-reviews | Required | Own cached V2 qualitative audio feedback and actual provider capability; no model call |
| POST | /api/v1/learning/sessions/:id/steps/:step_id/audio-reviews | Required | Explicit real-audio V2 pronunciation review; private cache, UUID retries and no grade changes or raw audio storage |
| DELETE | /api/v1/learning/sessions/:id/audio-reviews/:review_id | Required | Delete own saved audio feedback and retry aliases, preserving lesson submissions and grades |
| GET | /api/v1/learning/phrase-library | Required | Own private phrase collection and actual SRS due count; no automatic imports or AI |
| GET | /api/v1/learning/sessions/:id/steps/:step_id/phrases | Required | Pinned lesson phrases and whether each was explicitly saved to the learner collection |
| POST | /api/v1/learning/sessions/:id/steps/:step_id/phrases | Required | Explicitly save selected lesson phrases into own private study set and existing SRS, idempotently and without marking mastery |
| GET | /api/v1/learning/materials/capabilities | Required | Personal audio/transcript import limits; no external fetching or AI |
| GET | /api/v1/learning/materials | Required | Own private imported listening library and saved playback; never part of the public curriculum |
| POST | /api/v1/learning/materials | Required | Explicit import of own audio and optional transcript, stored privately with UUID retry protection |
| GET | /api/v1/learning/materials/:id | Required | Own transcript, optional translation, audio metadata and exact saved playback state |
| GET | /api/v1/learning/materials/:id/audio | Required | Authenticated private audio bytes with Range206; no base64 in metadata responses |
| PATCH | /api/v1/learning/materials/:id | Required | Edit own transcript/translation/title with optimistic revision, leaving audio and playback unchanged |
| PUT | /api/v1/learning/materials/:id/playback | Required | Persist actual player position, speed and manually selected A-B loop; no fabricated learning grade |
| DELETE | /api/v1/learning/materials/:id | Required | Delete own imported file/text/playback; authored curriculum and lesson evidence are untouched |
| GET | /api/v1/learning/materials/:id/cues | Required | Own manually timed transcript cues, independent of player and metadata revisions |
| PUT | /api/v1/learning/materials/:id/cues | Required | Atomically replace own manual A-B sentence timings with optimistic revision; no automatic alignment |
| POST | /api/v1/learning/materials/:id/dictation-attempts | Required | Server-checked personal sentence dictation with immutable cue snapshot and UUID retry; no AI or proficiency grade |
| GET | /api/v1/learning/materials/:id/dictation-attempts | Required | Own dictation history with original cue snapshots; counts are attempts, not mastered skills |
| POST | /api/v1/learning/materials/:id/cues/preview-import | Required | Preview private SRT/VTT as draft cues; validates supplied timings but never writes, aligns audio or calls AI |
| GET | /api/v1/learning/materials/:id/cues/export | Required | Export saved own cue text and original timestamps as SRT/VTT inside a JSON envelope; no private audio included |
| GET | /api/v1/openapi.json | Optional | Machine-readable API route inventory (raw OpenAPI, not an envelope) |
