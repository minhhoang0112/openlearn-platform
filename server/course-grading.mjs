import {fail,list,normalize} from './validation.mjs';

// Shared by direct lesson submissions and the final step of a resumable course flow.
export function gradeCourseLesson(db,row,user,body){
  if(!row.content)fail(409,'CONTENT_NOT_IMPORTED','Lesson content has not been imported.');
  const previous=db.prepare('SELECT * FROM course_progress WHERE user_id=? AND lesson_id=?').get(user.id,row.id);
  if(previous&&body.retry!==true)return {lesson_id:row.id,score:previous.score,total:previous.total,results:JSON.parse(previous.answers),completed_at:previous.completed_at,replayed:true};
  const questions=JSON.parse(row.content).questions,answers=list(body.answers,'answers',100);
  if(!Array.isArray(questions)||!questions.length)fail(409,'CONTENT_NOT_IMPORTED','The lesson has no gradable questions.');
  if(answers.length!==questions.length||new Set(answers.map(a=>a?.question_id)).size!==answers.length)fail(400,'INVALID_ANSWERS','Answer every question exactly once.');
  const results=questions.map(q=>{
    const a=answers.find(a=>a?.question_id===q.id);if(!a)fail(400,'INVALID_ANSWERS','Unknown or missing question.');
    if(q.type==='choice'&&!q.options.some(o=>o.id===a.option_id))fail(400,'INVALID_ANSWERS','Select a valid option for every choice question.');
    if(q.type!=='choice'&&(typeof a.answer!=='string'||a.answer.length>3000))fail(400,'INVALID_ANSWERS','Supply a valid text answer.');
    const correct=q.type==='choice'?a.option_id===q.correct_option_id:normalize(a.answer)===normalize(q.answer);
    return {question_id:q.id,correct,expected:q.type==='choice'?q.correct_option_id:q.answer};
  });
  const score=results.filter(r=>r.correct).length,completed=new Date().toISOString();
  db.prepare('INSERT INTO course_progress VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,lesson_id) DO UPDATE SET score=excluded.score,total=excluded.total,answers=excluded.answers,completed_at=excluded.completed_at').run(user.id,row.id,score,questions.length,JSON.stringify(results),completed);
  return {lesson_id:row.id,score,total:questions.length,results,completed_at:completed,replayed:false};
}
