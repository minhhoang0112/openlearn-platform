# Cập nhật nội dung đã triển khai

CONTENT-07 đã đủ 24 bài thường + 3 ôn chặng, 158 clip. Xem [danh mục thực tế](LEARNING-CURRICULUM.md) và [bàn giao nghiệm thu](UPGRADE-V2-CONTENT-07.md). Các câu “chưa có 24 bài” trong bản thiết kế lịch sử phía dưới không còn mô tả hiện trạng. Chương trình vẫn pilot; audio cần người thật nghe duyệt.

# Thiết kế nâng cấp V2 — tiếng Anh nền tảng đến IT/System

> Phần đã triển khai được cập nhật riêng trong [trạng thái chung](UPGRADE-V2-STATUS.md) và [API thực tế](UPGRADE-V2-API.md). Đã có2bài pilot, profile, kế hoạch ngày và session BE; chưa phải toàn bộ giáo trình/tính năng dưới đây.

Ngày 21/10/2026. Đây là **đặc tả cần triển khai**, không phải báo cáo tính năng đã hoàn thành. Lượt này chỉ tạo tài liệu, không đổi FE/BE/DB. Đọc cùng [chia việc và API dự kiến](UPGRADE-V2-HANDOFF.md), [BE hiện tại](ANTI-BE-HANDOFF.md).

**Bổ sung phạm vi theo người dùng:** nền tảng tiếng Anh là chương trình chung; IT/System là khóa chuyên biệt và mục tiêu của tài khoản người dùng hiện tại, không phải mặc định của mọi tài khoản. Ưu tiên làm bản cá nhân trước. Khả năng AI đề xuất lộ trình cho nhiều người nằm ở đợt sau, không mở rộng triển khai ngay trong đợt 1.

## 1. Người học và kết quả mong muốn

Người học chính: sinh viên CNTT năm 4, định hướng system; nhận ra nhiều mặt chữ nhưng vốn nghĩa hạn chế, chưa chắc loại từ/cấu trúc câu, nghe và phát âm còn khó. Không suy ra trình độ CEFR chính thức từ mô tả này. Ưu tiên nền tảng giao tiếp và khả năng dùng tiếng Anh trong học/làm IT; chứng chỉ là nhánh sau khi xác định kỳ thi và mục tiêu.

Vấn đề sản phẩm hiện tại là nhiều công cụ nhưng chưa có giáo trình nối chúng thành một đường học. V2 cần giúp người học trả lời: hôm nay học gì, tại sao học, đã làm được gì, lần sau tiếp tục ở đâu. Không lấy số tính năng, số từ đã mở hoặc streak làm bằng chứng thành thạo.

Các lựa chọn ban đầu có thể đổi: 15/30/45 phút/ngày, mục tiêu giao tiếp/đọc tài liệu và khóa chuyên biệt. Tài khoản hiện tại chọn hướng IT/System; tài khoản khác chưa chọn thì chỉ có nền tảng chung. Mặc định thử 30 phút, chưa phải thời lượng người dùng đã chốt. Không cam kết số tuần đạt A2/B1 hay điểm chứng chỉ.

## 2. Phạm vi giữ và thay đổi

Giữ bộ từ/lộ trình, flashcards, SRS, học, nghe chép, ngữ pháp, đọc hiểu, Speaking, hội thoại, bài khóa học và toàn bộ dữ liệu hiện có. Dùng lại API và bộ điều khiển khi đúng mục đích. Không xây lại toàn ứng dụng.

Thêm một chương trình học có nội dung lưu sẵn và điều phối bài hàng ngày. Luyện tự do vẫn mở; người học không bị buộc theo thứ tự hoặc mua gói. Tên/ID khóa học và bộ từ cũ không được dùng làm mã bài V2.

Sidebar đề xuất:

| Mục chính | Nội dung |
| --- | --- |
| Hôm nay | Bài tiếp theo, ôn đến hạn, tiếp tục phiên, phiên ngắn |
| Lộ trình của tôi | Các chặng, mục tiêu làm được, bài và checkpoint |
| Thư viện | Bộ từ/lộ trình/khóa học hiện có, học liệu nghe, tài liệu cá nhân |
| Luyện tập | Nghe–phát âm, nói–viết, ngữ pháp; nhóm con thay vì thêm hàng loạt mục ngang hàng |
| Ôn tập | SRS, câu/cụm cần ôn, sổ lỗi |
| Tiến bộ | Kết quả theo nhiệm vụ và kỹ năng, điểm yếu có bằng chứng |

Tra từ và Tạo nội dung nằm ở nhóm công cụ; Cài đặt AI nằm trong Cài đặt. Gỡ Xếp hạng và Góp ý/Báo lỗi khỏi sidebar theo yêu cầu. Đưa Lớp học vào khu phụ nếu cần dùng về sau; không xóa route/API/bảng dữ liệu. Ở đợt đầu, mục chưa có API không xuất hiện như chức năng đã hoạt động. Sidebar thu gọn, mobile có nhãn truy cập được.

## 3. Một bài học kết hợp, không một phương pháp mỗi ngày

Một bài xoay quanh một tình huống, một mục tiêu giao tiếp, khoảng 5–8 từ/cụm mới và một cấu trúc chính. Con số là hướng biên soạn, không ép mọi bài đủ tám từ. Nghe/nói/đọc/viết dùng chung ngữ liệu. Một bài có thể học qua nhiều ngày.

Luồng đề xuất:

1. Ôn ngắn nội dung đến hạn, có nút giới hạn thời gian; không chặn bài mới vì còn nhiều thẻ.
2. Nghe đoạn ngắn và trả lời ý chính. Transcript chưa mở mặc định; cho phép mở hỗ trợ, ghi nhận đã dùng hỗ trợ, không trừng phạt.
3. Xem transcript, nghĩa và cụm hữu ích. Người học thử nhớ nghĩa trước khi xem. Từ/cụm được gắn lại vào thư viện đang có khi có liên kết thực.
4. Giải thích một cấu trúc/loại từ trong chính đoạn vừa nghe; làm vài câu biến đổi hoặc điền từ.
5. Luyện phát âm một điểm khó; nghe từng câu → nhắc lại → ghi âm/nghe lại. Shadowing là tùy chọn sau khi hiểu nội dung, không buộc người mới nói đuổi cả đoạn.
6. Nói 2–3 câu về bản thân hoặc đóng vai; có mẫu hỗ trợ. Viết 3–5 câu/email/ticket ngắn tùy chặng.
7. Tóm tắt kết quả thật, lưu mục cần ôn và bước tiếp theo. Bài tập xác định chấm BE; nhiệm vụ mở dùng rubric/nhận xét, không giả thành đúng/sai tuyệt đối.

Phiên 15 phút: ôn tối thiểu và tiếp tục vài bước; lưu phần còn lại. Phiên 45 phút: thêm nhiệm vụ vận dụng/ôn, không tự gấp đôi từ mới. Bỏ một ngày: tiếp tục từ chỗ dừng, cho lựa chọn giảm tải; không dồn mọi bài lỡ vào hôm sau. Một ngày học xong sớm vẫn có thể học thêm tự chọn.

## 4. Các chặng và nội dung

Các chặng nền tảng/sinh hoạt thuộc chương trình chung. Hai chặng IT/System và làm việc kỹ thuật bên dưới thuộc **khóa riêng English for IT/System**, chỉ ghép vào kế hoạch của người đăng ký khóa đó. Hai chương trình có ID/version/tiến độ riêng và liên kết prerequisite gợi ý; không nhân bản toàn bộ nền tảng hoặc bắt mọi người học system.

| Chặng | Trọng tâm | Ví dụ nhiệm vụ kiểm tra |
| --- | --- | --- |
| Khởi động | Kiểm tra ngắn nghe/đọc/cấu trúc; tự ghi âm và tự đánh giá, không cấp chứng nhận CEFR | Nghe thông tin tên/giờ; đọc tin nhắn; viết giới thiệu |
| Nền tảng | Đại từ, be, danh/động/tính từ trong câu, câu khẳng định/phủ định/hỏi; số/giờ; âm và trọng âm cần thiết | Giới thiệu, hỏi giờ, mô tả đồ vật và lịch học |
| Sinh hoạt và học tập | Hiện tại đơn/tiếp diễn, khả năng, yêu cầu, quá khứ và kế hoạch theo nhu cầu bài | Kể ngày học, nhờ giúp, mô tả việc hôm qua và kế hoạch |
| IT/System cơ bản | Instructions, vị trí, trạng thái, thao tác; tiếng Anh phổ thông vẫn là nền | Đọc hướng dẫn cài đặt, mô tả máy/server, giải thích bước thực hiện |
| Làm việc | Ticket, incident, status update, hỏi làm rõ, bàn giao, đoạn tài liệu ngắn | Báo lỗi, mô tả expected/actual, viết cập nhật và trình bày cách khắc phục |
| Nhánh mục tiêu | Bổ sung theo chứng chỉ/công việc đã chọn | Bài đánh giá đúng kỹ năng và cấu trúc mục tiêu |

Không dạy toàn bộ thì/IPA thành điều kiện tiên quyết; phân bố qua tình huống. Không coi thuộc 3.000 từ là điều kiện mới được nghe nói. Danh sách từ thông dụng có thể làm bản đồ bao phủ; phân biệt nhận ra nghĩa, nhớ chủ động và dùng được trong câu.

Gói nội dung phát hành đầu cho người dùng hiện tại: **12 chủ đề × 2 bài = 24 bài ngắn**, kèm 3 checkpoint sau mỗi 4 chủ đề. Đây là backlog biên soạn, **chưa phải 24 bài đã tồn tại**. Tách 8 chủ đề đầu vào nền tảng chung và 4 chủ đề cuối vào khóa IT/System; kế hoạch cá nhân kết hợp hai khóa. Phát hành từng cụm đã duyệt; không gắn nhãn khóa hoàn chỉnh khi thiếu audio/câu hỏi.

12 chủ đề: giới thiệu; người/vật; giờ và lịch; sinh hoạt; nơi chốn; khả năng/yêu cầu; sự việc đã xảy ra; kế hoạch; máy tính và thao tác; dịch vụ và trạng thái; báo sự cố; giải thích và bàn giao. Chỉ tăng độ khó sau quan sát kết quả; người học vẫn được chọn bài.

## 5. Nghe và Basic Tactics for Listening

Basic Tactics for Listening có thể là một nguồn luyện nghe trong thư viện, không thay toàn bộ chương trình bốn kỹ năng. Chưa xem nội dung sách trong lượt này nên không khẳng định độ phù hợp từng bài hoặc ánh xạ chính xác CEFR. Không cần chờ có sách mới triển khai lộ trình.

Thiết kế kho nghe hỗ trợ: audio, transcript, bản dịch tùy chọn, câu hỏi ý chính/chi tiết, đoạn lặp có timestamp. Người dùng có thể nhập tài liệu/audio mình được phép dùng vào thư viện riêng, hoặc lưu liên kết nguồn. PDF và audio không tự đồng bộ được; nếu chưa có transcript/timestamp cần nhập/chuẩn bị, không giả là đã chia câu chính xác.

Trang tài nguyên Oxford: https://elt.oup.com/student/tacticsforlistening3e/level_0 . Lượt kiểm tra gặp trang xác minh trình duyệt, chưa xác minh từng file/audio hoặc quyền phân phối. Không lấy PDF tải trên mạng làm nguồn mặc định của sản phẩm.

Nguồn bổ sung: [British Council A1 listening](https://learnenglish.britishcouncil.org/free-resources/listening/a1) có chuẩn bị, audio và bài kiểm tra hiểu; [VOA Level 1](https://learningenglish.voanews.com/p/5644.html) là nguồn tham khảo lộ trình. Link ra nguồn trước; nội dung phát hành trong app cần hồ sơ nguồn/quyền dùng riêng. Bài do mình soạn ghi rõ là nội dung của ứng dụng.

## 6. Nâng cấp chức năng hiện có

| Hiện có | Nâng cấp cần làm |
| --- | --- |
| Bộ từ và SRS | Ôn từ/cụm trong câu, kèm audio/ví dụ; câu luyện có lịch riêng, không đánh dấu mastered chỉ vì mở thẻ |
| Nghe chép | Câu/đoạn thật, lặp đoạn, tốc độ, gợi ý; lỗi bỏ từ/chính tả tách rõ; không bắt chép cả bài mỗi ngày |
| Speaking/hội thoại | Câu hỏi theo bài, vai và mục tiêu; dùng từ mục tiêu là một tín hiệu, không phải tiêu chí duy nhất của cuộc nói |
| Ngữ pháp/đọc hiểu | Mẫu câu và đoạn văn gắn mục tiêu bài; câu hỏi có giải thích, hiện đáp án sau chấm |
| Khóa học | Dùng session BE đã có ở bài cũ; bài V2 cần bộ điều phối nhiều loại bước, không ép vào vocab/speaking/quiz nếu thiếu chức năng |
| Phát âm | Nghe mẫu, ghi âm và phát lại; AI âm thanh nhận xét riêng. Transcript khớp là kiểm tra nhận dạng từ, không phải điểm phát âm |
| Viết | Thêm nhiệm vụ từ câu ngắn tới status update/ticket; lưu bản gốc, bản sửa, lý do, thử viết lại |
| Tiến bộ | Theo dõi nhiệm vụ làm được, kết quả không hỗ trợ/có hỗ trợ, xu hướng và lần kiểm tra gần nhất; không vẽ radar bằng số giả |

## 7. AI và độ bền

Nội dung cốt lõi được biên soạn/duyệt và lưu: audio, transcript, bài tập, đáp án, giải thích. Học bình thường không bắt buộc gọi AI mỗi lần mở. AI tạo biến thể, gợi ý và nhận xét mở; lỗi không làm mất bản nháp hoặc chặn phần học có sẵn.

Phân biệt quota429, busy503, timeout, chưa cấu hình, output không hợp lệ. Nút tạo ngăn gửi lặp; giới hạn thử lại và hiển thị thử lại chủ động. Không hiện khung bài trống với nút chấm khi chưa tạo thành công. Có thể thiết kế model dự phòng nhưng chỉ bật khi cấu hình/khả năng/chi phí được người dùng chọn; không tự chuyển cloud trả phí.

Ollama là lựa chọn bổ sung sau kiểm tra phần cứng và chất lượng; không coi adapter tồn tại là model đã cài. Giọng TTS của trình duyệt và audio người thật/đã thu có nhãn riêng. Không dùng câu tự khai 'AI chấm 95%' làm điểm phát âm chính xác.

## 8. Thứ tự triển khai và tiêu chí xong

**Đợt 1 — một luồng học dùng được:** sidebar, hồ sơ học, Hôm nay, một bài đầy đủ nghe–hiểu–cấu trúc–nói–viết, lưu nháp/tiếp tục, không phụ thuộc Gemini khi mở bài. Giữ chức năng cũ. Chưa mở một danh mục toàn nút trống.

**Đợt 2 — học đều:** đủ cụm bài đã duyệt, lên kế hoạch theo ngân sách, sổ lỗi, ôn câu/cụm, checkpoint, lịch sử kỹ năng có bằng chứng. Làm đủ nội dung và kiểm tra trước khi tăng số bài.

**Đợt 3 — IT và thư viện nghe:** bài system theo độ khó, import audio/transcript, lặp đoạn/shadowing, AI viết/nói có rubric. Nhập PDF/OCR là việc riêng sau audio/transcript thủ công, không chặn đợt 1.

**Đợt 4 — chuẩn bị sản phẩm nhiều người dùng:** kiểm tra quyền học liệu/nhãn hiệu và hồ sơ nguồn; thương hiệu riêng; cách ly dữ liệu/audio; kiểm soát chi phí AI; backup/restore và triển khai; thử với người học thật. Đây là điều kiện xem xét phân phối, không có nghĩa viết xong V2 là đủ chất lượng để bán. Chưa thêm thanh toán trong các đợt này.

Mỗi đợt nghiệm thu: không mất dữ liệu cũ; tải lại tiếp tục đúng; nộp lại không cộng tiến độ hai lần; lỗi AI/mạng không mất input; không có placeholder đóng vai dữ liệu thật; bàn phím/mobile dùng được. Kiểm tra sâu đúng luồng vừa sửa, không chạy lại mọi thứ sau mỗi thay đổi CSS.

## 9. Quyết định và thông tin còn mở

Hướng mở rộng sau khi bản cá nhân dùng tốt: hồ sơ từng người gồm mục tiêu, kinh nghiệm, năng lực theo kỹ năng, thời gian và sở thích; AI **đề xuất** thứ tự bài/khóa từ nội dung đã duyệt, giải thích lý do và cho người học xác nhận/chỉnh. Nếu thiếu bài, AI có thể tạo bản nháp theo schema/rubric để kiểm tra trước khi đưa vào lộ trình. Không sinh khóa tùy hứng mỗi ngày, không thay kế hoạch đang học mà không báo, không coi suy đoán AI là chứng nhận trình độ. Cần đánh giá đầu vào và cập nhật bằng kết quả thực. Chưa xây bộ cá nhân hóa AI trong đợt đầu.

Chốt hướng: một lộ trình chính, luyện tự do là bổ sung; nền tảng trước kỹ thuật khó; nội dung cốt lõi lưu sẵn; BE Codex/FE Anti; không khóa Pro. Chưa chốt thời lượng thực tế, mục tiêu chứng chỉ, biến thể phát âm và học liệu sách người dùng đang có. Cho đổi trong hồ sơ; không để các câu hỏi đó chặn thiết kế đợt 1. Mặc định đề xuất không được ghi thành cam kết của người dùng.
