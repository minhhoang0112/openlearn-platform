# Chốt tạm bản cá nhân — 21/10/2026

> 24/10/2026: đã mở lại CLARITY-01 vì phát hiện lỗi SRS và điều hướng chưa nằm trong nghiệm thu này. Xem BE-NEXT.md / LEARNING-CLARITY-ANTI.md; không dùng kết luận lịch sử bên dưới để xác nhận FE hiện tại đã hoàn tất.

Phạm vi: bản local, contract1.15.0/schema14/148 route. Dừng thêm tính năng; chỉ nhận lỗi cản trở học hoặc mất dữ liệu. Chưa phải chứng nhận sẵn sàng bán/phục vụ công khai.

## Lỗi đã sửa khi nghiệm thu

1. **Trắng trang sau nộp bài đọc hiểu:** POST submit trả kết quả nhưng thiếu questions, FE gọi filter trên undefined. BE trả cùng dữ liệu câu hỏi/feedback như GET questions, giữ tương thích các trường cũ. Có regression test cho submit/replay và Chrome nộp bài thật bằng fixture.
2. **Reload bài đọc đã hoàn thành tự tạo bài mới:** resume nay trả phiên đọc mới nhất kể cả đã hoàn thành, không tự gọi AI thêm. Nút tạo bài mới vẫn gửi resume:false. Ngữ pháp giữ quy tắc resume cũ. Có regression test cho ID phiên được giữ nguyên.
3. Cập nhật hai script kiểm thử cũ theo radio/nút/lịch sử và cách nộp đọc hiểu toàn trang hiện tại. Không sửa src/ hoặc giao diện Anti trong lượt này.

## Bằng chứng

- Build TypeScript/Vite đạt; còn cảnh báo bundle lớn, không phải lỗi chặn chạy.
- Toàn bộ94 test BE đạt sau sửa, gồm auth/ownership, lưu DB, SRS, grading, AI failure handling và học liệu.
- FE3000 và health4000 trả200, schema14.
- Kiểm Chrome dùng dist mới, DB tạm và provider giả lập hoặc không AI; xem release-browser-validation.json và báo cáo từng bộ. Đây không phải đánh giá chất lượng Gemini thật.
- Đã sao lưu SQLite bằng native backup: server/data/release-1.15-1792601016537.sqlite. File nằm riêng trên máy, không đưa vào ZIP bàn giao. Nếu cần khôi phục, dừng server trước và giữ cả dữ liệu hiện tại để tránh mất bài học mới.

## Giới hạn còn lại

- AI thật vẫn phụ thuộc key/quota/tình trạng nhà cung cấp; chưa gọi lại Gemini trong lượt nghiệm thu. Các chức năng không cần AI vẫn dùng được.
- Micro/loa vật lý và chất lượng phát âm, nội dung/audio giáo trình vẫn cần người học dùng thử. Test giả lập không xác nhận độ chuẩn bằng tai.
- Chưa nghiệm thu mọi tình huống nhiều tab, mọi codec/file MP3 hoặc sử dụng dài ngày. Phần trăm vị trí audio không phải điểm thành thạo.
- Video, mở rộng giáo trình, cá nhân hóa nhiều người và tối ưu bundle để sau. Không thêm vào danh sách phải làm để chốt đợt này.

## Chạy và phối hợp

Chạy run.bat, giữ cửa sổ server mở. Khi app đã chạy thì mở http://127.0.0.1:3000, không mở thêm run.bat giành cùng cổng. Node24.15 trở lên.

Anti không tiếp tục mở hạng mục mới. Nếu cần cập nhật STATUS, đọc bản mới trên đĩa và chỉ thêm dòng chốt FE; không Overwrite buffer cũ. BE-NEXT/BE-WORKLOG do Codex quản lý.
