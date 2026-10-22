import { fail,text,integer,enumeration,list,normalize } from './validation.mjs';
import {seedPersonalCurriculum} from './content/personal-curriculum.mjs';
import {gradeCourseLesson} from './course-grading.mjs';
const now=()=>new Date().toISOString();

export function courseService(db,{seed=true}={}) {
  if (seed) {
    // Helper to seed a course if not yet present
    const addCourse = (title, language, competence, parts) => {
      if(language!=='en'||competence==='IELTS')return;
      const existing = db.prepare("SELECT id FROM courses WHERE owner_id IS NULL AND language=? AND competence=? ORDER BY id LIMIT 1").get(language,competence);
      if (existing) return;
      const id = Number(db.prepare("INSERT INTO courses(title,language,competence,visibility,source,created_at) VALUES(?,?,?,'public','observed_metadata',?)").run(title, language, competence, now()).lastInsertRowid);
      parts.forEach(([partTitle, lessons], i) => {
        const part = Number(db.prepare('INSERT INTO course_parts(course_id,title,position) VALUES(?,?,?)').run(id, partTitle, i).lastInsertRowid);
        lessons.forEach((lTitle, j) => db.prepare('INSERT INTO course_lessons(part_id,title,position) VALUES(?,?,?)').run(part, lTitle, j));
      });
    };

    // 1. English A1
    addCourse('Tiếng Anh — A1 (Khởi động)', 'en', 'A1', [
      ['Hello, World!', ['Hello & Goodbye',"What's Your Name?",'Where Are You From?','Numbers & Age','How Are You?']],
      ['Things Around Me',['What Is This?','Colors Everywhere','My Room','One or Many?','Where Is It?']],
      ['My Day',['What Time Is It?','I Wake Up At 7','At School / At Work','After Work','My Week']],
      ['People & Family',['My Family','What Does She Look Like?',"I Like... / I Don't Like...",'Can You Swim?','Tell Me About Your Friend']],
      ['Food & Shopping',['Breakfast, Lunch & Dinner',"I'm Hungry!",'At the Supermarket','How Much Is It?','My Favorite Food']],
      ['Getting Around',['Where Is the Station?','Bus, Train, or Taxi?','What Are You Doing?','The Weather Today','My First Conversation']],
    ]);

    // 2. English A2
    addCourse('Tiếng Anh — A2 (Sơ cấp)', 'en', 'A2', [
      ['Routines & Hobbies', ['Daily Schedules', 'Outdoor Activities', 'Favorite Weekend Passions', 'Healthy Habits', 'Free Time Conversation']],
      ['Travel & Transport', ['Booking Flights', 'Checking into Hotels', 'Asking for Directions', 'Public Transport in London', 'Travel Experiences']],
      ['Past Memories', ['Childhood Stories', 'My Last Vacation', 'Historic Events', 'Memorable Moments', 'Expressing Past Regrets']],
    ]);

    // 3. IELTS Speaking Band 7.0+
    addCourse('IELTS Speaking — Masterclass Band 7.0+', 'en', 'IELTS', [
      ['Part 1: Personal Reflex', ['Hometown & Accommodation', 'Work, Studies & Ambitions', 'Leisure, Technology & Hobbies', 'Art, Music & Culture', 'Fluency & Pronunciation Fixes']],
      ['Part 2: Long Turn Speeches', ['Describing a Remarkable Person', 'Describing an Inspiring Place', 'Describing a Memorable Journey', 'Describing an Important Achievement', 'Structuring the 2-Minute Speech']],
      ['Part 3: In-Depth Discussion', ['Societal Impact of Technology', 'Environmental Sustainability', 'Education in the 21st Century', 'Globalization & Tradition', 'High-Band Idiomatic Collocations']],
    ]);

    // 4. TOEIC 4 Kỹ Năng 850+
    addCourse('TOEIC — Luyện đề & Từ vựng 850+', 'en', 'TOEIC', [
      ['Part 1 & 2: Nghe phản xạ văn phòng', ['Mô tả tranh ảnh văn phòng', 'Câu hỏi Wh- Questions', 'Hỏi đáp logic nơi làm việc', 'Bẫy phát âm & nối âm', 'Luyện nghe phản xạ nhanh']],
      ['Part 5 & 6: Ngữ pháp & Điền đoạn văn', ['Trật tự từ & Từ loại nhanh', 'Liên từ & Giới từ chuyên sâu', 'Thì động từ & Thể bị động', 'Điền câu hoàn chỉnh Part 6', 'Chiến thuật làm bài 30 giây']],
      ['Part 7: Đọc hiểu văn bản thương mại', ['Đơn hàng, Báo giá & Hóa đơn', 'Email & Bản ghi nhớ nội bộ', 'Đoạn văn kép & Đoạn văn 3', 'Kỹ thuật Skimming & Scanning', 'Tổng ôn bộ đề 850+']],
    ]);

    // 5. Chinese HSK 1 & HSK 2
    addCourse('Tiếng Trung — HSK 1 (Nhập môn Hán ngữ)', 'zh', 'HSK 1', [
      ['Phát âm Pinyin & Chào hỏi', ['Bảng thanh mẫu & Vận mẫu', '4 Thanh điệu cơ bản', 'Chào hỏi & Cảm ơn', 'Hỏi tên & Quốc tịch', 'Đếm số từ 1 đến 100']],
      ['Đời sống & Gia đình', ['Giới thiệu thành viên gia đình', 'Nghề nghiệp & Nơi làm việc', 'Hỏi giờ giấc & Ngày tháng', 'Đi đâu, làm gì?', 'Ôn tập 150 từ vựng HSK 1']],
    ]);

    addCourse('Tiếng Trung — HSK 2 (Giao tiếp thực tế)', 'zh', 'HSK 2', [
      ['Mua sắm & Ăn uống', ['Giá tiền & Mặc cả', 'Gọi món tại nhà hàng', 'Món ăn truyền thống Trung Hoa', 'Màu sắc & Kích cỡ trang phục', 'Hội thoại thanh toán']],
      ['Đi lại & Hẹn gặp', ['Hỏi đường & Phương tiện', 'Thời tiết bốn mùa', 'Khám bệnh & Uống thuốc', 'Sở thích thể thao', 'Ôn tập 300 từ vựng HSK 2']],
    ]);

    // 6. Japanese JLPT N5
    addCourse('Tiếng Nhật — JLPT N5 (Sơ cấp cơ bản)', 'ja', 'JLPT N5', [
      ['Chữ cái & Chào hỏi', ['Bảng Hiragana trọn bộ', 'Bảng Katakana biến âm', 'Lời chào hỏi hàng ngày', 'Chữ số & Cách đếm đồ vật', 'Hội thoại làm quen']],
      ['Minna no Nihongo Bài 1-12', ['Đại từ nhân xưng & Đất nước', 'Vật này, vật đó (Kore, Sore, Are)', 'Ở đâu (Koko, Soko, Asoko)', 'Thời gian & Lịch trình', 'Tính từ đuôi い và な']],
    ]);

    // 7. Korean TOPIK I
    addCourse('Tiếng Hàn — TOPIK I (Căn bản & Nhập môn)', 'ko', 'TOPIK I', [
      ['Bảng chữ cái Hangeul & Phát âm', ['Nguyên âm cơ bản & Mở rộng', 'Phụ âm thường & Phụ âm căng', 'Quy tắc ghép vần & Batchim', 'Đại từ xưng hô', 'Lời chào kính ngữ']],
      ['Ngữ pháp & Từ vựng sinh hoạt', ['Cấu trúc câu 은/는 và 이/가', 'Địa điểm & Động từ di chuyển', 'Mua sắm & Gọi đồ ăn tại Seoul', 'Hỏi thời gian & Thời tiết', 'Luyện đề thi TOPIK I Cấp 1']],
    ]);
  }

  if(seed)seedPersonalCurriculum(db);

  function access(id,user,owner=false) {
    const course=db.prepare('SELECT * FROM courses WHERE id=?').get(integer(id,'course_id'));
    if(!course||(course.visibility!=='public'&&course.owner_id!==user?.id))fail(404,'NOT_FOUND','Course not found.');if(owner&&course.owner_id!==user?.id)fail(403,'FORBIDDEN','Only the course owner can edit it.');return course;
  }
  function lessonAccess(id,user) {
    const row=db.prepare('SELECT l.*,p.course_id FROM course_lessons l JOIN course_parts p ON l.part_id=p.id WHERE l.id=?').get(integer(id,'lesson_id'));if(!row)fail(404,'NOT_FOUND','Course lesson not found.');access(row.course_id,user);return row;
  }
  function registerRoutes(route) {
    route('GET','/courses',c=>{
      const rows=db.prepare("SELECT * FROM courses WHERE (visibility='public' OR owner_id=?) AND(?='' OR language=?) AND(?='' OR competence=?) ORDER BY id").all(c.user?.id??-1,c.query.get('language')??'',c.query.get('language')??'',c.query.get('competence')??'',c.query.get('competence')??'');
      const seen=new Set();return {items:rows.filter(row=>{if(row.owner_id)return true;if(row.language!=='en'||!['A1','A2','TOEIC'].includes(row.competence))return false;const key=row.language+':'+row.competence;if(seen.has(key))return false;seen.add(key);return true;})};
    },{public:true,summary:'Personal course catalog with authored content; legacy duplicates are preserved but not listed twice'});
    route('POST','/courses',c=>{const r=db.prepare('INSERT INTO courses(owner_id,title,language,competence,visibility,created_at) VALUES(?,?,?,?,?,?)').run(c.user.id,text(c.body.title,'title',{max:200}),text(c.body.language,'language',{max:20}),text(c.body.competence,'competence',{max:30}),enumeration(c.body.visibility,'visibility',['private','public'],'private'),now());c.status=201;return access(Number(r.lastInsertRowid),c.user);},{summary:'Create a course for your own/authorized teaching materials'});
    route('GET','/courses/:id',c=>{const course=access(c.params.id,c.user);return {...course,parts:db.prepare('SELECT * FROM course_parts WHERE course_id=? ORDER BY position,id').all(course.id).map(p=>({...p,lessons:db.prepare('SELECT l.id,l.title,l.position,l.content_status,cp.score,cp.total,cp.completed_at FROM course_lessons l LEFT JOIN course_progress cp ON l.id=cp.lesson_id AND cp.user_id=? WHERE l.part_id=? ORDER BY l.position,l.id').all(c.user?.id??-1,p.id)}))};},{public:true,summary:'Ordered course parts/lessons with current learner progress'});
    route('POST','/courses/:id/parts',c=>{const course=access(c.params.id,c.user,true);const position=db.prepare('SELECT COUNT(*) n FROM course_parts WHERE course_id=?').get(course.id).n;const r=db.prepare('INSERT INTO course_parts(course_id,title,position) VALUES(?,?,?)').run(course.id,text(c.body.title,'title',{max:200}),position);c.status=201;return {id:Number(r.lastInsertRowid),course_id:course.id,position};},{summary:'Add an ordered part to an owned course'});
    route('POST','/courses/:id/parts/:part_id/lessons',c=>{
      const course=access(c.params.id,c.user,true),partId=integer(c.params.part_id,'part_id');if(!db.prepare('SELECT 1 FROM course_parts WHERE id=? AND course_id=?').get(partId,course.id))fail(404,'NOT_FOUND','Course part not found.');
      const questions=list(c.body.questions,'questions',100);if(!questions.length)fail(400,'VALIDATION_ERROR','Supply at least one question.');
      const normalized=questions.map((q,i)=>{const type=enumeration(q.type,'type',['write','choice']);const result={id:String(i+1),type,prompt:text(q.prompt,'prompt',{max:3000})};if(type==='write')result.answer=text(q.answer,'answer',{max:2000});else{result.options=list(q.options,'options',8).map((o,i)=>({id:String(i+1),text:text(o,'option',{max:1000})}));if(result.options.length<2)fail(400,'VALIDATION_ERROR','At least two options are required.');result.correct_option_id=String(integer(q.correct_option_index,'correct_option_index',{min:0,max:result.options.length-1})+1);}return result;});
      const position=db.prepare('SELECT COUNT(*) n FROM course_lessons WHERE part_id=?').get(partId).n;const r=db.prepare("INSERT INTO course_lessons(part_id,title,position,content,content_status) VALUES(?,?,?,?,'complete')").run(partId,text(c.body.title,'title',{max:200}),position,JSON.stringify({instruction:text(c.body.instruction,'instruction',{min:0,max:5000,fallback:''}),questions:normalized}));c.status=201;return {id:Number(r.lastInsertRowid),part_id:partId,position,content_status:'complete'};
    },{summary:'Import a validated write/choice lesson into an owned course'});
    route('GET','/course-lessons/:id/activities',c=>{
      const row=lessonAccess(c.params.id,c.user);if(!row.content)fail(409,'CONTENT_NOT_IMPORTED','Lesson content has not been imported.');
      const body=JSON.parse(row.content),base=`/courses/${row.course_id}/lesson/${row.id}`;
      const activities=[{key:'lesson',title:'Bài học',scope:'lesson',route:base}];
      if(body.phrases?.length)activities.push({key:'flashcards',title:'Flashcards và nghe mẫu câu',scope:'lesson',route:base+'?tab=cards'});
      if(body.questions?.length)activities.push({key:'practice',title:'Bài tập chấm trên server',scope:'lesson',route:base+'?tab=practice'});
      const linked=Number.isSafeInteger(body.set_id)?db.prepare("SELECT id,title FROM study_sets WHERE id=? AND(visibility='public' OR owner_id=?)").get(body.set_id,c.user.id):null;
      if(linked)for(const [key,title,prefix]of [['vocabulary','Ôn từ theo chủ đề','study-set'],['grammar','Ngữ pháp theo chủ đề','grammar'],['dictation','Nghe chép theo chủ đề','dictation'],['speaking','Speaking theo chủ đề','ai-study'],['conversation','Hội thoại theo chủ đề','conversation'],['reading','Đọc hiểu theo chủ đề','reading']])activities.push({key,title,scope:'topic',set_id:linked.id,route:`/${prefix}/${linked.id}`});
      const progress=db.prepare('SELECT score,total,completed_at FROM course_progress WHERE user_id=? AND lesson_id=?').get(c.user.id,row.id)||null;
      return {course_id:row.course_id,lesson_id:row.id,linked_set:linked||null,activities,progress,completion_rule:'submit_course_lesson'};
    },{summary:'Resolve real lesson activities and linked topic routes without hardcoded sets or invented completion'});
    route('GET','/course-lessons/:id',c=>{const row=lessonAccess(c.params.id,c.user);if(!row.content)fail(409,'CONTENT_NOT_IMPORTED','Only lesson metadata is available. Import authorized lesson material first.');const content=JSON.parse(row.content);return {...row,content:{...content,questions:content.questions.map(({answer,correct_option_id,...q})=>q)}};},{summary:'Course lesson content without answer keys'});
    route('POST','/course-lessons/:id/submit',c=>gradeCourseLesson(db,lessonAccess(c.params.id,c.user),c.user,c.body),{summary:'Grade an imported course lesson and persist learner completion'});
  }
  return {registerRoutes,lessonAccess};
}
