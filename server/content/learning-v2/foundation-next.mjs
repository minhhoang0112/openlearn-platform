// Authored continuation; old lesson versions and their media remain unchanged.
export function buildFoundationNext({makeLesson}){
  const yesterday=makeLesson({
    id:'foundation-yesterday-01',title:'Kể việc đã làm hôm qua',position:8,prerequisites:['foundation-questions-01'],
    objectives:['Nghe và đọc thông tin về một ngày đã qua.','Kể việc đã làm với một số động từ quá khứ có quy tắc.'],
    translation:'Hôm qua tôi học ở nhà. Tôi hoàn thành bài tập vào buổi sáng. Tôi gọi cho bạn sau bữa trưa. Chúng tôi nói chuyện về lớp học. Tôi không làm việc vào buổi tối. Hôm qua bạn làm gì?',
    listening:{prompt:'When did the speaker call a friend?',options:[{id:'morning',text:'Before breakfast'},{id:'lunch',text:'After lunch'},{id:'evening',text:'In the evening'}],answer:'lunch',explanation:'I called my friend after lunch: người nói gọi cho bạn sau bữa trưa.'},
    phrases:[{text:'yesterday',translation:'hôm qua'},{text:'finished my homework',translation:'đã hoàn thành bài tập của tôi'},{text:'called my friend',translation:'đã gọi cho bạn tôi'},{text:'talked about our class',translation:'đã nói chuyện về lớp học của chúng tôi'}],
    grammarTitle:'Quá khứ đơn: việc đã kết thúc',
    grammar:{instruction:'Với việc đã kết thúc hôm qua, nhiều động từ thêm -ed: finish → finished, call → called. Study đổi y thành i: studied. Sau did not dùng nguyên mẫu: did not work, không dùng did not worked. Không phải động từ nào cũng thêm -ed; bài kế tiếp có went/had.',prompt:'Điền từ: Yesterday, I ___ my homework.',options:[{id:'finish',text:'finish'},{id:'finished',text:'finished'},{id:'finishing',text:'finishing'}],answer:'finished',explanation:'Yesterday chỉ thời gian đã qua; finish là động từ có quy tắc, dùng finished.'},
    target:'I finished my homework yesterday.',guidance:'Nhắc lại finished /fɪnɪʃt/: -ed ở đây là /t/, không đọc thành một âm tiết “ịt”. Hãy nói chậm, nghe lại âm cuối; called có âm cuối /d/.',
    speaking:'Kể ba việc bạn đã làm hôm qua. Nếu cần, dùng studied, finished và called; thay thông tin cho đúng với mình.',
    writing:'Viết bốn câu kể hôm qua: ba việc đã làm và một việc không làm. Với did not, dùng động từ nguyên mẫu.',
    model:'Yesterday, I studied ___. I finished ___. I called ___. I did not work ___.',
    rubric:['Mốc thời gian đã qua rõ ràng.','Dùng studied/finished/called phù hợp, không thêm -ed sau did not.','Thông tin thuộc trải nghiệm của bản thân.']
  });
  const trip=makeLesson({
    id:'foundation-past-questions-01',title:'Hỏi về một chuyến đi đã qua',position:9,prerequisites:[yesterday.id],
    objectives:['Hiểu went và had trong một chuyến đi đơn giản.','Hỏi và trả lời với Did you…? mà không chia quá khứ hai lần.'],
    translation:'Cuối tuần trước tôi đến thăm gia đình. Tôi đi bằng xe buýt vào thứ Bảy. Chúng tôi ăn trưa cùng nhau. Tôi không đi vào Chủ nhật. Cuối tuần trước bạn có thăm gia đình không? Bạn đi bằng cách nào?',
    listening:{prompt:'How did the speaker travel on Saturday?',options:[{id:'train',text:'By train'},{id:'bus',text:'By bus'},{id:'walk',text:'On foot'}],answer:'bus',explanation:'I went by bus on Saturday: người nói đi xe buýt vào thứ Bảy.'},
    phrases:[{text:'last weekend',translation:'cuối tuần trước'},{text:'went by bus',translation:'đã đi bằng xe buýt'},{text:'had lunch together',translation:'đã ăn trưa cùng nhau'},{text:'How did you travel?',translation:'Bạn đã đi bằng cách nào?'}],
    grammarTitle:'Did + chủ ngữ + động từ nguyên mẫu',
    grammar:{instruction:'Go → went và have → had là quá khứ bất quy tắc. Câu khẳng định: I went by bus. Câu hỏi: Did you go by bus? Sau did/did not dùng go, không dùng went. Trả lời ngắn: Yes, I did. / No, I did not.',prompt:'Chọn câu hỏi đúng về cuối tuần trước.',options:[{id:'went',text:'Did you went by bus?'},{id:'go',text:'Did you go by bus?'},{id:'goes',text:'Did you goes by bus?'}],answer:'go',explanation:'Did đã thể hiện quá khứ, nên động từ chính dùng nguyên mẫu go.'},
    target:'Did you go by bus last weekend?',guidance:'Luyện go /ɡoʊ/ và went /went/ riêng trước, sau đó đọc câu hỏi. Nói rõ bus và mốc thời gian; không cần nối âm nhanh.',
    speaking:'Đóng hai vai: hỏi về cuối tuần trước, trả lời mình đã đi đâu và đi bằng gì. Có thể nói không đi đâu nếu đúng với bạn.',
    writing:'Viết hai câu kể về cuối tuần trước và hai câu hỏi dùng Did you…? cho một người bạn.',
    model:'Last weekend, I went to ___. I went by ___. Did you visit ___? Did you go by ___?',
    rubric:['Went/had chỉ dùng trong câu khẳng định phù hợp.','Sau Did you và did not là động từ nguyên mẫu.','Câu trả lời phù hợp với câu hỏi.']
  });
  const plans=makeLesson({
    id:'foundation-plans-01',title:'Nói kế hoạch sắp tới',position:10,prerequisites:['foundation-time-01','foundation-questions-01'],
    objectives:['Phân biệt việc đã làm và kế hoạch ngày mai.','Dùng be going to + động từ để trình bày kế hoạch đơn giản.'],
    translation:'Ngày mai tôi sẽ học ở thư viện theo kế hoạch. Tôi sẽ gặp Anna sau buổi học. Chúng tôi sẽ hoàn thành dự án. Tôi sẽ không ở lại muộn. Chúng tôi sẽ ăn tối ở nhà. Bạn định làm gì vào ngày mai?',
    listening:{prompt:'Who is the speaker going to meet after class?',options:[{id:'family',text:'The speaker’s family'},{id:'teacher',text:'A teacher'},{id:'anna',text:'Anna'}],answer:'anna',explanation:'I am going to meet Anna after class: người nói định gặp Anna sau buổi học.'},
    phrases:[{text:'tomorrow',translation:'ngày mai'},{text:'be going to meet',translation:'định gặp'},{text:'finish our project',translation:'hoàn thành dự án của chúng tôi'},{text:'stay late',translation:'ở lại muộn'}],
    grammarTitle:'Am/is/are going to + động từ',
    grammar:{instruction:'Kế hoạch: I am going to study. We are going to finish. He/She is going to work. Sau going to là động từ nguyên mẫu. Phủ định: I am not going to stay late. Câu hỏi: What are you going to do tomorrow? Trong mẫu này going to nói kế hoạch, không nhất thiết là di chuyển tới một nơi.',prompt:'Điền từ: We ___ going to finish our project tomorrow.',options:[{id:'is',text:'is'},{id:'am',text:'am'},{id:'are',text:'are'}],answer:'are',explanation:'Chủ ngữ We đi với are: We are going to finish.'},
    target:'I am going to study in the library tomorrow.',guidance:'Tách thành I am going to / study in the library / tomorrow rồi nối câu chậm. Ở giai đoạn này đọc đầy đủ going to để dễ hiểu, chưa cần dùng dạng nói gọn.',
    speaking:'Nói ba kế hoạch cho ngày mai và hỏi một người bạn định làm gì. Chọn kế hoạch thực tế, không cần quá nhiều từ mới.',
    writing:'Viết tin nhắn bốn câu về kế hoạch ngày mai: hai việc định làm, một việc không định làm và một câu hỏi cho bạn.',
    model:'Tomorrow, I am going to ___. We are going to ___. I am not going to ___. What are you going to do?',
    rubric:['Chọn am/is/are phù hợp chủ ngữ.','Sau going to dùng động từ nguyên mẫu.','Mốc tomorrow và các kế hoạch nhất quán.']
  });
  const readingTasks=[
    [yesterday,'Yesterday, Mai studied at home. She finished her homework before lunch. In the afternoon, she called her brother. She did not work in the evening.','Who did Mai call?',[{id:'friend',text:'Her friend'},{id:'brother',text:'Her brother'},{id:'teacher',text:'Her teacher'}],'brother','She called her brother: Mai gọi cho anh/em trai, không phải người bạn trong bài nghe.'],
    [trip,'Last weekend, Nam went to see his family. He went by train on Saturday. He had lunch with his parents. He came home on Sunday.','How did Nam travel on Saturday?',[{id:'train',text:'By train'},{id:'bus',text:'By bus'},{id:'car',text:'By car'}],'train','Đoạn đọc nói He went by train on Saturday. Đừng chọn bus theo bài nghe khác.'],
    [plans,'Tomorrow, Lan is going to study at home in the morning. She is going to meet Minh after lunch. They are going to work on their project in the library. They are not going to stay late.','Where are Lan and Minh going to work on their project?',[{id:'home',text:'At Lan’s home'},{id:'library',text:'In the library'},{id:'cafe',text:'In a cafe'}],'library','They are going to work on their project in the library: họ dự định làm dự án ở thư viện.']
  ];
  for(const [lesson,text,question,options,answer,explanation] of readingTasks)lesson.steps.splice(3,0,{id:'read-detail',type:'reading_comprehension',title:'Đọc tình huống mới',response_schema:'choice',prompt:`Đọc: ${text}\n\n${question}`,options,answer,explanation});
  return [yesterday,trip,plans];
}
