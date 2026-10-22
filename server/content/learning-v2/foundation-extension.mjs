export function buildFoundationExtension({makeLesson,scripts,provenance}){
  const people=makeLesson({
    id:'foundation-people-things-01',title:'Người, đồ vật và tính từ',position:4,prerequisites:['foundation-introductions-01'],
    objectives:['Nhận ra danh từ chỉ người/vật và tính từ trong câu đơn.','Giới thiệu một người và mô tả một đồ vật.'],
    translation:'Đây là Anna, bạn của tôi. Cô ấy là sinh viên. Túi của cô ấy màu xanh dương. Đây là máy tính xách tay của cô ấy. Nó nhỏ nhưng hữu ích. Có gì trong túi của bạn?',
    listening:{prompt:'What colour is Anna’s bag?',options:[{id:'red',text:'Red'},{id:'blue',text:'Blue'},{id:'black',text:'Black'}],answer:'blue',explanation:'Her bag is blue: túi của Anna màu xanh dương.'},
    phrases:[{text:'my friend',translation:'bạn của tôi'},{text:'her laptop',translation:'máy tính xách tay của cô ấy'},{text:'a small bag',translation:'một chiếc túi nhỏ'},{text:'useful',translation:'hữu ích'}],
    grammarTitle:'Danh từ, tính từ và be',
    grammar:{instruction:'Student và bag là danh từ chỉ người/vật. Blue, small và useful là tính từ mô tả. Tính từ có thể đứng trước danh từ: a small bag; hoặc sau be: The bag is small. It thay cho đồ vật số ít. Bài này luyện is sau it.',prompt:'Điền từ: It ___ small.',options:[{id:'are',text:'are'},{id:'am',text:'am'},{id:'is',text:'is'}],answer:'is',explanation:'It là chủ ngữ số ít đi với is. Small là tính từ, không phải động từ trong câu này.'},
    target:'Her bag is blue.',guidance:'Nghe và nhắc lại cụm bag is blue. Tập đọc rõ blue; không cần nói nhanh.',
    speaking:'Giới thiệu một người quen bằng một câu, rồi mô tả một đồ vật bằng hai câu.',writing:'Viết ba câu về một người và một đồ vật. Dùng danh từ và ít nhất một tính từ.',
    model:'This is my friend ___. This is my ___. It is ___.',rubric:['Có danh từ chỉ người hoặc đồ vật.','Tính từ mô tả đúng điều muốn nói.','Dùng she is hoặc it is đúng chủ ngữ.']
  });
  const places=makeLesson({
    id:'foundation-places-01',title:'Hỏi vị trí và mô tả nơi chốn',position:5,prerequisites:['foundation-people-things-01'],
    objectives:['Nghe để tìm vị trí người/vật.','Dùng on, under, next to và Where is…? trong câu đơn.'],
    translation:'Thư viện ở đâu? Nó ở cạnh phòng học. Túi của tôi ở dưới bàn. Điện thoại của tôi ở trên bàn. Bạn chỉ cho tôi thư viện được không?',
    listening:{prompt:'Where is the phone?',options:[{id:'under',text:'Under the desk'},{id:'on',text:'On the desk'},{id:'bag',text:'In the bag'}],answer:'on',explanation:'My phone is on the desk: điện thoại ở trên bàn. Túi mới là vật ở dưới bàn.'},
    phrases:[{text:'Where is the library?',translation:'Thư viện ở đâu?'},{text:'next to the classroom',translation:'cạnh phòng học'},{text:'under the desk',translation:'dưới bàn'},{text:'on the desk',translation:'trên bàn'}],
    grammarTitle:'Giới từ vị trí',
    grammar:{instruction:'On nói trên bề mặt, under nói bên dưới, next to nói bên cạnh. Câu hỏi đồ vật/nơi chốn số ít: Where is…? Câu trả lời: It is… hoặc The library is…',prompt:'Chọn nghĩa “dưới bàn”: ___ the desk.',options:[{id:'under',text:'under'},{id:'on',text:'on'},{id:'next',text:'next to'}],answer:'under',explanation:'Under the desk là dưới bàn. On the desk là trên mặt bàn.'},
    target:'My phone is on the desk.',guidance:'Nghe nhóm on the desk, rồi nói cả câu. Đọc chậm để không bỏ từ is.',
    speaking:'Hỏi vị trí một đồ vật và tự trả lời. Nói thêm một câu dùng next to.',writing:'Viết ba câu mô tả vị trí đồ vật hoặc phòng trong nơi học của bạn.',
    model:'Where is my ___? It is ___. The ___ is next to the ___.',rubric:['Câu hỏi dùng Where is cho một đồ vật/nơi chốn.','Chọn giới từ đúng với vị trí thực.','Câu trả lời có chủ ngữ và is.']
  });
  const questions=makeLesson({
    id:'foundation-questions-01',title:'Hỏi và phủ định trong sinh hoạt',position:6,prerequisites:['foundation-routine-01'],
    objectives:['Hiểu Do you…? và câu trả lời ngắn.','Dùng I do not + động từ để nói việc không thường làm.'],
    translation:'Bạn có học buổi tối không? Có. Tôi học sau bữa tối. Tôi không làm việc vào Chủ nhật. Bạn có làm việc vào Chủ nhật không? Không. Tôi thăm gia đình.',
    listening:{prompt:'Does the first speaker work on Sunday?',options:[{id:'yes',text:'Yes.'},{id:'no',text:'No.'}],answer:'no',explanation:'Người nói cho biết: I do not work on Sunday.'},
    phrases:[{text:'Do you study at night?',translation:'Bạn có học buổi tối không?'},{text:'after dinner',translation:'sau bữa tối'},{text:'I do not work on Sunday.',translation:'Tôi không làm việc vào Chủ nhật.'},{text:'visit my family',translation:'thăm gia đình tôi'}],
    grammarTitle:'Do you…? / I do not…',
    grammar:{instruction:'Với hành động thường làm: Do you study…? Trả lời Yes, I do hoặc No, I do not. Phủ định: I do not study; sau do not dùng động từ nguyên mẫu. Do not có thể viết don’t. Không trộn be thành I am not study.',prompt:'Điền từ: I do not ___ on Sunday.',options:[{id:'working',text:'working'},{id:'works',text:'works'},{id:'work',text:'work'}],answer:'work',explanation:'Sau do not dùng work, không dùng works hoặc working trong mẫu câu này.'},
    target:'Do you study at night?',guidance:'Nghe câu hỏi, dừng rồi nhắc lại. Nói rõ study và night, chưa cần bắt chước nối âm nhanh.',
    speaking:'Tự hỏi và trả lời hai câu Do you…? về sinh hoạt của mình. Thêm một câu phủ định đúng với bạn.',writing:'Viết ba câu về việc thường làm/không làm và một câu hỏi để hỏi bạn học.',
    model:'Do you ___? Yes, I do. / No, I do not. I do not ___ on ___.',rubric:['Câu hỏi hành động dùng Do you.','Sau do not dùng động từ nguyên mẫu.','Thông tin và câu trả lời nhất quán.']
  });
  const reading='Ben is a student. He studies in the library after class. His bag is black. He does not work on Sunday.';
  const choices=[
    {id:'listen-time',type:'listen_comprehension',title:'Nghe mốc giờ',prompt:'What time does Alex’s class start?',options:[{id:'eight',text:'At eight'},{id:'nine',text:'At nine'},{id:'seven',text:'At seven'}],answer:'nine',explanation:'Alex nói: My class starts at nine.'},
    {id:'listen-place',type:'listen_comprehension',title:'Nghe vị trí',prompt:'Where is Alex’s bag?',options:[{id:'under',text:'Under the desk'},{id:'on',text:'On the desk'},{id:'library',text:'Next to the library'}],answer:'under',explanation:'My blue bag is under the desk: túi ở dưới bàn.'},
    {id:'grammar-be',type:'grammar_practice',title:'Ôn be',prompt:'Điền từ: I ___ a student.',options:[{id:'is',text:'is'},{id:'are',text:'are'},{id:'am',text:'am'}],answer:'am',explanation:'Chủ ngữ I đi với am trong câu giới thiệu vai trò.'},
    {id:'grammar-negative',type:'grammar_practice',title:'Ôn phủ định',prompt:'Điền từ: I do not ___ on Sunday.',options:[{id:'study',text:'study'},{id:'studies',text:'studies'},{id:'studying',text:'studying'}],answer:'study',explanation:'Sau do not dùng động từ nguyên mẫu study.'},
    {id:'read-place',type:'reading_comprehension',title:'Đọc thông tin cụ thể',prompt:`Đọc: ${reading}\n\nWhere does Ben study after class?`,options:[{id:'home',text:'At home'},{id:'library',text:'In the library'},{id:'office',text:'In an office'}],answer:'library',explanation:'He studies in the library after class: Ben học ở thư viện.'},
    {id:'read-day',type:'reading_comprehension',title:'Đọc câu phủ định',prompt:`Đọc: ${reading}\n\nDoes Ben work on Sunday?`,options:[{id:'yes',text:'Yes.'},{id:'unknown',text:'The text does not say.'},{id:'no',text:'No.'}],answer:'no',explanation:'He does not work on Sunday: Ben không làm việc vào Chủ nhật.'}
  ].map(q=>({...q,response_schema:'choice'}));
  const checkpoint={
    id:'foundation-checkpoint-01',program_id:'english-foundation',version:1,position:7,lesson_kind:'checkpoint',title:'Ôn chặng đầu: giới thiệu và sinh hoạt',level_hint:'Foundation unit review, not a level test',estimated_minutes:25,
    objectives:['Tự nhớ lại mẫu câu đã học qua các tình huống mới.','Xác định nội dung cần ôn, không suy ra trình độ hoặc điểm chứng chỉ.'],
    recommended_prerequisites:[people.id,places.id,questions.id,'foundation-routine-01'],provenance,media_id:'foundation-checkpoint-01',
    transcript:scripts.find(s=>s.id==='foundation-checkpoint-01').transcript,translation:'Chào, tên tôi là Alex. Tôi là sinh viên. Lớp của tôi bắt đầu lúc chín giờ. Sau giờ học, tôi học ở thư viện. Túi màu xanh dương của tôi ở dưới bàn. Tôi không học vào Chủ nhật.',
    checkpoint:{graded_step_ids:choices.map(q=>q.id),minimum_correct:4,review_map:{'listen-time':['foundation-time-01'],'listen-place':[places.id],'grammar-be':['foundation-introductions-01'],'grammar-negative':[questions.id],'read-place':['foundation-routine-01'],'read-day':[questions.id]}},
    steps:[...choices,
      {id:'speaking',type:'speaking_task',title:'Tự giới thiệu không chép mẫu',response_schema:'text',prompt:'Nói bốn câu về bản thân, lịch học, một vị trí và một việc bạn không làm. Nhập bản chép lời để lưu.',assessment:'self_review',rubric:['Thông tin phù hợp với bản thân.','Mỗi câu có chủ ngữ và động từ phù hợp.','Tự nói trước khi xem lại bài cũ.']},
      {id:'writing',type:'writing_task',title:'Viết lời giới thiệu ngắn',response_schema:'text',prompt:'Viết bốn đến năm câu về bản thân và một ngày học. Viết thêm một câu hỏi cho người bạn mới.',assessment:'self_review',rubric:['Có giới thiệu, thông tin sinh hoạt và câu hỏi.','Dùng I am / I study / I do not đúng mẫu đã học.','Tự kiểm tra viết hoa và dấu câu.']},
      {id:'reflection',type:'reflection',title:'Chọn điều cần ôn tiếp',response_schema:'self_reflection',prompt:'Ghi một nội dung bạn còn nhầm và một điều đã tự làm được.',assessment:'self_review'}]
  };
  return [people,places,questions,checkpoint];
}
