import {readFileSync} from 'node:fs';
import {buildFoundationExtension} from './foundation-extension.mjs';
import {buildFoundationNext} from './foundation-next.mjs';
import {buildFoundationCheckpointTwo} from './foundation-checkpoint-two.mjs';
import {buildSystemExtension} from './system-extension.mjs';
import {buildFoundationEveryday} from './foundation-everyday.mjs';
import {buildReleaseOneCompletion} from './release-one-completion.mjs';
const scripts=JSON.parse(readFileSync(new URL('./audio-scripts.json',import.meta.url),'utf8'));
const provenance={origin:'local_authored',audio_source:'windows_tts',voice:'Microsoft David Desktop',human_review_status:'text_checked_audio_not_human_reviewed'};

function lesson(system){
  const id=system?'system-introductions-01':'foundation-introductions-01';
  const transcript=scripts.find(s=>s.id===id).transcript;
  const phrases=system?[
    {text:'university student',translation:'sinh viên đại học'},
    {text:'study information technology',translation:'học công nghệ thông tin'},
    {text:'computer systems',translation:'các hệ thống máy tính'}
  ]:[
    {text:'university student',translation:'sinh viên đại học'},
    {text:'live in Hanoi',translation:'sống ở Hà Nội'},
    {text:'study in the morning',translation:'học vào buổi sáng'}
  ];
  return {
    id,program_id:system?'english-it-system':'english-foundation',version:1,
    title:system?'Giới thiệu việc học và hướng IT/System':'Giới thiệu bản thân',position:0,level_hint:'A1 practice',estimated_minutes:20,
    objectives:[system?'Nói và viết về ngành học bằng câu có hỗ trợ.':'Nói và viết ba câu giới thiệu bản thân.','Phân biệt I am và I study trong câu mẫu.'],
    recommended_prerequisites:system?['foundation-introductions-01']:[],provenance,
    media_id:id,transcript,translation:system?'Chào, mình là Linh. Mình là sinh viên đại học. Mình học công nghệ thông tin. Mình muốn làm việc với các hệ thống máy tính. Bạn học ngành gì?':'Chào, mình là Linh. Mình là sinh viên đại học. Mình sống ở Hà Nội. Mình học vào buổi sáng. Còn bạn thì sao?',
    steps:[
      {id:'listen-main',type:'listen_comprehension',title:'Nghe ý chính',prompt:system?'What does Linh study?':'Where does Linh live?',response_schema:'choice',options:system?[{id:'a',text:'Information technology'},{id:'b',text:'Medicine'}]:[{id:'a',text:'Hanoi'},{id:'b',text:'London'}],answer:'a',explanation:system?'Linh nói: I study information technology.':'Linh nói: I live in Hanoi.'},
      {id:'phrases',type:'vocabulary_in_context',title:'Hiểu các cụm trong bài',response_schema:'acknowledge',phrases,prompt:'Nghe lại, đọc nghĩa và thử nhớ các cụm trước khi xem nghĩa lần nữa.'},
      {id:'grammar',type:'grammar_practice',title:'I am và I study',response_schema:'choice',instruction:'I am + danh từ chỉ người/vai trò: I am a student. I study + ngành học: study là động từ. Không dùng I am study.',prompt:'Điền từ: I ___ a university student.',options:[{id:'am',text:'am'},{id:'study',text:'study'}],answer:'am',explanation:'I am a university student: am đi với chủ ngữ I để giới thiệu vai trò.'},
      {id:'pronunciation',type:'pronunciation_practice',title:'Nghe rồi nói lại',response_schema:'self_reflection',prompt:'Nghe câu giới thiệu, dừng và nhắc lại. Có thể tự ghi âm/nghe lại nếu giao diện hỗ trợ.',target:'I am a university student.',guidance:'Nghe rõ các từ university student. Chú ý trọng âm đầu của student. Mục tiêu là dễ hiểu, chưa cần bắt chước toàn bộ giọng đọc.',assessment:'self_review',rubric:['Tôi đã nghe mẫu.','Tôi đã thử nói lại câu.']},
      {id:'speaking',type:'speaking_task',title:'Nói về bản thân',response_schema:'text',prompt:system?'Tự giới thiệu và nói ngành học của bạn bằng 2–3 câu.':'Tự giới thiệu tên, vai trò và nơi sống bằng 2–3 câu.',model:system?'My name is ___. I am a university student. I study information technology.':'My name is ___. I am a student. I live in ___.',assessment:'self_review',rubric:['Thông tin đúng với bản thân.','Dùng I am cho vai trò; I live/I study cho hành động.','Đọc được câu mình vừa nói.']},
      {id:'writing',type:'writing_task',title:'Viết lại bằng lời của bạn',response_schema:'text',prompt:system?'Viết ba câu giới thiệu bản thân, ngành học và công việc muốn làm. Có thể dùng mẫu.':'Viết ba câu giới thiệu bản thân. Thay tên, nơi sống và vai trò cho đúng với bạn.',model:system?'I am ___. I study ___. I want to work with ___.':'My name is ___. I am ___. I live in ___.',assessment:'self_review',rubric:['Viết hoa I và đầu câu.','Có dấu kết thúc câu.','Không viết I am study.']},
      {id:'reflection',type:'reflection',title:'Ghi lại điều cần ôn',response_schema:'self_reflection',prompt:'Bạn đã làm được gì? Cụm hoặc âm nào muốn ôn lại?',assessment:'self_review'}
    ]
  };
}
function foundationTask(config){
  const transcript=scripts.find(s=>s.id===config.id).transcript;
  return {
    id:config.id,program_id:config.program_id??'english-foundation',version:1,title:config.title,position:config.position,
    level_hint:'A1 practice',estimated_minutes:20,objectives:config.objectives,
    recommended_prerequisites:config.prerequisites,provenance,media_id:config.id,transcript,translation:config.translation,
    steps:[
      {id:'listen-main',type:'listen_comprehension',title:'Nghe ý chính',response_schema:'choice',...config.listening},
      {id:'phrases',type:'vocabulary_in_context',title:'Hiểu các cụm trong bài',response_schema:'acknowledge',phrases:config.phrases,prompt:'Nghe lại, đọc nghĩa và thử nói một câu có cụm vừa học.'},
      {id:'grammar',type:'grammar_practice',title:config.grammarTitle,response_schema:'choice',...config.grammar},
      {id:'pronunciation',type:'pronunciation_practice',title:'Nghe và nhắc lại',response_schema:'self_reflection',prompt:'Nghe mẫu, dừng rồi nhắc lại câu mục tiêu.',target:config.target,guidance:config.guidance,assessment:'self_review',rubric:['Tôi đã nghe mẫu.','Tôi đã thử nói câu mục tiêu.']},
      {id:'speaking',type:'speaking_task',title:'Dùng câu trong tình huống',response_schema:'text',prompt:config.speaking,model:config.model,assessment:'self_review',rubric:config.rubric},
      {id:'writing',type:'writing_task',title:'Viết lại bằng lời của bạn',response_schema:'text',prompt:config.writing,model:config.model,assessment:'self_review',rubric:config.rubric},
      {id:'reflection',type:'reflection',title:'Ghi lại điều cần ôn',response_schema:'self_reflection',prompt:'Cụm nào bạn muốn ôn lại? Bạn đã dùng được mẫu câu nào?',assessment:'self_review'}
    ]
  };
}
const timeLesson=foundationTask({
  id:'foundation-time-01',title:'Giờ giấc và lịch học',position:1,prerequisites:['foundation-introductions-01'],
  objectives:['Nghe được một số mốc giờ trong lịch học.','Nói và viết về lịch của mình với at + giờ.'],
  translation:'Tôi học vào buổi sáng. Lớp học của tôi bắt đầu lúc tám giờ. Tôi ăn trưa lúc mười hai giờ. Tôi về nhà lúc năm giờ. Lớp của bạn bắt đầu lúc mấy giờ?',
  listening:{prompt:'What time does the class start?',options:[{id:'eight',text:'At eight'},{id:'five',text:'At five'}],answer:'eight',explanation:'My class starts at eight: lớp học bắt đầu lúc tám giờ, không phải giờ về nhà.'},
  phrases:[{text:'in the morning',translation:'vào buổi sáng'},{text:'start at eight',translation:'bắt đầu lúc tám giờ'},{text:'have lunch',translation:'ăn trưa'},{text:'go home',translation:'về nhà'}],
  grammarTitle:'At + giờ và I/My class',
  grammar:{instruction:'Dùng at trước giờ: at eight. Dùng in the morning để nói buổi sáng. I study nhưng My class starts: chủ ngữ My class là số ít, động từ hiện tại đơn thêm s. Bài này chỉ luyện at trước giờ.',prompt:'Điền từ: My class starts ___ eight.',options:[{id:'at',text:'at'},{id:'in',text:'in'}],answer:'at',explanation:'At dùng trước giờ cụ thể: at eight. In dùng trong cụm in the morning.'},
  target:'My class starts at eight.',guidance:'Nghe rõ từ chỉ giờ, sau đó đọc chậm toàn câu. Tập phát âm phần cuối của starts; không cần bắt chước tốc độ giọng mẫu.',
  speaking:'Nói ba câu về giờ học, giờ ăn trưa và giờ về nhà của bạn.',
  writing:'Viết ba câu về lịch một ngày của bạn. Dùng giờ thật của mình; có thể xem mẫu.',
  model:'My class starts at ___. I have lunch at ___. I go home at ___.',
  rubric:['Thông tin đúng với lịch của mình.','Dùng at trước giờ.','Dùng I go nhưng My class starts.']
});
const helpLesson=foundationTask({
  id:'foundation-help-01',title:'Nhờ giúp đỡ và nói điều chưa làm được',position:2,prerequisites:['foundation-introductions-01'],
  objectives:['Hiểu lời nhờ giúp và mô tả một khó khăn đơn giản.','Dùng Can you…? và cannot + động từ nguyên mẫu.'],
  translation:'Bạn giúp tôi được không? Tôi không mở được tệp này. Hãy thử lại nhé. Giờ nó hoạt động rồi. Cảm ơn bạn đã giúp.',
  listening:{prompt:'What is the problem?',options:[{id:'file',text:'The speaker cannot open a file.'},{id:'class',text:'The class starts late.'}],answer:'file',explanation:'I cannot open this file: người nói không mở được tệp.'},
  phrases:[{text:'Can you help me, please?',translation:'Bạn giúp tôi được không?'},{text:'open this file',translation:'mở tệp này'},{text:'try again',translation:'thử lại'},{text:'It works now.',translation:'Giờ nó hoạt động rồi.'}],
  grammarTitle:'Can + động từ',
  grammar:{instruction:'Can you help me? là câu nhờ giúp. Sau can/cannot dùng động từ nguyên mẫu: open, không dùng opens hoặc to open. Cannot cũng có dạng rút gọn can’t; không dùng don’t can.',prompt:'Chọn từ đúng: I cannot ___ this file.',options:[{id:'open',text:'open'},{id:'opens',text:'opens'}],answer:'open',explanation:'Sau cannot dùng open, không thêm s.'},
  target:'Can you help me, please?',guidance:'Nghe cách nhóm từ help me. Nói rõ câu nhờ giúp, thêm please với giọng lịch sự. Dạng cannot trong bài được đọc đầy đủ để dễ nghe.',
  speaking:'Đóng vai đang gặp một khó khăn: nhờ giúp, nói điều bạn chưa làm được, rồi cảm ơn.',
  writing:'Viết tin nhắn ngắn nhờ bạn giúp mở một tệp. Nêu khó khăn và cảm ơn.',
  model:'Can you help me, please? I cannot open this file. Thank you for your help.',
  rubric:['Có câu nhờ giúp rõ ràng.','Sau can/cannot dùng động từ nguyên mẫu.','Có lời cảm ơn; không đưa mật khẩu hoặc thông tin riêng vào bài.']
});
const routineLesson=foundationTask({
  id:'foundation-routine-01',title:'Một ngày học tập',position:3,prerequisites:['foundation-time-01'],
  objectives:['Nghe và đọc để lấy thông tin về một lịch sinh hoạt.','Nói và viết về các việc mình làm trong ngày bằng hiện tại đơn.'],
  translation:'Tôi thức dậy lúc bảy giờ. Tôi ăn sáng ở nhà. Tôi đến trường đại học lúc tám giờ. Sau giờ học, tôi học ở thư viện. Tôi về nhà lúc năm giờ. Bạn làm gì sau giờ học?',
  listening:{prompt:'What time does the speaker get up?',options:[{id:'seven',text:'At seven'},{id:'eight',text:'At eight'}],answer:'seven',explanation:'I get up at seven: người nói thức dậy lúc bảy giờ. Tám giờ là giờ đến trường.'},
  phrases:[{text:'get up',translation:'thức dậy, ra khỏi giường'},{text:'have breakfast',translation:'ăn sáng'},{text:'after class',translation:'sau giờ học'},{text:'study in the library',translation:'học ở thư viện'}],
  grammarTitle:'Hiện tại đơn với I',
  grammar:{instruction:'Dùng hiện tại đơn để nói việc thường làm: I study in the library. Với I, dùng study, không dùng studies. He/She studies là chủ ngữ khác; không thêm s chỉ vì câu nói về việc hằng ngày.',prompt:'Điền từ: I ___ in the library after class.',options:[{id:'study',text:'study'},{id:'studies',text:'studies'}],answer:'study',explanation:'Với chủ ngữ I, động từ là study. Không thêm s.'},
  target:'I study in the library after class.',guidance:'Nghe cụm after class, dừng rồi nhắc lại. Đọc đủ âm cuối của class; nói chậm và rõ trước khi tăng tốc.',
  speaking:'Kể ba việc bạn thường làm trong ngày, kèm một mốc giờ. Dùng thông tin của mình.',
  writing:'Viết ba đến bốn câu về ngày học hoặc ngày làm của bạn. Có thể dùng after class hoặc after work.',
  model:'I get up at ___. I have breakfast ___. After class, I ___. I go home at ___.',
  rubric:['Việc và giờ đúng với sinh hoạt của mình.','Dùng động từ nguyên mẫu sau I trong các câu hiện tại đơn này.','Có viết hoa đầu câu và dấu kết thúc câu.']
});
routineLesson.steps.splice(3,0,{
  id:'read-detail',type:'reading_comprehension',title:'Đọc để tìm thông tin',response_schema:'choice',
  prompt:'Đọc đoạn sau: Mai is a university student. She has breakfast at home. After class, she studies in the library. She goes home at six.\n\nWhere does Mai study after class?',
  options:[{id:'library',text:'In the library'},{id:'home',text:'At home'},{id:'cafe',text:'In a cafe'}],answer:'library',
  explanation:'Đoạn văn nói: After class, she studies in the library. At home là nơi Mai ăn sáng, không phải nơi học sau giờ học.'
});
export const starterLessons=[lesson(false),timeLesson,helpLesson,routineLesson,...buildFoundationExtension({makeLesson:foundationTask,scripts,provenance}),...buildFoundationNext({makeLesson:foundationTask}),...buildFoundationCheckpointTwo({makeLesson:foundationTask,scripts,provenance}),...buildFoundationEveryday({makeLesson:foundationTask}),lesson(true),...buildSystemExtension({makeLesson:foundationTask}),...buildReleaseOneCompletion({makeLesson:foundationTask,scripts,provenance})];
export const starterPrograms=[
  {id:'english-foundation',title:'Nền tảng tiếng Anh',kind:'foundation',version:1,status:'pilot'},
  {id:'english-it-system',title:'English for IT/System',kind:'specialist',version:1,status:'pilot'}
];
