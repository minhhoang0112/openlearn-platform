// Optional specialist track; never assigned automatically to general learners.
export function buildSystemExtension({makeLesson}){
  const files=makeLesson({
    id:'system-files-01',program_id:'english-it-system',title:'Hướng dẫn thao tác với tệp',position:1,prerequisites:['system-introductions-01','foundation-help-01'],
    objectives:['Hiểu hướng dẫn ngắn có thứ tự thao tác.','Nói và viết một hướng dẫn đơn giản bằng động từ nguyên mẫu.'],
    translation:'Trước tiên, mở thư mục dự án. Tạo một tệp mới có tên notes. Viết một ghi chú ngắn trong tệp. Sau đó, lưu các thay đổi. Đóng tệp sau khi lưu. Bạn có thể mở lại tệp được không?',
    listening:{prompt:'What should you do after writing a short note?',options:[{id:'delete',text:'Delete the folder'},{id:'save',text:'Save the changes'},{id:'restart',text:'Restart the computer'}],answer:'save',explanation:'Write a short note… Then, save the changes: sau khi viết ghi chú thì lưu thay đổi.'},
    phrases:[{text:'open the project folder',translation:'mở thư mục dự án'},{text:'create a new file',translation:'tạo một tệp mới'},{text:'save the changes',translation:'lưu các thay đổi'},{text:'open the file again',translation:'mở lại tệp'}],
    grammarTitle:'Hướng dẫn: động từ nguyên mẫu và từ nối',
    grammar:{instruction:'Hướng dẫn thao tác có thể bắt đầu bằng động từ nguyên mẫu: Open the folder. Save the changes. Dùng First, Then, After that để thể hiện thứ tự. Phủ định: Do not delete the file. Không thêm s vì đây không phải câu kể He opens. Please giúp lời yêu cầu lịch sự hơn.',prompt:'Chọn hướng dẫn đúng.',options:[{id:'opens',text:'Opens the folder.'},{id:'opening',text:'Opening the folder.'},{id:'open',text:'Open the folder.'}],answer:'open',explanation:'Câu hướng dẫn dùng động từ nguyên mẫu Open. Opening the folder riêng lẻ chưa phải câu mệnh lệnh đầy đủ.'},
    target:'First, open the folder. Then, save the file.',guidance:'Chia thành hai nhóm từ, dừng ngắn sau folder. Đọc rõ file /faɪl/ và save /seɪv/, chú ý âm cuối /v/. Không cần bắt chước tốc độ nói nhanh.',
    speaking:'Hướng dẫn một người tạo và lưu một tệp ghi chú thử nghiệm bằng ba đến bốn câu. Đây là bài nói, không cần chạy lệnh hoặc sửa tệp hệ thống.',
    writing:'Viết bốn bước hướng dẫn cho một bạn học: mở thư mục, tạo tệp ghi chú, viết nội dung, lưu thay đổi. Thêm một câu nhắc không xóa tệp.',
    model:'First, open ___. Then, create ___. Write ___. Save ___. Do not delete ___.',
    rubric:['Bắt đầu bước hướng dẫn bằng động từ nguyên mẫu.','Các bước có thứ tự rõ ràng.','Người nghe biết thao tác với tệp hoặc thư mục nào.']
  });
  const status=makeLesson({
    id:'system-service-status-01',program_id:'english-it-system',title:'Hỏi và mô tả trạng thái dịch vụ',position:2,prerequisites:['system-introductions-01','foundation-now-01'],
    objectives:['Phân biệt thông tin trạng thái và hành động trong một tình huống thử nghiệm.','Hỏi Is…? và dùng is/are phù hợp khi mô tả trạng thái.'],
    translation:'Dịch vụ thử nghiệm đang chạy. Hai máy khách đã kết nối. Một máy khách đang chờ phản hồi. Dịch vụ hiện không trả về thông báo lỗi nào. Trang trạng thái đang mở trên màn hình của tôi. Bạn kiểm tra phản hồi của máy khách đó được không?',
    listening:{prompt:'How many clients are connected?',options:[{id:'one',text:'One'},{id:'two',text:'Two'},{id:'three',text:'Three'}],answer:'two',explanation:'Two clients are connected: có hai máy khách đã kết nối trong tình huống này.'},
    phrases:[{text:'the test service',translation:'dịch vụ thử nghiệm'},{text:'is running',translation:'đang chạy'},{text:'are connected',translation:'đang ở trạng thái đã kết nối'},{text:'waiting for a response',translation:'đang chờ phản hồi'}],
    grammarTitle:'Is/are trong mô tả trạng thái',
    grammar:{instruction:'The service is running: một dịch vụ dùng is. Two clients are connected: nhiều máy khách dùng are; connected ở đây mô tả trạng thái, không phải V-ing. Câu hỏi đảo be: Is the service running? Are the clients connected? Trạng thái running không tự chứng minh mọi request đều thành công; hãy mô tả đúng bằng chứng trong tình huống.',prompt:'Điền từ: Two clients ___ connected.',options:[{id:'is',text:'is'},{id:'are',text:'are'},{id:'am',text:'am'}],answer:'are',explanation:'Two clients là số nhiều nên dùng are.'},
    target:'Is the test service running?',guidance:'Luyện service /ˈsɜːrvɪs/ với trọng âm ở âm tiết đầu. Nghe, dừng rồi hỏi lại cả câu; cố gắng phân biệt service với server khi nghe.',
    speaking:'Đóng vai hỏi và báo trạng thái của một dịch vụ thử nghiệm: một câu hỏi, một thông tin quan sát được và một điều cần kiểm tra thêm.',
    writing:'Viết tin nhắn ba đến bốn câu về tình huống giả định: dịch vụ đang chạy, một máy khách đang chờ và yêu cầu bạn học kiểm tra phản hồi. Ghi rõ đây là tình huống luyện tập.',
    model:'Is the service running? The service is ___. One client is ___. Can you check ___, please?',
    rubric:['Is/are phù hợp số ít/số nhiều.','Nêu trạng thái theo thông tin của bài, không tự kết luận mọi thứ đều tốt.','Yêu cầu kiểm tra có đối tượng rõ ràng.']
  });
  const handoff=makeLesson({
    id:'system-incident-handoff-01',program_id:'english-it-system',title:'Báo sự cố và bàn giao ngắn',position:3,prerequisites:[status.id,'foundation-yesterday-01','foundation-plans-01'],
    objectives:['Nghe/đọc để phân biệt sự cố, hành động đã làm và việc cần theo dõi.','Viết bàn giao ngắn có mốc giờ và trạng thái hiện tại.'],
    translation:'Dịch vụ thử nghiệm dừng lúc chín giờ. Tôi kiểm tra kết nối. Tôi khởi động lại dịch vụ thử nghiệm. Hiện giờ nó đang hoạt động. Hãy kiểm tra lại lúc mười giờ. Tôi sẽ gửi cập nhật sau lần kiểm tra đó.',
    listening:{prompt:'When should the listener check the service again?',options:[{id:'nine',text:'At nine'},{id:'ten',text:'At ten'},{id:'eleven',text:'At eleven'}],answer:'ten',explanation:'Please check it again at ten: chín giờ là lúc sự cố, mười giờ là lần kiểm tra tiếp theo.'},
    phrases:[{text:'stopped at nine',translation:'đã dừng lúc chín giờ'},{text:'checked the connection',translation:'đã kiểm tra kết nối'},{text:'is working now',translation:'hiện đang hoạt động'},{text:'send an update',translation:'gửi thông tin cập nhật'}],
    grammarTitle:'Việc đã làm và trạng thái hiện tại',
    grammar:{instruction:'Đã xảy ra: The service stopped. I checked the connection. Trạng thái hiện tại: It is working now. Việc tiếp theo: I will send an update; sau will là nguyên mẫu send. Báo lại trình tự quan sát được, không tự thêm nguyên nhân hay hứa đã xử lý triệt để khi chưa kiểm chứng.',prompt:'Chọn câu đúng để báo một việc đã làm.',options:[{id:'checked',text:'I checked the connection.'},{id:'checking',text:'I checking the connection.'},{id:'amcheck',text:'I am checked the connection.'}],answer:'checked',explanation:'Checked là quá khứ của check: câu này báo việc đã kiểm tra, không phải hành động đang diễn ra.'},
    target:'I checked the connection. It is working now.',guidance:'Checked /tʃekt/ kết thúc bằng /t/, không thêm âm tiết sau -ed. Chia câu báo việc đã làm và câu báo trạng thái hiện tại bằng một khoảng dừng.',
    speaking:'Đóng vai bàn giao tình huống thử nghiệm: sự cố lúc nào, đã làm gì, hiện thế nào, ai cần kiểm tra gì tiếp. Không tự bịa nguyên nhân lỗi.',
    writing:'Viết bàn giao bốn đến năm câu dựa trên bài nghe, gồm mốc giờ sự cố, hành động đã làm, trạng thái hiện tại và lần kiểm tra tiếp theo. Không cần thao tác thật trên máy.',
    model:'The test service stopped at ___. I checked ___. It is ___ now. Please check ___ at ___. I will send ___.',
    rubric:['Phân biệt thời điểm sự cố và lần kiểm tra tiếp theo.','Dùng quá khứ cho việc đã làm, mô tả đúng trạng thái hiện tại.','Nêu bước theo dõi rõ ràng, không thêm nguyên nhân không có bằng chứng.']
  });
  const readings=[
    [files,'Please open the training folder. Create a file called todo. Write three tasks in it. Save the file before you close it. Do not delete the folder.','What should you do before closing the file?',[{id:'save',text:'Save the file'},{id:'delete',text:'Delete the folder'},{id:'restart',text:'Restart the service'}],'save','Save the file before you close it: cần lưu tệp trước khi đóng.'],
    [status,'The test service is running. Three clients are connected. One client is waiting for a response. Lan is checking that client. The cause is not known yet.','What is Lan checking?',[{id:'folder',text:'A project folder'},{id:'client',text:'The waiting client'},{id:'cause',text:'A confirmed cause'}],'client','Lan is checking that client: Lan đang kiểm tra máy khách đang chờ. Chưa biết nguyên nhân, không được tự coi là đã xác định.'],
    [handoff,'The test service stopped at eight. Minh checked the connection and restarted the test service. It is running now. Lan is going to check it again at nine and send an update.','Who is going to check the service again?',[{id:'minh',text:'Minh'},{id:'lan',text:'Lan'},{id:'unknown',text:'The message does not say'}],'lan','Lan is going to check it again: Lan nhận bước kiểm tra tiếp theo, Minh đã thực hiện các thao tác trước đó.']
  ];
  for(const [lesson,text,question,options,answer,explanation] of readings)lesson.steps.splice(3,0,{id:'read-detail',type:'reading_comprehension',title:'Đọc hướng dẫn và thông tin công việc',response_schema:'choice',prompt:`Tình huống luyện tập: ${text}\n\n${question}`,options,answer,explanation});
  return [files,status,handoff];
}
