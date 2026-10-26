# Đánh giá trải nghiệm và logic học OpenLearn

Ngày kiểm tra: 25/10/2026. Đây là đánh giá hiện trạng và đề xuất triển khai, không phải thông báo đã sửa toàn bộ sản phẩm.

## 1. Kết luận

OpenLearn có nhiều công cụ nhưng chưa có một hành trình học đủ thống nhất. Người học đang phải tự ghép bộ từ, lộ trình, bài nghe, SRS và AI thành kế hoạch riêng. Vấn đề cần giải quyết trước là tổ chức trải nghiệm, định nghĩa tiến độ và độ tin cậy của lịch ôn; thêm phương pháp mới lúc này sẽ tăng lựa chọn mà chưa giảm khó học.

Giữ engine học từ vựng đang hoạt động tốt làm nền. Đưa người mới vào một lộ trình ngắn có hướng dẫn, rồi cho phép mở rộng luyện tập theo nhu cầu. Các hình thức luyện vẫn được giữ nhưng xuất hiện vào đúng thời điểm.

## 2. Phạm vi và bằng chứng

- Build production `npm run build`: thành công. Bundle JS khoảng 1,059 KB, gzip 239 KB; cần đo hiệu năng thực tế trước khi kết luận nhanh/chậm.
- Chrome headless: 12 trang × 2 kích thước 1440×1000 và 390×844 = 24 trạng thái. Trang chủ, Hôm nay, Lộ trình, Thư viện, Luyện tập, chọn bộ từ, SRS, Sổ lỗi, Tiến độ, thư viện nghe, bộ từ, bài học V2.
- Không ghi nhận lỗi JavaScript hoặc HTTP >=400 trong lượt quét này. Kết quả này không chứng minh mọi chức năng hoặc mọi trạng thái đều đúng.
- Đọc logic `study.mjs`, `learning.mjs`, `learning-progress.mjs`, `learning-profile.mjs`, `lessons.mjs`, `content.mjs` và các view tương ứng.
- Tài khoản thử và SQLite bộ nhớ độc lập; không mở dữ liệu riêng hoặc sửa tiến độ người dùng. Vì vậy số liệu nội dung bên dưới phản ánh dữ liệu seed công khai, không phản ánh toàn bộ ghi chú riêng của tài khoản đang sử dụng.
- Không gọi Gemini, không thử đánh giá chất lượng nói từ âm thanh, không làm kiểm thử tải hoặc kiểm định trình độ ngoại ngữ.
- Bằng chứng máy đọc: [evidence.json](product-audit/evidence.json). Ảnh nằm trong `docs/product-audit/`. Script tái hiện: `scripts/audit-product-experience.mjs`.

## 3. Các vấn đề đã xác nhận

| Mã | Ưu tiên | Hiện trạng/bằng chứng | Tác động |
|---|---|---|---|
| UX-01 | P1 | Một từ trả lời đúng trong 3 phiên viết liên tiếp ngay cùng buổi: repetitions 1→2→3, khoảng ôn 1→6→15 ngày, status thành `mastered`. `server/study.mjs:11–22`, ảnh Home hiển thị “Đã thuộc”. | Luyện lại ngay bị coi như bằng chứng nhớ qua nhiều ngày. Lịch ôn có thể giãn quá sớm. Đây là vấn đề thiết kế ghi nhận trí nhớ, không phải mất dữ liệu. |
| UX-02 | P1 | Sau 3 lượt học từ thành công, `/learning/progress` vẫn có `active_days=0`, `lesson_submissions=0`, số phiên V2=0. API chủ động giới hạn `scope=learning_v2`; UI dùng tên chung “Tiến bộ & Lịch sử học tập”. | Người học tưởng việc học từ chưa được lưu. Thống kê đúng phạm vi kỹ thuật nhưng sai kỳ vọng sản phẩm. |
| UX-03 | P1 | Hồ sơ 15 phút vẫn được giao bài “Giới thiệu bản thân” 20 phút. Đổi 15→45 phút trong ngày vẫn trả kế hoạch cũ 15 phút, theo chính sách `next_local_day`. `learning.mjs:101–129`. | Kế hoạch chưa thực sự khớp quỹ thời gian. Người dùng dễ nghĩ cài đặt không hoạt động. Chính sách snapshot là có chủ đích, cần hỗ trợ rõ hơn thay vì tự sửa âm thầm. |
| UX-04 | P1 | Bộ công khai sau enrichment có 180 bộ/8.363 mục từ; chỉ 81 mục có câu ví dụ và 59 có dịch ví dụ; không có synonym có sẵn trong mẫu công khai này. Đã tính cả `preparedWordExample`, không chỉ đếm cột DB thô. | Nhiều chế độ phụ thuộc ngữ cảnh/dịch không có đủ dữ liệu để vận hành tốt cho cả kho. Nhiều từ không đồng nghĩa với giáo trình hoàn chỉnh. |
| UX-05 | P1 | Trang chủ đặt lộ trình fallback ID 20269 dưới nhãn “Lộ trình đang học” kể cả khi chưa có activePath; có 2 ô tìm kiếm và nhiều CTA quảng bá/cùng cấp. `DashboardView.tsx:101,386–419`. | Trộn nội dung gợi ý với hoạt động thật, người mới không biết đâu là bước tiếp theo. |
| UX-06 | P1 | Các hệ thống đang tách riêng: `word_progress`/study, `comprehensive_progress`, `learning_sessions`, phiên listening, materials. Học kết hợp theo bộ có 5 bước và chỉ hoàn tất khi đủ cả nói/hội thoại AI; hai bước AI thiếu cấu hình trả 503. `lessons.mjs`. | Người không dùng AI không hoàn thành được toàn bộ gói 5 bước; nhiều nghĩa khác nhau của “Kết hợp”, “Học”, “Hoàn thành”. |
| UX-07 | P1 FE | Ở 390px, tiêu đề “Nghe ý chính” bị ép xuống thành nhiều dòng ngắn cạnh cụm audio; xem [ảnh](product-audit/lesson-390.png). Nút Tra từ nổi chiếm vùng nội dung ở gần đáy màn hình. | Đọc khó, phân cấp thị giác yếu; có nguy cơ che thông tin hoặc thao tác tùy vị trí cuộn. |
| UX-08 | P2 | Trang chọn bộ từ dài khoảng 16.427px ở mobile; danh sách nghe 7.836px; Luyện tập 3.696px. Trang chọn bộ đã tách riêng nhưng vẫn đổ danh sách lớn. | Phải lướt nhiều, khó tìm bài phù hợp và tiếp tục bài cũ. |
| UX-09 | P2 | Thoát LessonRun luôn về `/today`, không giữ nơi mở bài; MyProgram chọn chương trình bằng local state và reset khi mount. `LessonRunView.tsx:1142`, `MyProgramView.tsx:29–48`. | Người đến từ danh mục/chương trình bị đổi ngữ cảnh; back có nút nhưng chưa luôn đúng ý nghĩa. |
| UX-10 | P2 | 12 nút trong vùng main của bộ từ không có text/aria-label/title trong mẫu quét. Có các card thao tác bằng div; tên chức năng lẫn tiếng Anh/Việt và thuật ngữ kỹ thuật như V2, `next_local_day`, ngân sách. | Khó dùng bằng bàn phím/trình đọc; người mới khó hiểu hành động hoặc trạng thái. |

Lưu ý: nhóm tab ở Luyện tập và Sổ lỗi có phần tử nằm ngoài chiều ngang viewport nhưng nằm trong vùng cuộn. Không tự coi đây là lỗi tràn toàn trang. Nên thêm dấu hiệu có thể vuốt hoặc đổi sang bộ lọc gọn. Lượt quét không phát hiện document rộng hơn viewport ở các trang đã mở.

## 4. Hướng sản phẩm đề xuất

### Một nơi bắt đầu, một việc chính mỗi màn

Sau đăng nhập, người học đã thiết lập hồ sơ vào **Học hôm nay**. Logo cũng về màn này. Trang khám phá bộ từ hiện tại chuyển thành **Khám phá** trong thư viện, tránh hai trang chủ cạnh tranh nhau. Không xóa bookmark hoặc các URL cũ; redirect có kiểm soát.

Điều hướng chính rút thành 5 mục:

1. **Học hôm nay**: tiếp tục bài dở, bài kế tiếp và ôn đến hạn trong một kế hoạch.
2. **Lộ trình**: mục tiêu, chương đang học, vị trí hiện tại, bài kế tiếp.
3. **Thư viện**: bộ từ, bài nghe có sẵn, học liệu cá nhân; cùng cấu trúc tìm kiếm/lọc.
4. **Luyện tập**: chọn kỹ năng/chế độ tự do; có mặc định “Luyện nội dung vừa học”.
5. **Tiến độ**: lịch sử toàn hệ thống, từ đang học, việc cần ôn, bằng chứng kỹ năng.

Ôn từ và Sổ lỗi là hai tab/nhóm trong khu Ôn tập, có badge và đường mở trực tiếp. Tạo nội dung nằm trong nút Thêm ở thư viện; Cài đặt/Lớp học ở menu tài khoản. Các engine và route cũ vẫn dùng được, không xây lại toàn bộ.

### Phiên học được dẫn dắt

Ví dụ một ngày 20–30 phút: ôn ngắn → 5–8 từ/cụm liên quan → nghe đoạn ngắn → một điểm ngữ pháp trong chính đoạn đó → nói hoặc viết ngắn → tổng kết và lịch quay lại. Đây là cấu hình thiết kế ban đầu, cần thử với người học, không phải quy tắc đã được kiểm định cho mọi người.

Không bắt người học đi qua mọi phương pháp mỗi ngày. Bộ điều phối chọn phần phù hợp với thời gian và bài đang học. Shadowing, chép chính tả, dịch Việt→Anh là bài bổ trợ đúng lúc; không bắt học viên tự chọn giữa hàng chục phương pháp ngay đầu buổi.

Một bài kết thúc phải trả lời: đã làm gì, chỗ nào cần ôn, lần sau học gì. Có một CTA chính **Tiếp tục bài kế tiếp** hoặc **Xong buổi hôm nay**. Bài mở rộng và AI là lựa chọn phụ.

## 5. Thiết kế BE cần thay đổi

### BE-A — Tách luyện trong buổi và ôn trí nhớ dài hạn

- Phân biệt `practice_attempt` và `retention_review`; vẫn lưu đầy đủ từng câu trả lời.
- Luyện lại cùng từ trong một buổi vẫn tăng bằng chứng luyện tập, không liên tục nhân interval SRS. Lần sai vẫn có thể đưa vào hàng cần học lại sớm.
- Review hợp lệ cần quy tắc thời gian và ngữ cảnh rõ, ví dụ đã đến hạn hoặc một lần đánh giá nhớ hợp lệ trong ngày; chốt chính sách rồi kiểm thử cùng timezone, học offline/gửi lại, tab song song.
- Không dùng “Đã thuộc” chỉ vì đạt 3 câu đúng. UI phân biệt **Đã luyện**, **Đang củng cố**, **Nhớ qua các lần ôn**. Không suy ra năng lực CEFR từ số lượt này.
- Đổi thuật toán có version; giữ lịch sử và không reset tiến độ cũ. Migration phải định nghĩa cách giữ/chuyển trạng thái đã có.

### BE-B — Thống nhất hoạt động, giữ riêng loại bằng chứng

- Thêm lớp tổng hợp hoạt động cho study, bài lộ trình, nghe, học liệu cá nhân, lỗi và AI. Có thể bắt đầu bằng adapter đọc các bảng hiện có, chưa cần thay mọi engine.
- Mỗi hoạt động có nguồn, ID nguồn, người học, thời điểm, trạng thái, nội dung và loại bằng chứng. Nếu ghi event mới, unique theo nguồn+ID+loại event để không đếm lại khi retry/backfill.
- Ngày đã học tính trên hoạt động đủ điều kiện toàn hệ thống. Tổng từ đã luyện khác số từ đang SRS; không đếm lặp từ trong nhiều phiên thành nhiều từ mới.
- Kỹ năng vẫn giữ ranh giới: tự luyện nói, nói có transcript, đánh giá audio, viết được chấm. Không biến tổng số hoạt động thành điểm phát âm hoặc mức thành thạo giả.
- Một API overview thống nhất trả CTA chính, bài dở, ôn cần làm và chỉ số. Tránh FE tự chọn các bản fallback không cùng định nghĩa.

### BE-C — Kế hoạch thực sự theo thời gian

- Lưu `plan_revision`, lý do chọn từng nhiệm vụ, thời gian dự kiến và khả năng chia nhỏ bài.
- Có thể thay quỹ thời gian còn lại trong ngày với thao tác rõ **Điều chỉnh hôm nay**, giữ nguyên các bước đã hoàn thành. Chỉnh hồ sơ thường xuyên vẫn có thể áp dụng từ ngày sau.
- Lọc nội dung đủ điều kiện, giữ thứ tự kiến thức cần trước; khi không đủ thời gian, chia bài thay vì giao nguyên bài dài hơn quỹ thời gian.
- Cần nhận biết ôn từ và Sổ lỗi cùng hoạt động đang dở; không để planner chỉ điều phối V2 còn học từ là phần ngoài kế hoạch.
- Mở đầu chỉ cần mục tiêu, thời gian, tự đánh giá mức cơ bản; bài khảo sát ngắn có thể bổ sung. Chưa quảng bá “AI cá nhân hóa hoàn chỉnh” khi thực tế mới có focus general/system.

### BE-D — Học liệu sẵn có trước, AI bổ sung sau

- Chọn một khóa nền tảng đủ chất lượng trước khi mở rộng toàn bộ 8.000+ từ. Mỗi mục được xuất bản cho khóa cần nghĩa, từ loại/IPA phù hợp, câu ví dụ, dịch và ngữ cảnh nhất quán.
- Khai báo `readiness`/`missing_fields` và `supported_modes` cho từng bộ. Không đưa người học vào màn trống rồi mới nói thiếu ví dụ/dịch.
- Tách lõi bắt buộc và bước mở rộng AI; hoàn thành lõi không yêu cầu khóa AI. Bài nói/viết tự luyện có hướng dẫn và đáp án/rubric mẫu, ghi đúng loại bằng chứng.
- AI chỉ gọi khi người dùng chủ động cần, lưu kết quả, chống nhấp trùng, có báo lỗi và thử lại. Học thường ngày vẫn hoạt động khi provider hết quota.

## 6. Bàn giao FE cho Anti

Đây là đề xuất cần triển khai theo từng mốc, chưa được coi là đã hoàn tất.

- Hôm nay: một hero nhỏ chứa bài hiện tại và CTA chính. Thời gian dùng chữ **Thời gian học**; ẩn thuật ngữ V2/contract/scope khỏi sản phẩm. Không lặp resume banner với thẻ nhiệm vụ cùng một bài.
- Bộ từ: giữ flashcard/engine hiện tại. Phân biệt rõ **Học từ** với **Bài học theo ngữ cảnh**; tối đa 3 hành động đầu, các cách luyện còn lại trong menu **Luyện thêm**. Đừng gắn “Đề xuất” cho một luồng luôn cần AI khi người học chưa cấu hình.
- Danh sách: tìm kiếm, lọc trình độ/chủ đề, đang học lên đầu, phân trang hoặc Tải thêm; trạng thái rỗng/lỗi khác nhau. Không render 100 card thành một trang dài.
- Bài học: khung hẹp dễ đọc; tiêu đề và audio xếp dọc ở mobile. Một CTA chính, vị trí ổn định; khung đáp án, ví dụ, bản dịch dùng một component chung.
- Back: truyền `from` xuyên suốt mọi luồng; tải lại không mất bộ lọc/chương/bài. Chưa có nguồn thì dùng trang cha an toàn. Giữ cấu trúc trang con Luyện tập vừa làm.
- Tiến độ: mở đầu bằng “Bạn đã học gì / tiếp theo cần gì”; biểu đồ kỹ thuật và chi tiết bằng chứng ở phần mở rộng.
- Mobile: kiểm tra 360/390/768px, chữ dài tiếng Việt, bàn phím mở, dialog, font tải lỗi, text zoom. Nút nổi Tra từ phải tránh CTA/nội dung hoặc chuyển thành công cụ trong thanh bài học.
- Mọi nút icon có accessible name, trạng thái focus rõ, card dùng link/button thật. Tìm kiếm một chỗ; màu và khoảng cách theo token chung, không thêm banner quảng bá chen giữa nhiệm vụ.

## 7. Chia việc thành ba mốc

| Mốc | Codex/BE | Anti/FE | Điều kiện nghiệm thu |
|---|---|---|---|
| 1. Sửa độ tin cậy | Quy tắc SRS chống tăng interval liên tục; overview hoạt động xuyên engine; readiness nội dung | Nhãn tiến độ đúng phạm vi, xử lý thiếu nội dung/AI; sửa bài học mobile, title/icon/back | 3 lần luyện ngay không thành nhớ dài hạn; học từ xuất hiện trong lịch sử; 15 phút không nhận bài 20 phút chưa chia; bài không AI vẫn hoàn thành lõi |
| 2. Một hành trình rõ | Điều phối kế hoạch/bài dở/CTA tiếp theo; revision khi điều chỉnh hôm nay | Hôm nay làm cửa vào, sidebar gọn, bộ từ giữ engine tốt, danh sách tìm/lọc/tải thêm | Người mới vào học được mà không cần hiểu thuật toán hoặc chọn phương pháp; thoát/reload/quay lại đúng chỗ |
| 3. Chất lượng trước mở rộng | Chuẩn hóa khóa nền tảng; dữ liệu ví dụ/dịch; checkpoint và thống kê bằng chứng | Runner/các trạng thái dùng component chung; chốt responsive và hiệu năng | 5–10 người học thử nhiệm vụ thật, ghi chỗ mắc, sửa rồi mới quảng bá rộng |

Không nên tiếp tục thêm một loạt tính năng trước mốc 1–2. Chưa chốt ngày hoàn thành hoặc chi phí token khi chưa thống nhất phạm vi triển khai.

## 8. Các ca phải thử khi triển khai

1. Người mới chưa có từ/AI: bắt đầu bài phù hợp và xong lõi, không bị buộc thiết lập API.
2. Người đang học từ: học tiếp đúng bộ, không trở về bộ mặc định; lịch sử và ngày học đều có ghi nhận.
3. Cùng từ đúng 3 lần trong 1 phút và ôn đúng qua nhiều ngày: hai kết quả trí nhớ phải khác nhau.
4. Học sai, xem gợi ý/đáp án rồi làm đúng: không coi là đúng độc lập.
5. Đổi thời gian hoặc mục tiêu giữa ngày: hiển thị rõ điều gì thay đổi; không mất kết quả đã học.
6. Thiếu ví dụ/dịch, provider 429/503, mất mạng lúc nộp: có đường tiếp tục/khôi phục và không tạo kết quả giả.
7. Reload, browser Back/Forward, mở link trực tiếp, hai tab cùng phiên: không nhân kết quả và không mất nơi học.
8. Điện thoại và bàn phím: đọc được tiêu đề/câu hỏi/CTA, tra từ không che đáp án, thao tác không phụ thuộc chuột.

Nên thử cho người dùng một nhiệm vụ cụ thể: “Bạn có 15 phút, hãy học buổi đầu và chỉ ra ngày mai học gì.” Quan sát họ tự làm, đo tỷ lệ hoàn tất và số lần phải hỏi, thay vì chỉ hỏi giao diện có đẹp không.
