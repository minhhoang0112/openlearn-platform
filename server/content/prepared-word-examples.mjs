// Authored English/Vietnamese examples; only exact listed Vietnamese senses match.
const rows=[
  ['mother',['mẹ','má'],'My mother is in the kitchen.','Mẹ tôi đang ở trong bếp.'],
  ['father',['bố','cha','ba'],'My father works in a hospital.','Bố tôi làm việc trong bệnh viện.'],
  ['sister',['chị gái','em gái'],'My sister is reading a book.','Chị gái tôi đang đọc sách.'],
  ['brother',['anh trai','em trai'],'My brother is a student.','Anh trai tôi là sinh viên.'],
  ['family',['gia đình'],'I live with my family.','Tôi sống cùng gia đình.'],
  ['friend',['bạn','bạn bè'],'She is my best friend.','Cô ấy là bạn thân nhất của tôi.'],
  ['neighbor',['hàng xóm','người hàng xóm'],'Our neighbor has a small dog.','Hàng xóm của chúng tôi có một con chó nhỏ.'],
  ['red',['đỏ','màu đỏ'],'She has a red bag.','Cô ấy có một chiếc túi màu đỏ.'],
  ['blue',['xanh dương','màu xanh dương','xanh da trời'],'The sky is blue today.','Hôm nay bầu trời có màu xanh.'],
  ['green',['xanh lá cây','màu xanh lá cây','xanh lá'],'The leaves are green.','Những chiếc lá có màu xanh lá cây.'],
  ['yellow',['vàng','màu vàng'],'This banana is yellow.','Quả chuối này có màu vàng.'],
  ['pink',['hồng','màu hồng'],'Her shirt is pink.','Áo sơ mi của cô ấy có màu hồng.'],
  ['purple',['tím','màu tím'],'I like these purple flowers.','Tôi thích những bông hoa màu tím này.'],
  ['brown',['nâu','màu nâu'],'He has brown eyes.','Anh ấy có đôi mắt màu nâu.'],
  ['black',['đen','màu đen'],'My shoes are black.','Giày của tôi có màu đen.'],
  ['white',['trắng','màu trắng'],'The wall is white.','Bức tường có màu trắng.'],
  ['student',['sinh viên','học sinh'],'I am a university student.','Tôi là sinh viên đại học.'],
  ['teacher',['giáo viên','thầy giáo','cô giáo'],'Our teacher explains the lesson clearly.','Giáo viên của chúng tôi giải thích bài học rõ ràng.'],
  ['book',['sách','quyển sách','cuốn sách'],'This book is easy to read.','Cuốn sách này dễ đọc.'],
  ['water',['nước'],'I drink water every day.','Tôi uống nước mỗi ngày.'],
  ['computer',['máy tính'],'Please restart your computer.','Vui lòng khởi động lại máy tính của bạn.'],
  ['server',['máy chủ'],'The server is running normally.','Máy chủ đang hoạt động bình thường.'],
  ['network',['mạng','mạng máy tính'],'The computer is connected to the network.','Máy tính đã được kết nối với mạng.'],
  ['password',['mật khẩu'],'Do not share your password.','Đừng chia sẻ mật khẩu của bạn.'],
  ['interview',['phỏng vấn','buổi phỏng vấn'],'I have a job interview tomorrow.','Ngày mai tôi có một buổi phỏng vấn xin việc.'],
  ['apply',['nộp đơn'],'You should apply for the job before the deadline.','Bạn nên nộp đơn xin việc trước hạn chót.'],
  ['apply for',['ứng tuyển vào'],'He decided to apply for a job at the new company.','Anh ấy quyết định ứng tuyển vào một công việc tại công ty mới.'],
  ['apprentice',['người học việc'],'The apprentice learned carpentry skills from his master.','Người học việc đã học kỹ năng làm mộc từ thầy của mình.'],
  ['background',['lý lịch','nền tảng'],'Her strong educational background made her stand out from other applicants.','Nền tảng học vấn vững chắc giúp cô ấy nổi bật hơn các ứng viên khác.'],
  ['candidate',['ứng viên','thí sinh'],'Each candidate must submit their resume before Friday.','Mỗi ứng viên phải nộp bản lý lịch nghề nghiệp trước thứ Sáu.'],
  ['expert',['chuyên gia','chuyên viên'],'The company hired a technical expert to solve the system issue.','Công ty đã thuê một chuyên gia kỹ thuật để giải quyết sự cố hệ thống.'],
  ['hire',['thuê','mướn'],'The company plans to hire more staff next month.','Công ty dự định tuyển thêm nhân viên vào tháng tới.'],
  ['profession',['chuyên môn','nghề nghiệp'],'Teaching is a rewarding profession.','Dạy học là một nghề đem lại nhiều ý nghĩa.'],
  ['profile',['lý lịch','hồ sơ'],'She updated her profile today.','Cô ấy đã cập nhật hồ sơ hôm nay.'],
  ['promote',['thăng chức'],'They plan to promote her next year.','Họ dự định thăng chức cho cô ấy vào năm tới.'],
  ['qualifications',['trình độ','năng lực','bằng cấp'],'This job requires specific qualifications.','Công việc này yêu cầu những bằng cấp cụ thể.'],
  ['brand',['thương hiệu','nhãn hiệu'],'This brand is popular with students.','Thương hiệu này được sinh viên ưa chuộng.'],
  ['chain',['chuỗi','chuỗi cửa hàng'],'The company owns a chain of coffee shops.','Công ty sở hữu một chuỗi quán cà phê.'],
  ['demand',['nhu cầu'],'Demand for this product is increasing.','Nhu cầu đối với sản phẩm này đang tăng.'],
  ['diversify',['đa dạng hóa'],'The company wants to diversify its products.','Công ty muốn đa dạng hóa sản phẩm của mình.'],
  ['enterprise',['doanh nghiệp'],'She runs a small enterprise.','Cô ấy điều hành một doanh nghiệp nhỏ.'],
];
const normal=s=>s.normalize('NFKC').trim().toLowerCase().replace(/[.!?]+$/,'');
export const preparedExampleCount=rows.length;
export function preparedWordExample(word){
  if(word.example_source==='ai'&&word.example?.trim()&&!word.example_translation?.trim()){
    const known=rows.find(row=>row[2]===word.example.trim());
    if(known)return {...word,example_translation:known[3],translation_source:'prepared'};
  }
  if(word.example_source!=='library'||word.example?.trim())return word;
  const senses=word.definition.split(/[;,]/).map(normal),match=rows.find(([term,meanings])=>normal(word.term)===term&&meanings.some(s=>senses.includes(s)));
  return match?{...word,example:match[2],example_translation:match[3],example_source:'prepared'}:word;
}
