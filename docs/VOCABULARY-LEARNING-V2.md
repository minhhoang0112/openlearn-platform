# Hàng đợi học từ vựng theo chặng — 02/11/2026

> Chấm nghĩa đã nới theo quy tắc rõ ràng: đảo nghĩa hợp lệ vẫn đúng; thiếu dấu Việt được chấp nhận với feedback vàng; typo khả nghi chưa được tính đúng. Đọc [VOCABULARY-GRADING.md](VOCABULARY-GRADING.md). 152 ca BE, 5 nhóm Chrome chấm nghĩa và build đạt.

## Đối chiếu nguồn và giới hạn

Đã mở `https://openquiz.ai/study-set/163` bằng REA: thẻ đầu vẫn là **apply**, danh sách theo thứ tự gốc, có nút xáo trộn riêng. Đây là màn xem thẻ, không phải bằng chứng engine học luôn hỏi apply trước. Evidence `ev_c4e0fe661bd3fe96d4fb9cb7a00dcc7175f189f3c2b3ee5ab1adacfa9ac1ecc4`.

Bấm Learn trong trình duyệt tạm gặp yêu cầu đăng nhập. Chưa quan sát phiên học được đăng nhập trong đợt này. Evidence `ev_ec7d852ef37653008e5cf7761b351ed87f2edca054a2bcb1ac4539509e944a45`.

Đã đọc các module JavaScript công khai được bundle trang tham chiếu: `Study-5PyHAcGP.js`, `studyAlgorithm-BGR1FvkZ.js`, `useStudySettings-DJna-hCs.js`, FillInQuestion, MultipleChoiceQuestion, FlipCard. REA phân tích bản tải về như văn bản tĩnh, không thực thi: parent `ev_862aeed07d9039d02661678b4a4ebe7f5f27e62c6edc20225cf1f9ba01b72a16`, summary `ev_7706f35706f99e0c49cbb9085e4f5cf553a823c90d56a8ce07bf21ac191bd68a`. Phần graph bundle lớn có giới hạn tài nguyên; không suy ra BE độc quyền, lịch SRS hoặc tương đương 100% từ kết quả tĩnh. Danh tính/hashes nằm trong `vocabulary-source-evidence.json`; các bundle chỉ để ở .tmp, không đưa mã nguồn bên thứ ba vào sản phẩm.

Các hành vi xác minh trong mã client: chia chặng 4/5/7 từ tùy tỷ lệ đã thuộc; xáo từ và chọn loại câu ngẫu nhiên; trộn từ mới với từ đã gặp; cập nhật trạng thái từng từ sau đúng/sai; từ đạt mục tiêu được loại khỏi phần hàng đợi tiếp theo; tạo lại phần chưa làm sau chặng; lưu phiên để tiếp tục. Mặc định desktop hỏi nghĩa để trả lời term, cho điền từ và trắc nghiệm, bật chấp nhận đồng nghĩa; thứ tự gốc là tùy chọn.

## Phần đã triển khai

`server/vocabulary-learning.mjs` là triển khai độc lập theo hành vi trên. `server/study.mjs` giữ quyền truy cập, đáp án/chấm, lưu SQLite và idempotency ở BE.

- Màn Học gửi `learning_engine: "segmented_v2"`, `adaptive: true`. Từ mới: đúng lần đầu thành đang học; đúng tiếp thành đã thuộc/đạt mục tiêu phiên. Đang học mà sai trở lại chưa thuộc; phải luyện lại. Từ vốn đã thuộc mà sai trở lại đang học; đúng một lần khôi phục mục tiêu. Không mặc định đòi hai lần đúng riêng từng chiều; khi chọn cả hai chiều, chiều hỏi được chọn mỗi lượt.
- Mặc định xáo trộn và phối hợp điền từ/trắc nghiệm. Mỗi chặng không chứa một từ hai lần. Phần chưa làm được dựng lại tại ranh giới chặng, bỏ từ đã đạt mục tiêu và giữ từ còn yếu/chưa gặp. Câu đã chấm giữ nguyên id/nội dung/lịch sử.
- Bộ 12 từ mới có 20 lượt được dự kiến ban đầu, không có nghĩa chỉ cần 20 lượt để thuộc. Khi đúng hết, cần 24 lượt để mỗi từ mới được truy hồi đúng hai lần; số lượt dự kiến điều chỉnh theo câu trả lời. Không dừng vì chạm trần ba lượt khi vẫn chưa đạt mục tiêu.
- Trạng thái đã thuộc dùng cho bộ đếm/lọc từ được lưu. Lịch ôn SRS vẫn dùng scheduler riêng: trả lời liên tục trước hạn không nhân số lần ôn cách quãng hay tăng lịch lên 6 ngày một cách giả tạo. Đạt mục tiêu trong phiên không bảo đảm nhớ vĩnh viễn; từ vẫn quay lại khi tới hạn hoặc khi chủ động học cả bộ.
- Mở lại phiên V2 đang dở giữ đúng hàng đợi/câu hiện tại. Không xáo lại chỉ vì reload. Phiên V1 cũ vẫn tồn tại trong lịch sử; lần vào màn Học chuyển sang phiên V2 mới mà không xóa word_progress.
- Tự sửa câu đúng thành sai thu hồi thưởng của đúng lượt đó, phục hồi SRS snapshot rồi áp sai, cập nhật trạng thái học và mở lại hàng đợi nếu cần. Gửi lại không tạo thêm lượt/điểm.
- Bộ chỉ có một từ hoặc đáp án không có nhiễu hợp lệ chuyển câu trắc nghiệm sang nhập chữ thay vì tạo lỗi hay lựa chọn trùng.

Màn viết từ/trắc nghiệm riêng/nghe chép vẫn là bài một lượt, không tuyên bố dùng engine chặng mới. Feedback sai ở các màn đó nói đã cập nhật lịch ôn, không hứa có retry trong chính phiên. Luồng Kết hợp và giáo trình có điều phối riêng, chưa được chứng minh giống 100% web gốc trong đợt này.

## FE và âm thanh

- Bỏ mic nhận giọng nói trong ô nhập đáp án và tùy chọn trả lời bằng giọng nói tại cài đặt Học. Speaking/Giao tiếp AI vẫn là các chức năng riêng.
- Thẻ từ tự đọc khi vào/đổi thẻ, mặc định bật, có công tắc lưu theo tài khoản trên trình duyệt. Giữ thứ tự gốc và nút xáo thẻ như nguồn.
- Câu hỏi có hiện từ Anh: tự đọc khi mở câu. Câu hỏi nghĩa Việt yêu cầu nhập từ Anh: tự đọc sau khi chấm, tránh phát luôn đáp án trước khi người học nhớ lại. Ctrl đơn và nút loa vẫn dùng để nghe lại; Ctrl+A/C/V giữ hành vi chuẩn.
- Giọng đọc dùng TTS trình duyệt, không gọi AI tạo ví dụ hay gọi API giọng nói mỗi thẻ. Trình duyệt có thể yêu cầu tương tác trước khi phát; không bảo đảm đã nghiệm thu loa vật lý chỉ từ spy.
- Nhãn tiến độ nói **Đạt mục tiêu phiên**, tránh đồng nhất số lượt đúng với số từ nhớ lâu.

## Tương thích và kiểm chứng

Không đổi SQLite schema hay reset dữ liệu. API không truyền learning_engine giữ `legacy_v1` cho các consumer cũ; `/study/options?mode=learn` đề xuất V2, FE gửi rõ engine. `max_attempts` chỉ áp cho V1. Các phiên có state.vocabulary mới dùng tiến độ theo chặng; các phiên cũ giữ cách đọc/chấm trước đó.

145 ca BE toàn bộ đạt. Bốn ca mới bao gồm: 12 từ/20 lượt dự kiến/24 lượt đúng, loại từ đã đạt mục tiêu, resume/idempotency, không tăng lịch SRS khi luyện sớm, sai/tự sửa/mở lại phiên, từ từng học, xáo trộn và bộ một từ. Chrome 8 nhóm đạt, xác nhận vòng học thực tế tới hoàn thành, progress BE, tự đọc/không lộ đáp án, không mở mic, cài đặt, resume, Ctrl và nghe chép câu. Build TypeScript/Vite đạt, còn cảnh báo bundle trên 500 KB.

Chạy lại: `node --test --test-isolation=none server/tests/vocabulary-learning.test.mjs` và `node scripts/study-browser-qa.mjs` sau build. Báo cáo Chrome: `study-browser-qa.json`.
