import {createHash} from 'node:crypto';
import {starterLessons} from './curriculum.mjs';

const pair=(en,vi)=>({en,vi});
const word=(term,meaning,word_type,en,vi)=>({term,meaning,word_type,example:en,translation:vi});
const error=(incorrect,correct,reason)=>({incorrect,correct,reason});
const packs={
  'foundation-introductions-01':{
    title:'Tự giới thiệu bằng câu ngắn',
    summary:'Học cách nói tên, vai trò và nơi sống. Danh từ gọi tên người/vật; động từ diễn tả hành động hoặc trạng thái. Không cần nhớ tất cả thuật ngữ trước khi bắt đầu.',
    vocabulary:[
      word('name','tên','danh từ','My name is Nam.','Tên tôi là Nam.'),
      word('student','học sinh; sinh viên','danh từ','I am a student.','Tôi là sinh viên.'),
      word('university student','sinh viên đại học','cụm danh từ','Mai is a university student.','Mai là sinh viên đại học.'),
      word('live in','sống ở','cụm động từ','I live in Da Nang.','Tôi sống ở Đà Nẵng.'),
      word('study','học','động từ','I study English.','Tôi học tiếng Anh.'),
      word('in the morning','vào buổi sáng','cụm giới từ','I study in the morning.','Tôi học vào buổi sáng.'),
    ],
    grammar:[
      {title:'Nói mình là ai: I am…',pattern:'I + am + a/an + danh từ chỉ vai trò',explanation:'I nghĩa là tôi. Am là dạng của động từ be đi với I. Trước danh từ đếm được số ít chỉ vai trò thường cần a/an; trong a university student dùng a vì university bắt đầu bằng âm /j/, không phải âm nguyên âm.',examples:[pair('I am a student.','Tôi là sinh viên.'),pair('I am a university student.','Tôi là sinh viên đại học.')]},
      {title:'Nói việc mình làm: I live / I study',pattern:'I + động từ + phần thông tin còn lại',explanation:'Live và study đã là động từ. Với những câu này, không thêm am trước live hoặc study. In cho biết nơi sống trong cụm live in + tên nơi.',examples:[pair('I live in Hue.','Tôi sống ở Huế.'),pair('I study English.','Tôi học tiếng Anh.')]},
    ],
    common_errors:[error('I am study English.','I study English.','Study đã là động từ chính; câu hiện tại đơn này không dùng am.'),error('I am student.','I am a student.','Student là danh từ đếm được số ít; khi giới thiệu vai trò cần a.')],
    listening_tips:['Nghe một lần để nhận ra người nói đang giới thiệu mình; chưa cần chép từng từ.','Nghe lại, chú ý nhóm I am / I live / I study. Nếu mở nghĩa hoặc bài nói để tìm đáp án, đó là lượt làm có trợ giúp.'],
    pronunciation_tips:['Nghe từng cụm ngắn, dừng audio rồi nhắc lại.','Ở student, nhấn rõ phần đầu. Nói chậm và rõ trước khi tăng tốc; audio mẫu hiện là giọng TTS, chưa phải đánh giá phát âm của bạn.'],
    practice:[{type:'speaking',instruction:'Thay chỗ trống bằng thông tin thật của bạn rồi nói ba câu. Có thể tự thu và nghe lại.',model:'My name is ___. I am a student. I live in ___.',translation:'Tên tôi là ___. Tôi là sinh viên. Tôi sống ở ___.'},{type:'writing',instruction:'Viết lại ba câu giới thiệu bằng thông tin của mình. Viết hoa I và dùng dấu chấm.',model:'My name is ___. I am ___. I study ___.',translation:'Tên tôi là ___. Tôi là ___. Tôi học ___.'}],
  },
  'foundation-time-01':{
    title:'Nói giờ và lịch học',summary:'Phân biệt giờ cụ thể với buổi trong ngày. At và in là giới từ: giúp nối thông tin như thời gian hoặc nơi chốn vào câu. Dùng các cụm ngắn để kể lịch của chính mình, không cần dịch từng chữ.',
    vocabulary:[
      word('class','lớp học; buổi học','danh từ','My class starts at nine.','Buổi học của tôi bắt đầu lúc chín giờ.'),
      word('start','bắt đầu','động từ','I start work at nine.','Tôi bắt đầu làm việc lúc chín giờ.'),
      word('at nine','lúc chín giờ','cụm giới từ','I go home at nine.','Tôi về nhà lúc chín giờ.'),
      word('in the morning','vào buổi sáng','cụm giới từ','I have a class in the morning.','Tôi có một buổi học vào buổi sáng.'),
      word('have lunch','ăn trưa','cụm động từ','I have lunch at one.','Tôi ăn trưa lúc một giờ.'),
      word('go home','về nhà','cụm động từ','I go home at six.','Tôi về nhà lúc sáu giờ.'),
    ],
    grammar:[
      {title:'At + giờ; in + buổi',pattern:'at + giờ cụ thể / in the morning',explanation:'Dùng at trước mốc giờ. Dùng in the morning để nói vào buổi sáng. Đây là hai cụm khác nhau, không thay at và in tùy ý.',examples:[pair('I start work at nine.','Tôi bắt đầu làm việc lúc chín giờ.'),pair('I study in the morning.','Tôi học vào buổi sáng.')]},
      {title:'I start nhưng my class starts',pattern:'I + start / my class + starts',explanation:'Với I, dùng start. My class là một chủ ngữ số ít; động từ hiện tại đơn tương ứng là starts. Chưa cần học mọi quy tắc thêm s trong bài này.',examples:[pair('I start at nine.','Tôi bắt đầu lúc chín giờ.'),pair('My class starts at nine.','Buổi học của tôi bắt đầu lúc chín giờ.')]},
    ],
    common_errors:[error('I have lunch in twelve.','I have lunch at twelve.','Twelve là giờ cụ thể, cần at.'),error('My class start at nine.','My class starts at nine.','Trong câu hiện tại đơn này, my class là số ít nên dùng starts.')],
    listening_tips:['Lần đầu nghe để biết đoạn nói về lịch trong ngày.','Lần sau phân biệt giờ bắt đầu học, ăn trưa và về nhà; đừng chọn một con số chỉ vì vừa nghe thấy nó.'],
    pronunciation_tips:['Nói từng nhóm: My class / starts / at nine. Sau đó nối lại cả câu.','Nghe âm cuối của starts trong câu mẫu. Không thêm một âm tiết tiếng Việt vào cuối từ.'],
    practice:[{type:'speaking',instruction:'Nói ba mốc giờ thật: bắt đầu học/làm, ăn trưa, về nhà.',model:'My class starts at ___. I have lunch at ___. I go home at ___.',translation:'Buổi học của tôi bắt đầu lúc ___. Tôi ăn trưa lúc ___. Tôi về nhà lúc ___.'},{type:'writing',instruction:'Viết ba câu về lịch một ngày. Dùng at trước giờ; có thể dùng in the morning khi chỉ nói buổi.',model:'I study in the morning. I have lunch at ___. I go home at ___.',translation:'Tôi học vào buổi sáng. Tôi ăn trưa lúc ___. Tôi về nhà lúc ___.'}],
  },
  'foundation-help-01':{
    title:'Nhờ giúp đỡ lịch sự',summary:'Nhận ra lời nhờ giúp, nói một khó khăn và cảm ơn. Can/cannot là động từ khuyết thiếu: theo sau bằng động từ nguyên mẫu.',
    vocabulary:[
      word('help','giúp đỡ; sự giúp đỡ','động từ hoặc danh từ tùy câu','Can you help me?','Bạn giúp tôi được không?'),
      word('can','có thể','động từ khuyết thiếu','I can help you.','Tôi có thể giúp bạn.'),
      word('cannot','không thể; không làm được','dạng phủ định của can','I cannot open the door.','Tôi không mở được cửa.'),
      word('open','mở','động từ trong câu này','Please open the file.','Hãy mở tệp.'),
      word('file','tệp','danh từ','This file is small.','Tệp này nhỏ.'),
      word('try again','thử lại','cụm động từ','Please try again.','Bạn thử lại nhé.'),
      word('Thank you for your help.','Cảm ơn bạn đã giúp.','câu cảm ơn','Thank you for your help.','Cảm ơn bạn đã giúp.'),
    ],
    grammar:[
      {title:'Nhờ giúp: Can you…?',pattern:'Can + you + động từ nguyên mẫu + …?',explanation:'Đưa can lên đầu câu để hỏi. Thêm please giúp câu nhờ lịch sự hơn. Không thêm to sau can trong cấu trúc này.',examples:[pair('Can you help me, please?','Bạn giúp tôi được không?'),pair('Can you open the door?','Bạn mở cửa được không?')]},
      {title:'Nói điều chưa làm được',pattern:'I + cannot + động từ nguyên mẫu',explanation:'Cannot viết liền, dạng rút gọn là can’t. Không thêm s, to hoặc don’t trước động từ sau cannot trong các câu mẫu này.',examples:[pair('I cannot open the door.','Tôi không mở được cửa.'),pair('I can try again.','Tôi có thể thử lại.')]},
    ],
    common_errors:[error('Can you to help me?','Can you help me?','Sau can dùng help, không dùng to help.'),error('I cannot opens the file.','I cannot open the file.','Sau cannot dùng động từ nguyên mẫu open, không thêm s.'),error('I don’t can open it.','I cannot open it.','Can có dạng phủ định riêng; không dùng don’t can.')],
    listening_tips:['Nghe xem người nói cần được giúp việc gì.','Chú ý can/cannot và động từ theo sau. Nghe lại trước khi mở bản dịch nếu muốn tự thử khả năng nghe.'],
    pronunciation_tips:['Tập nhóm Can you / help me / please rồi nói cả câu.','Không cần nói nhanh. Hãy để người nghe nhận ra lời nhờ giúp và điều bạn chưa làm được.'],
    practice:[{type:'speaking',instruction:'Đóng vai nhờ mở một tệp: nhờ giúp, nêu khó khăn rồi cảm ơn.',model:'Can you help me, please? I cannot open this file. Thank you for your help.',translation:'Bạn giúp tôi được không? Tôi không mở được tệp này. Cảm ơn bạn đã giúp.'},{type:'writing',instruction:'Viết tin nhắn ba câu nhờ giúp một việc thật. Không đưa thông tin riêng tư vào bài luyện.',model:'Can you help me, please? I cannot ___. Thank you.',translation:'Bạn giúp tôi được không? Tôi không thể ___. Cảm ơn bạn.'}],
  },
  'foundation-routine-01':{
    title:'Kể một ngày của mình',summary:'Học các cụm chỉ sinh hoạt và dùng hiện tại đơn với I. Sau đó đọc một đoạn riêng để tìm đúng thông tin, không mặc định mọi người có cùng lịch.',
    vocabulary:[
      word('get up','thức dậy, ra khỏi giường','cụm động từ','I get up at six.','Tôi thức dậy lúc sáu giờ.'),
      word('have breakfast','ăn sáng','cụm động từ','I have breakfast at home.','Tôi ăn sáng ở nhà.'),
      word('after class','sau giờ học','cụm giới từ','I go home after class.','Tôi về nhà sau giờ học.'),
      word('library','thư viện','danh từ','The library is quiet.','Thư viện yên tĩnh.'),
      word('every day','mỗi ngày','cụm chỉ thời gian','I study English every day.','Tôi học tiếng Anh mỗi ngày.'),
      word('go to university','đến trường đại học; học đại học tùy ngữ cảnh','cụm động từ','I go to university at nine.','Tôi đến trường đại học lúc chín giờ.'),
    ],
    grammar:[
      {title:'Hiện tại đơn với I',pattern:'I + động từ nguyên mẫu + …',explanation:'Dùng hiện tại đơn để kể việc thường làm. Với I, dùng study/get/go; không dùng studies/gets/goes trong những câu này. He/she dùng quy tắc khác, không đổi theo vì câu nói về việc hằng ngày.',examples:[pair('I study English every day.','Tôi học tiếng Anh mỗi ngày.'),pair('I get up at six.','Tôi thức dậy lúc sáu giờ.')]},
      {title:'Ghép thông tin về thời gian và nơi chốn',pattern:'I + hoạt động + nơi chốn / at + giờ / after class',explanation:'Bắt đầu bằng một câu ngắn rồi thêm một thông tin. Không cần nhét tất cả thông tin vào một câu dài. Dùng lịch thật của mình thay vì học thuộc lịch của nhân vật.',examples:[pair('I have breakfast at home.','Tôi ăn sáng ở nhà.'),pair('I go home after class.','Tôi về nhà sau giờ học.')]},
    ],
    common_errors:[error('I studies every day.','I study every day.','Với I, động từ trong câu hiện tại đơn này không thêm s.'),error('I am get up at six.','I get up at six.','Get up đã là động từ chính; không thêm am trong câu này.')],
    listening_tips:['Ghi nhớ thứ tự hoạt động trước, rồi nghe lại các mốc giờ.','Ở bước đọc, dùng thông tin trong chính đoạn đọc để trả lời; không lấy lịch của nhân vật trong audio thay vào.'],
    pronunciation_tips:['Nhắc lại từng cụm get up, have breakfast, after class trước khi đọc câu dài.','Đọc rõ âm cuối class và giữ nhịp vừa phải. Có thể tự thu rồi đối chiếu audio mẫu, không tự suy ra điểm phát âm.'],
    practice:[{type:'speaking',instruction:'Kể ba việc thường làm, có ít nhất một giờ cụ thể. Đi học hoặc đi làm đều được.',model:'I get up at ___. I have breakfast ___. After class, I ___.',translation:'Tôi thức dậy lúc ___. Tôi ăn sáng ___. Sau giờ học, tôi ___.'},{type:'writing',instruction:'Viết ba hoặc bốn câu theo thứ tự trong ngày. Có thể đổi after class thành after work nếu phù hợp.',model:'I get up at ___. I have breakfast at home. I study ___. I go home at ___.',translation:'Tôi thức dậy lúc ___. Tôi ăn sáng ở nhà. Tôi học ___. Tôi về nhà lúc ___.'}],
  },
};

const digest=body=>createHash('sha256').update(JSON.stringify(body)).digest('hex');
const originals=new Map(starterLessons.filter(l=>packs[l.id]).map(l=>[l.id,digest(l)]));

export function supportForLesson(lesson){
  if(lesson.version!==1||!packs[lesson.lesson_id]||digest(lesson.body)!==originals.get(lesson.lesson_id))return null;
  return {lesson_id:lesson.lesson_id,content_version:1,support_version:1,source:'authored_reference',...structuredClone(packs[lesson.lesson_id])};
}
