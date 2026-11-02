# Từ điển Anh–Việt nội bộ dạng chữ

Đã tải và nhập ngày 02/11/2026 từ Vietnamese Wiktionary qua Kaikki/Wiktextract. Kho này dùng chung cho popup đồng nghĩa (`GET /dictionary/entry`) và cửa sổ Tra từ (`POST /dictionary/translate`). Không dùng Gemini để tra các mục đã có.

## Dung lượng đã đo

- 119.032 khóa mục từ đã chuẩn hóa; 190.480 nghĩa; 17.999 ánh xạ dạng biến đổi.
- SQLite: **38.522.880 byte**, khoảng **38,5 MB / 36,7 MiB**.
- Dữ liệu chữ JSONL truyền về khi nhập: 114.884.234 byte. Nhập theo luồng, không giữ thêm bản JSONL đầy đủ trên ổ đĩa.
- Không tải hình, file audio, video hoặc URL phương tiện trong dữ liệu. Chỉ giữ từ, nghĩa, từ loại, cách phát âm dạng chữ, ví dụ/bản dịch nếu có, và liên kết ghi nguồn.
- Phiên bản nguồn SHA-256: `90f2b8e3f6deac2546be95e6f7353db02866457bcb19b267b8fd123e480247d3`.

## Cách tra

Giữ các nghĩa thuộc bộ từ mà người dùng có quyền truy cập và lớp từ chuẩn bị sẵn; bổ sung các nghĩa từ SQLite riêng. Không đưa bộ từ riêng tư của tài khoản khác vào kết quả. Nguồn dữ liệu công khai dùng chung, không trộn với lịch sử học.

Tra đúng khóa chuẩn hóa trước, không dùng substring làm nghĩa. Chỉ khi không có mục chính xác mới tìm các dạng biến đổi được nguồn khai báo; trả `matched_term`/`lookup_kind` để UI nói rõ đang tra từ gốc. Không tự đoán bằng cách cắt đuôi từ. Nếu vẫn thiếu, cửa sổ Tra từ giữ đường dịch MyMemory sẵn có; popup nội bộ không tự phát sinh yêu cầu dịch bên ngoài.

Dữ liệu cộng đồng có thể có nghĩa cũ, nghĩa ít dùng hoặc mục tham chiếu. Không bảo đảm chứa mọi từ hay mọi nghĩa theo ngữ cảnh. Lớp nghĩa biên soạn sẵn có thể ưu tiên nghĩa phù hợp cho người mới, ví dụ **intern → thực tập sinh; người thực tập**. Không biến bản dịch máy thành mục chuẩn mà không ghi nguồn.

SQLite được mở read-only, dùng chỉ mục exact/form; không nạp toàn bộ dữ liệu vào RAM hay gửi cả kho xuống trình duyệt. Popup cache tối đa 300 kết quả trong 10 phút theo tài khoản/từ/từ loại; không lưu cache âm cho từ thiếu. Phản hồi cũ không được ghi đè từ vừa chọn khác.

## Cài đặt trên máy mới hoặc cập nhật

```powershell
npm run dictionary:import
npm run dev:all
```

Không cần key API. Lần đầu cần Internet để tải JSONL. Script chỉ gửi yêu cầu tải bộ công khai, không gửi nội dung học hay thông tin cá nhân.

Kho ở `server/data/dictionaries/`, được gitignore. Giữ file SQLite tên theo hash nguồn và `manifest.json` chỉ tới phiên bản đã kiểm tra. Tải/nhập lỗi không thay manifest cũ. Các phiên bản nguồn mới có tên khác, nên server đang chạy vẫn đọc được bản cũ; khởi động lại BE để nhận phiên bản mới. Bản cũ không tự bị xóa. Tải lại đúng cùng hash không tạo thêm một bản SQLite.

Không tải tự động ở mỗi lần khởi động. Khi clone repo chưa nhập kho, web vẫn dùng lớp từ nhỏ và đường dịch trực tuyến. Không đổi schema database người học, không reset tiến độ. Cần mang theo kho dữ liệu này hoặc chạy lệnh nhập khi deploy lên máy chủ khác.

## Kiểm chứng

- 147 ca BE toàn bộ đạt; có test importer, exact/form, không lưu phương tiện, quyền dữ liệu và hai API tra offline.
- Chrome: 5 nhóm đạt với kho đã nhập thật: popup intern, popup seek có nguồn, tail không bị thay thành detail, lưu thẻ giữ ghi công/giấy phép, nghĩa dài xuống dòng ở màn hẹp. Không có yêu cầu HTTPS ra bên ngoài trong lần thử.
- Build TypeScript/Vite đạt; cảnh báo bundle lớn hiện có vẫn còn.
- Báo cáo: `dictionary-browser-validation.json`, `dictionary-import-validation.json`.

Nguồn: [Kaikki — English entries from Vietnamese Wiktionary](https://kaikki.org/viwiktionary/Ti%E1%BA%BFng%20Anh/). Điều kiện sử dụng: [DICTIONARY-DATA-NOTICE.md](DICTIONARY-DATA-NOTICE.md).
