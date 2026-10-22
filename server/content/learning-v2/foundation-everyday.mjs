export function buildFoundationEveryday({makeLesson}){
  const quantities=makeLesson({
    id:'foundation-quantities-01',title:'Nói số lượng và đồ vật cần dùng',position:13,prerequisites:['foundation-people-things-01','foundation-places-01'],
    objectives:['Phân biệt một đồ vật, nhiều đồ vật và một lượng nước.','Dùng a/an và there is/are trong tình huống quen thuộc.'],
    translation:'Có một quyển sổ trên bàn. Có ba cây bút cạnh quyển sổ. Tôi có một chiếc ô trong túi. Tôi cần một chai nước. Có một ít nước trong chai. Bạn có bao nhiêu cây bút?',
    listening:{prompt:'How many pens are next to the notebook?',options:[{id:'one',text:'One'},{id:'two',text:'Two'},{id:'three',text:'Three'}],answer:'three',explanation:'There are three pens next to it: có ba cây bút cạnh quyển sổ.'},
    phrases:[{text:'a notebook',translation:'một quyển sổ'},{text:'three pens',translation:'ba cây bút'},{text:'an umbrella',translation:'một chiếc ô'},{text:'a bottle of water',translation:'một chai nước'}],
    grammarTitle:'A/an, số nhiều và there is/are',
    grammar:{instruction:'Danh từ đếm được số ít thường cần từ đi kèm: a notebook, an umbrella. A/an chọn theo âm đầu, không chỉ chữ cái: an email nhưng a user. Nhiều đồ vật: three pens, there are three pens. Một đồ vật: there is a notebook. Water thường không đếm trực tiếp trong nghĩa này: some water hoặc a bottle of water, không nói three waters để đếm lượng nước trong mẫu đang học.',prompt:'Điền từ: There ___ three pens on the desk.',options:[{id:'is',text:'is'},{id:'are',text:'are'},{id:'am',text:'am'}],answer:'are',explanation:'Three pens là số nhiều nên dùng There are.'},
    target:'There are three pens on the desk.',guidance:'Nghe âm cuối số nhiều của pens /penz/. Luyện a notebook và an umbrella theo cụm. Tập nói rõ three; chưa cần tăng tốc hoặc học hết bảng IPA.',
    speaking:'Mô tả ba đồ vật quanh bạn: một đồ vật, nhiều đồ vật và một thứ bạn cần. Có thể dùng a bottle of water.',
    writing:'Viết bốn câu về bàn học hoặc túi của bạn. Dùng ít nhất một câu There is, một câu There are và một cụm a/an đúng.',
    model:'There is a ___ on my desk. There are ___ next to it. I have an ___. I need a bottle of ___.',
    rubric:['There is/are phù hợp số lượng.','Danh từ đếm được số ít có a/an hoặc từ xác định phù hợp.','Số lượng và đồ vật rõ ràng; không chỉ chép từ rời rạc.']
  });
  const frequency=makeLesson({
    id:'foundation-frequency-01',title:'Hỏi tần suất và kể thói quen',position:14,prerequisites:['foundation-routine-01','foundation-questions-01'],
    objectives:['Nghe và đọc thông tin về mức độ thường xuyên.','Hỏi How often…? và dùng hiện tại đơn với I/She.'],
    translation:'Tôi thường học sau buổi học trên lớp. Tôi đến thư viện hai lần một tuần. Anna học ở đó hằng ngày. Cô ấy không học vào Chủ nhật. Đôi khi chúng tôi làm việc cùng nhau. Bạn học cùng bạn bè thường xuyên thế nào?',
    listening:{prompt:'How often does the speaker visit the library?',options:[{id:'daily',text:'Every day'},{id:'twice',text:'Twice a week'},{id:'monthly',text:'Once a month'}],answer:'twice',explanation:'I visit the library twice a week. Every day là tần suất của Anna, không phải người nói.'},
    phrases:[{text:'usually study',translation:'thường học'},{text:'twice a week',translation:'hai lần một tuần'},{text:'every day',translation:'hằng ngày'},{text:'sometimes work together',translation:'đôi khi làm việc cùng nhau'}],
    grammarTitle:'How often và hiện tại đơn với She',
    grammar:{instruction:'Hỏi tần suất: How often do you study? Trả lời: twice a week, every day. Với I: I study. Với She: She studies; study đổi y thành ies. Phủ định: She does not study, sau does not dùng nguyên mẫu study. Usually/sometimes thường đặt trước động từ thường: I usually study. Các câu này nói thói quen, không phải việc đang diễn ra ngay lúc nói.',prompt:'Điền từ: Anna ___ in the library every day.',options:[{id:'study',text:'study'},{id:'studying',text:'studying'},{id:'studies',text:'studies'}],answer:'studies',explanation:'Anna tương ứng she. Ở hiện tại đơn khẳng định, study đổi thành studies.'},
    target:'How often do you study with a friend?',guidance:'Nghe cụm How often trước, sau đó đọc cả câu hỏi. Đọc rõ often, không cần ép một giọng duy nhất. Đừng bỏ âm cuối trong studies khi luyện câu trả lời.',
    speaking:'Hỏi và trả lời ba câu về tần suất học, đi thư viện và làm việc cùng bạn. Dùng tần suất đúng với mình.',
    writing:'Viết hai câu về thói quen của bạn, một câu về thói quen của một người khác và một câu hỏi How often…?',
    model:'I usually ___. I ___ twice a week. My friend studies ___. How often do you ___?',
    rubric:['Phân biệt I study và She studies.','Sau do/does not dùng nguyên mẫu.','Nêu được tần suất thay vì chỉ giờ trong ngày.']
  });
  const clarification=makeLesson({
    id:'foundation-clarification-01',title:'Nhờ nói lại và làm rõ điều chưa hiểu',position:15,prerequisites:['foundation-help-01'],
    objectives:['Nhận ra lời nhờ nói chậm, nhắc lại và viết vào chat.','Chủ động hỏi khi chưa hiểu trong lớp hoặc cuộc họp đơn giản.'],
    translation:'Bạn có thể nói chậm hơn được không? Tôi không hiểu từ này. Bạn có thể nói lại được không? Vui lòng viết từ đó vào khung chat. Cảm ơn bạn đã giúp đỡ. Tôi hỏi thêm một câu nữa được không?',
    listening:{prompt:'Where does the speaker ask the listener to write the word?',options:[{id:'chat',text:'In the chat'},{id:'notebook',text:'In a notebook'},{id:'email',text:'In an email'}],answer:'chat',explanation:'Please write it in the chat: người nói nhờ viết vào khung chat.'},
    phrases:[{text:'Could you speak more slowly, please?',translation:'Bạn có thể nói chậm hơn được không?'},{text:'Could you say it again?',translation:'Bạn có thể nói lại được không?'},{text:'I do not understand this word.',translation:'Tôi không hiểu từ này.'},{text:'Can I ask one more question?',translation:'Tôi hỏi thêm một câu nữa được không?'}],
    grammarTitle:'Could you + động từ nguyên mẫu',
    grammar:{instruction:'Could you say it again? là lời nhờ lịch sự ở tình huống hiện tại; could ở đây không nhất thiết nói quá khứ. Sau could/can dùng động từ nguyên mẫu: speak, say, write. Không dùng could you to speak hoặc could you speaks. Can I ask…? dùng để xin phép; Could you…? nhờ người khác làm điều gì. Please thường giúp câu nhờ mềm hơn.',prompt:'Chọn lời nhờ đúng để người khác nói chậm hơn.',options:[{id:'to',text:'Could you to speak more slowly?'},{id:'speak',text:'Could you speak more slowly, please?'},{id:'speaks',text:'Could you speaks more slowly?'}],answer:'speak',explanation:'Sau could you dùng nguyên mẫu speak, không có to hoặc s.'},
    target:'Could you say it again, please?',guidance:'Chia thành Could you / say it again / please. Giữ giọng lịch sự và nói rõ again; chưa cần bắt chước dạng nối âm nhanh của could you.',
    speaking:'Đóng vai chưa hiểu một từ trong buổi học: nhờ nói chậm, nhắc lại, viết từ vào chat rồi cảm ơn.',
    writing:'Viết tin nhắn ba đến bốn câu cho người hướng dẫn: nói điều chưa hiểu, nhờ viết hoặc nhắc lại và cảm ơn.',
    model:'I do not understand ___. Could you ___, please? Can I ask ___? Thank you for ___.',
    rubric:['Nêu cụ thể điều chưa hiểu.','Sau could/can dùng động từ nguyên mẫu.','Có lời nhờ rõ ràng và lời cảm ơn phù hợp.']
  });
  const readings=[
    [quantities,'There is a laptop on Minh’s desk. There are two notebooks next to it. There is some water in a bottle. Minh needs an umbrella because it is raining.','How many notebooks are on Minh’s desk?',[{id:'one',text:'One'},{id:'two',text:'Two'},{id:'three',text:'Three'}],'two','There are two notebooks: có hai quyển sổ. Đừng chọn three theo số bút trong bài nghe.'],
    [frequency,'Lan usually studies after dinner. She visits the library once a week. Her brother visits it every day. Lan does not study there on Sunday.','How often does Lan visit the library?',[{id:'once',text:'Once a week'},{id:'daily',text:'Every day'},{id:'twice',text:'Twice a week'}],'once','Lan đến thư viện once a week. Every day là thông tin về anh/em trai của Lan.'],
    [clarification,'Mai is in an online class. She does not understand a new word. She asks the teacher to say it again and write it in the chat. Then she asks one more question.','What does Mai ask the teacher to do with the word?',[{id:'delete',text:'Delete it'},{id:'send',text:'Send it tomorrow'},{id:'repeat',text:'Say it again and write it in the chat'}],'repeat','Mai nhờ giáo viên nhắc lại và viết vào chat; đoạn đọc không nói xóa từ hoặc gửi ngày mai.']
  ];
  for(const [lesson,text,question,options,answer,explanation] of readings)lesson.steps.splice(3,0,{id:'read-detail',type:'reading_comprehension',title:'Đọc tình huống và lấy thông tin',response_schema:'choice',prompt:`Đọc: ${text}\n\n${question}`,options,answer,explanation});
  return [quantities,frequency,clarification];
}
