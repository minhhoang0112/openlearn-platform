// Final authored batch for the first 24-lesson / 3-review content release.
export function buildReleaseOneCompletion({makeLesson,scripts,provenance}){
  const directions=makeLesson({
    id:'foundation-directions-01',title:'Hỏi đường và hướng dẫn đến nơi hẹn',position:16,prerequisites:['foundation-places-01','foundation-clarification-01'],
    objectives:['Nghe và đọc một hướng dẫn đường đi ngắn.','Dùng turn/go và at/on để chỉ đường rõ ràng.'],
    translation:'Đi thẳng đến thư viện. Rẽ trái ở thư viện. Quán cà phê ở bên phải của bạn. Nó ở cạnh hiệu sách. Bạn chỉ giúp tôi quán cà phê trên bản đồ được không? Chúng ta có thể gặp nhau ở đó lúc ba giờ.',
    listening:{prompt:'Where should the listener turn left?',options:[{id:'library',text:'At the library'},{id:'cafe',text:'At the cafe'},{id:'bookshop',text:'At the bookshop'}],answer:'library',explanation:'Turn left at the library: rẽ trái ở thư viện.'},
    phrases:[{text:'go straight',translation:'đi thẳng'},{text:'turn left',translation:'rẽ trái'},{text:'on your right',translation:'ở bên phải của bạn'},{text:'show me on the map',translation:'chỉ giúp tôi trên bản đồ'}],
    grammarTitle:'Động từ chỉ dẫn và giới từ vị trí',
    grammar:{instruction:'Chỉ đường: Go straight. Turn left at the library. Dùng at để chỉ mốc rẽ, on your right để nói bên phải, next to để nói ở cạnh. Câu yêu cầu: Could you show me on the map? Người nghe cần biết cả hướng và mốc, không chỉ nghe một từ left.',prompt:'Điền từ: Turn left ___ the library.',options:[{id:'on',text:'on'},{id:'at',text:'at'},{id:'under',text:'under'}],answer:'at',explanation:'Mẫu chỉ mốc rẽ là turn left at the library.'},
    target:'Turn left at the library. The cafe is on your right.',guidance:'Dừng ngắn giữa hai câu. Nói rõ left /left/ và right /raɪt/ để người nghe phân biệt hướng.',
    speaking:'Hướng dẫn đường đi tưởng tượng từ lớp học tới thư viện hoặc quán cà phê bằng ba câu. Thêm một câu nhờ chỉ trên bản đồ nếu chưa hiểu.',
    writing:'Viết bốn câu hướng dẫn bạn tới nơi hẹn, có hướng đi, mốc rẽ và vị trí đích đến.',
    model:'Go straight to ___. Turn ___ at ___. The ___ is on your ___. Could you show me ___?',
    rubric:['Hướng và mốc rẽ nhất quán.','Dùng động từ nguyên mẫu trong chỉ dẫn.','Người nghe biết vị trí đích đến.']
  });
  const meeting=makeLesson({
    id:'foundation-arrangements-01',title:'Mời và xác nhận lịch hẹn',position:17,prerequisites:['foundation-time-01','foundation-plans-01'],
    objectives:['Phân biệt giờ đề xuất và giờ đã thống nhất.','Mời bằng Would you like to…? và xác nhận thời gian, địa điểm.'],
    translation:'Bạn có muốn cùng học vào thứ Sáu không? Tôi rảnh sau hai giờ. Chúng ta gặp nhau ở thư viện lúc ba giờ nhé? Ba giờ thì phù hợp với tôi. Vậy hẹn gặp bạn ở đó. Vui lòng mang ghi chú dự án của bạn theo.',
    listening:{prompt:'What time do they agree to meet?',options:[{id:'two',text:'At two'},{id:'three',text:'At three'},{id:'four',text:'At four'}],answer:'three',explanation:'After two là khoảng rảnh; họ thống nhất at three, không phải hai giờ.'},
    phrases:[{text:'Would you like to study together?',translation:'Bạn có muốn cùng học không?'},{text:'I am free after two.',translation:'Tôi rảnh sau hai giờ.'},{text:'Three works for me.',translation:'Ba giờ phù hợp với tôi.'},{text:'See you there.',translation:'Hẹn gặp bạn ở đó.'}],
    grammarTitle:'Would like to + động từ trong lời mời',
    grammar:{instruction:'Lời mời: Would you like to study together? Sau would like to dùng nguyên mẫu study. Câu đáp: Yes, I would. / Sorry, I am not free then. Xác nhận cụ thể: Let us meet at three on Friday. At trước giờ, on trước thứ. Would like to khác could you + nguyên mẫu trong lời nhờ.',prompt:'Điền từ: Would you like ___ study together?',options:[{id:'to',text:'to'},{id:'for',text:'for'},{id:'at',text:'at'}],answer:'to',explanation:'Mẫu lời mời là would like to + động từ nguyên mẫu.'},
    target:'Would you like to study together on Friday?',guidance:'Chia câu thành lời mời và mốc on Friday. Nói rõ thời gian, không cần nói nhanh hoặc ép nối âm.',
    speaking:'Đóng hai vai đề xuất lịch hẹn và xác nhận giờ, nơi gặp. Nếu không rảnh, nói lịch sự và đưa một lựa chọn khác.',
    writing:'Viết tin nhắn mời bạn học cùng, nêu ngày/giờ/nơi và yêu cầu xác nhận. Viết thêm một câu trả lời xác nhận lịch.',
    model:'Would you like to ___ on ___? I am free after ___. Let us meet at ___ in ___. That works for me.',
    rubric:['Lời mời dùng would like to + nguyên mẫu.','Giờ đề xuất và giờ xác nhận được phân biệt rõ.','Có cả thời gian và địa điểm phù hợp.']
  });
  const hardware=makeLesson({
    id:'system-hardware-01',program_id:'english-it-system',title:'Mô tả máy tính và so sánh đơn giản',position:4,prerequisites:['foundation-people-things-01','system-files-01'],
    objectives:['Nhận ra thông tin về bàn phím, màn hình và tốc độ trong tình huống.','So sánh hai máy bằng slower/faster than, không tự suy ra nguyên nhân.'],
    translation:'Đây là máy tính xách tay thử nghiệm cũ của chúng tôi. Bàn phím của nó vẫn hoạt động tốt. Màn hình lớn hơn màn hình máy mới. Nhưng máy tính cũ chậm hơn trong bài thử này. Tôi đang ghi lại kết quả. Bạn kiểm tra máy mới được không?',
    listening:{prompt:'Which laptop is slower in this test?',options:[{id:'new',text:'The new laptop'},{id:'old',text:'The old laptop'},{id:'same',text:'They are equally fast'}],answer:'old',explanation:'The old laptop is slower in this test: kết quả này chỉ thuộc tình huống kiểm tra đã nêu.'},
    phrases:[{text:'the keyboard',translation:'bàn phím'},{text:'a larger screen',translation:'một màn hình lớn hơn'},{text:'slower in this test',translation:'chậm hơn trong bài thử này'},{text:'recording the results',translation:'đang ghi lại kết quả'}],
    grammarTitle:'So sánh với -er than',
    grammar:{instruction:'Slow → slower; fast → faster; large → larger. Ví dụ: This laptop is slower than that one. Không dùng more slower hoặc slower that. So sánh phải có đối tượng hoặc ngữ cảnh rõ ràng; chậm hơn trong một bài thử chưa đủ để kết luận hỏng phần cứng.',prompt:'Chọn câu so sánh đúng.',options:[{id:'than',text:'This laptop is slower than that one.'},{id:'more',text:'This laptop is more slower than that one.'},{id:'that',text:'This laptop is slower that one.'}],answer:'than',explanation:'Dùng slower than, không thêm more trước slower.'},
    target:'This laptop is slower than that one.',guidance:'Nghe và nhắc lại slower than theo cụm. Giữ rõ từ chỉ đối tượng this và that để người nghe biết bạn so sánh máy nào.',
    speaking:'So sánh hai máy tính trong tình huống giả định bằng hai câu, rồi nói một thông tin còn cần kiểm tra. Không tự coi kết quả thử là nguyên nhân lỗi.',
    writing:'Viết ba đến bốn câu mô tả bàn phím/màn hình, một kết quả so sánh và đề nghị kiểm tra tiếp.',
    model:'The keyboard is ___. This screen is larger than ___. This laptop is slower in ___. Could you check ___?',
    rubric:['So sánh đúng đối tượng và cấu trúc than.','Nêu phạm vi của quan sát.','Không tự thêm nguyên nhân chưa được kiểm chứng.']
  });
  const checks=makeLesson({
    id:'system-check-results-01',program_id:'english-it-system',title:'Đọc kết quả kiểm tra và báo điều chưa biết',position:5,prerequisites:['system-service-status-01','system-incident-handoff-01'],
    objectives:['Lấy thông tin từ kết quả kiểm tra và ghi nhận khác biệt giữa dịch vụ/máy khách.','Báo kết quả đã thấy và một bước kiểm tiếp.'],
    translation:'Tôi đã kiểm tra dịch vụ thử nghiệm lúc chín giờ. Dịch vụ đã trả về một phản hồi. Một máy khách vẫn đang chờ. Nhật ký hiển thị một thông báo lỗi mới. Tôi chưa xác nhận nguyên nhân. Vui lòng giữ bản ghi kiểm tra để xem xét.',
    listening:{prompt:'What does the log show?',options:[{id:'none',text:'No new messages'},{id:'cause',text:'A confirmed cause'},{id:'error',text:'A new error message'}],answer:'error',explanation:'The log shows a new error message. Người nói chưa xác nhận nguyên nhân.'},
    phrases:[{text:'returned a response',translation:'đã trả về một phản hồi'},{text:'is still waiting',translation:'vẫn đang chờ'},{text:'a new error message',translation:'một thông báo lỗi mới'},{text:'I have not confirmed the cause.',translation:'Tôi chưa xác nhận nguyên nhân.'}],
    grammarTitle:'Kết quả đã kiểm tra và điều chưa xác nhận',
    grammar:{instruction:'I checked / The service returned báo việc đã xảy ra. The log shows báo nội dung đang thấy. I have not confirmed the cause nghĩa là chưa xác nhận nguyên nhân tính tới hiện tại; học như một cụm dùng trong báo cáo, chưa cần suy luận toàn bộ quy tắc thì mới. Không đổi một error message thành nguyên nhân chắc chắn.',prompt:'Chọn câu báo đúng thông tin: nhật ký có lỗi mới, chưa biết nguyên nhân.',options:[{id:'known',text:'The cause is confirmed.'},{id:'observed',text:'The log shows a new error message. The cause is not confirmed.'},{id:'clear',text:'There are no new error messages.'}],answer:'observed',explanation:'Phân biệt bằng chứng quan sát được và điều chưa được xác nhận.'},
    target:'The log shows a new error message.',guidance:'Chia thành The log shows / a new error message. Nghe và đọc rõ error message, không cần thêm thông tin kỹ thuật ngoài bài.',
    speaking:'Báo kết quả kiểm tra theo ba phần: thấy gì, chưa biết gì và cần lưu/kiểm tra gì tiếp.',
    writing:'Viết bốn câu dựa trên tình huống nghe, giữ đúng khác biệt giữa dịch vụ đã phản hồi và máy khách vẫn đang chờ.',
    model:'I checked ___ at ___. The log shows ___. The cause is not confirmed. Please keep ___ for review.',
    rubric:['Tách kết quả dịch vụ và trạng thái máy khách.','Không bịa nguyên nhân.','Nêu một bước tiếp theo rõ ràng.']
  });
  const questions=makeLesson({
    id:'system-incident-questions-01',program_id:'english-it-system',title:'Hỏi thông tin để làm rõ sự cố',position:6,prerequisites:['foundation-past-questions-01','foundation-clarification-01','system-service-status-01'],
    objectives:['Hỏi được thời điểm bắt đầu, phạm vi ảnh hưởng và thông báo lỗi.','Dùng did + nguyên mẫu trong câu hỏi quá khứ.'],
    translation:'Sự cố bắt đầu lúc nào? Nó bắt đầu lúc tám giờ sáng nay. Nó có ảnh hưởng tới cả hai máy khách không? Không, chỉ một máy khách bị ảnh hưởng. Bạn chia sẻ thông báo lỗi được không? Vui lòng không đưa mật khẩu vào tin nhắn.',
    listening:{prompt:'How many clients are affected?',options:[{id:'one',text:'One client'},{id:'two',text:'Both clients'},{id:'none',text:'No clients'}],answer:'one',explanation:'Only one client is affected: chỉ một máy khách bị ảnh hưởng.'},
    phrases:[{text:'When did the problem start?',translation:'Sự cố bắt đầu lúc nào?'},{text:'both clients',translation:'cả hai máy khách'},{text:'is affected',translation:'bị ảnh hưởng'},{text:'share the error message',translation:'chia sẻ thông báo lỗi'}],
    grammarTitle:'When did…? để hỏi thời điểm bắt đầu',
    grammar:{instruction:'When did the problem start? Sau did dùng start, không dùng started. Câu trả lời dùng quá khứ: It started at eight. Nhờ thông tin: Could you share the error message? Chỉ yêu cầu thông tin liên quan; không cần mật khẩu hoặc khóa API trong bài tập.',prompt:'Điền từ: When did the problem ___?',options:[{id:'started',text:'started'},{id:'starting',text:'starting'},{id:'start',text:'start'}],answer:'start',explanation:'Sau did dùng động từ nguyên mẫu start.'},
    target:'When did the problem start?',guidance:'Dừng sau cụm When did nếu cần rồi đọc cả câu. Nói rõ problem và âm cuối start; mục tiêu là câu hỏi dễ hiểu.',
    speaking:'Đóng vai hỏi ba điều: thời điểm bắt đầu, số máy bị ảnh hưởng và thông báo lỗi. Sau đó tóm tắt câu trả lời để xác nhận.',
    writing:'Viết ba câu hỏi làm rõ sự cố và hai câu tóm tắt theo bài nghe. Không thêm dữ liệu riêng hoặc nguyên nhân không có trong bài.',
    model:'When did ___ start? Does it affect ___? Could you share ___? It started at ___. Only ___ is affected.',
    rubric:['Sau did dùng nguyên mẫu.','Hỏi đúng thời gian/phạm vi/thông báo.','Tóm tắt nhất quán với câu trả lời.']
  });
  const email=makeLesson({
    id:'system-handoff-email-01',program_id:'english-it-system',title:'Viết cập nhật và bàn giao qua email',position:7,prerequisites:['system-incident-handoff-01',checks.id,questions.id],
    objectives:['Xác định trạng thái hiện tại, người theo dõi và hạn cập nhật.','Nối lý do yêu cầu bằng because và viết bàn giao rõ ràng.'],
    translation:'Đây là cập nhật về dịch vụ thử nghiệm. Nó đang chạy, nhưng một máy khách vẫn đang chờ. Lan sẽ kiểm tra phản hồi tiếp theo. Vui lòng giữ ghi chú kiểm tra vì chúng ta cần xem xét lại. Gửi bản cập nhật tiếp theo trước mười một giờ. Cảm ơn bạn đã giúp đỡ.',
    listening:{prompt:'Who is going to check the response next?',options:[{id:'minh',text:'Minh'},{id:'lan',text:'Lan'},{id:'unknown',text:'The message does not say'}],answer:'lan',explanation:'Lan is going to check the response next: Lan nhận việc kiểm tra tiếp.'},
    phrases:[{text:'Here is an update on…',translation:'Đây là cập nhật về…'},{text:'is still waiting',translation:'vẫn đang chờ'},{text:'before eleven',translation:'trước mười một giờ'},{text:'keep the test notes',translation:'giữ lại ghi chú kiểm tra'}],
    grammarTitle:'Because và but trong tin nhắn công việc',
    grammar:{instruction:'Because + mệnh đề để giải thích lý do yêu cầu: Keep the notes because we need to review them. But nối hai ý có khác biệt: The service is running, but one client is waiting. Đó là lý do lưu ghi chú, không phải kết luận nguyên nhân sự cố. Before eleven là trước mười một giờ, không có nghĩa đúng lúc mười một giờ.',prompt:'Điền từ: Please keep the notes ___ we need to review them.',options:[{id:'because',text:'because'},{id:'before',text:'before'},{id:'than',text:'than'}],answer:'because',explanation:'Because nối lời yêu cầu với lý do: cần giữ ghi chú để xem xét lại.'},
    target:'The service is running, but one client is still waiting.',guidance:'Dừng ngắn trước but, nhấn rõ hai trạng thái khác nhau. Luyện cụm still waiting mà không bỏ âm cuối của still.',
    speaking:'Bàn giao bằng lời: trạng thái hiện tại, điều còn tồn tại, ai theo dõi và hạn cập nhật. Dùng dữ liệu của bài hoặc ghi rõ là giả định.',
    writing:'Viết email ngắn với tiêu đề và bốn đến năm câu, có trạng thái, người phụ trách bước tiếp theo, hạn cập nhật và lời cảm ơn.',
    model:'Subject: Test service update\nThe service is ___, but ___. ___ is going to check ___. Please keep ___ because ___. Send an update before ___. Thank you.',
    rubric:['Có tiêu đề, trạng thái và vấn đề còn tồn tại.','Ghi rõ người theo dõi và thời hạn.','Because dùng để nêu lý do có căn cứ, không tự bịa nguyên nhân.']
  });
  const readings=[
    [directions,'Go straight to the bookshop. Turn right at the bookshop. The library is on your left, next to a small cafe.','Where should you turn right?',[{id:'bookshop',text:'At the bookshop'},{id:'library',text:'At the library'},{id:'cafe',text:'At the cafe'}],'bookshop','Đoạn đọc yêu cầu rẽ phải ở hiệu sách, khác mốc thư viện trong bài nghe.'],
    [meeting,'Mai is free after four on Monday. Nam suggests meeting at five in the library. Mai agrees. Nam is going to bring the project notes.','What time do they agree to meet?',[{id:'four',text:'At four'},{id:'five',text:'At five'},{id:'three',text:'At three'}],'five','Rảnh sau bốn giờ không phải lịch hẹn; họ thống nhất năm giờ.'],
    [hardware,'Laptop A has a larger screen than Laptop B. In this test, Laptop B opens the training file faster. Both keyboards work. The cause of the speed difference is not confirmed.','Which laptop opens the file faster in this test?',[{id:'a',text:'Laptop A'},{id:'b',text:'Laptop B'},{id:'same',text:'They are equally fast'}],'b','Laptop B mở tệp nhanh hơn trong bài thử; màn hình lớn hơn không chứng minh máy nhanh hơn.'],
    [checks,'At ten, Mai checked the test service. The service returned a response. Two clients were still waiting. The log showed a new error message. The cause was not confirmed.','What was not confirmed?',[{id:'time',text:'The check time'},{id:'error',text:'The presence of an error message'},{id:'cause',text:'The cause'}],'cause','The cause was not confirmed: nguyên nhân chưa được xác nhận.'],
    [questions,'The problem started at seven. Two clients are affected. One client shows an error message. Minh asks for the message and confirms the start time with the user.','When did the problem start?',[{id:'seven',text:'At seven'},{id:'eight',text:'At eight'},{id:'nine',text:'At nine'}],'seven','Đoạn đọc nêu seven; eight thuộc bài nghe, không phải tình huống này.'],
    [email,'Subject: Test service follow-up\nThe service is running, but two clients are waiting. Minh is going to check their responses. Please keep the test notes because we need them for review. Send the next update before twelve.','Who is going to check the client responses?',[{id:'lan',text:'Lan'},{id:'minh',text:'Minh'},{id:'unknown',text:'The message does not say'}],'minh','Minh nhận bước kiểm tra tiếp theo trong email, khác Lan ở bài nghe.']
  ];
  for(const [lesson,text,question,options,answer,explanation] of readings)lesson.steps.splice(3,0,{id:'read-detail',type:'reading_comprehension',title:'Đọc tình huống mới',response_schema:'choice',prompt:`Đọc: ${text}\n\n${question}`,options,answer,explanation});
  const id='system-checkpoint-03',reading='Laptop B opened the training file faster than Laptop A in the test. Minh checked the test service at eight. The service responded, but two clients were waiting. Lan is going to check the client responses and send an update before ten. The cause is not confirmed.';
  const choices=[
    {id:'listen-owner',type:'listen_comprehension',title:'Nghe người nhận bàn giao',prompt:'Who is going to check the response next?',options:[{id:'minh',text:'Minh'},{id:'lan',text:'Lan'},{id:'unknown',text:'The message does not say'}],answer:'lan',explanation:'Lan is going to check the response next.'},
    {id:'listen-state',type:'listen_comprehension',title:'Nghe việc còn tồn tại',prompt:'What is still happening after the service returned a response?',options:[{id:'waiting',text:'One client is still waiting'},{id:'stopped',text:'The service is stopped'},{id:'confirmed',text:'The cause is confirmed'}],answer:'waiting',explanation:'One client is still waiting. Dịch vụ có phản hồi không đồng nghĩa mọi máy khách đều đã xong.'},
    {id:'grammar-question',type:'grammar_practice',title:'Hỏi thời điểm sự cố',prompt:'Chọn câu đúng.',options:[{id:'started',text:'When did the problem started?'},{id:'start',text:'When did the problem start?'},{id:'starting',text:'When did the problem starting?'}],answer:'start',explanation:'Sau did dùng start nguyên mẫu.'},
    {id:'grammar-reason',type:'grammar_practice',title:'Nêu lý do yêu cầu',prompt:'Điền từ: Keep the notes ___ we need to review them.',options:[{id:'because',text:'because'},{id:'than',text:'than'},{id:'at',text:'at'}],answer:'because',explanation:'Because nối yêu cầu lưu ghi chú với lý do cần xem lại.'},
    {id:'read-comparison',type:'reading_comprehension',title:'Đọc kết quả so sánh',prompt:`Đọc: ${reading}\n\nWhich laptop opened the file faster?`,options:[{id:'a',text:'Laptop A'},{id:'b',text:'Laptop B'},{id:'same',text:'Both at the same speed'}],answer:'b',explanation:'Laptop B opened the training file faster than Laptop A.'},
    {id:'read-deadline',type:'reading_comprehension',title:'Đọc hạn cập nhật',prompt:`Đọc: ${reading}\n\nWhen should Lan send an update?`,options:[{id:'eight',text:'At eight'},{id:'after',text:'After ten'},{id:'before',text:'Before ten'}],answer:'before',explanation:'Send an update before ten: trước mười giờ, không phải giờ kiểm tra trước đó.'}
  ].map(q=>({...q,response_schema:'choice'}));
  const checkpoint={id,program_id:'english-it-system',version:1,position:8,lesson_kind:'checkpoint',title:'Ôn chặng IT/System: kiểm tra và bàn giao',level_hint:'Local specialist review, not a certification test',estimated_minutes:25,objectives:['Đọc/nghe bằng chứng công việc và phân biệt điều chưa xác nhận.','Tự báo trạng thái và bàn giao rõ người, việc, thời hạn.'],recommended_prerequisites:[hardware.id,checks.id,questions.id,email.id],provenance,media_id:id,transcript:scripts.find(s=>s.id===id).transcript,translation:'Tôi đã kiểm tra dịch vụ thử nghiệm lúc chín giờ. Nó đã trả về một phản hồi. Một máy khách vẫn đang chờ. Lan sẽ kiểm tra phản hồi tiếp theo. Vui lòng gửi cập nhật trước mười một giờ. Nguyên nhân chưa được xác nhận.',checkpoint:{graded_step_ids:choices.map(q=>q.id),minimum_correct:4,review_map:{'listen-owner':[email.id],'listen-state':[checks.id],'grammar-question':[questions.id],'grammar-reason':[email.id],'read-comparison':[hardware.id],'read-deadline':['system-incident-handoff-01',email.id]}},steps:[...choices,
    {id:'speaking',type:'speaking_task',title:'Bàn giao không chép mẫu',response_schema:'text',prompt:'Báo lại tình huống bằng bốn câu: đã kiểm gì, còn điều gì, ai làm tiếp và hạn cập nhật. Không thêm nguyên nhân. Nhập bản chép lời để lưu.',assessment:'self_review',rubric:['Phân biệt kết quả đã thấy với điều chưa biết.','Người nhận việc và thời hạn rõ ràng.','Tự nói trước khi xem lại mẫu.']},
    {id:'writing',type:'writing_task',title:'Viết cập nhật ngắn',response_schema:'text',prompt:'Viết tiêu đề và bốn đến năm câu email bàn giao theo tình huống bài nghe. Nêu cả máy khách còn chờ và việc nguyên nhân chưa được xác nhận.',assessment:'self_review',rubric:['Giữ đúng số máy khách và trạng thái.','Có người theo dõi, việc tiếp theo và thời hạn.','Không suy ra đã khắc phục triệt để hoặc đạt chứng chỉ.']},
    {id:'reflection',type:'reflection',title:'Chọn điều cần ôn',response_schema:'self_reflection',prompt:'Ghi điểm còn nhầm về thời gian/trạng thái/cấu trúc câu. Kết quả này là ôn nội bộ, không thay thế kiểm tra kỹ thuật hoặc chứng chỉ tiếng Anh.',assessment:'self_review'}]};
  return [directions,meeting,hardware,checks,questions,email,checkpoint];
}
