# Khóa từ vựng System & Network

360 mục từ / cụm thông báo khác nhau, chia 24 bộ × 15 thẻ. Nội dung Anh–Việt được soạn sẵn trong `server/content/system-network-vocabulary.json`; không gọi AI để tạo thẻ hay ví dụ, không có ảnh hoặc tệp audio bổ sung. Nút nghe dùng cơ chế phát âm của web.

## Thứ tự học

1. Nền tảng hệ thống máy tính.
2. Phần cứng, bộ nhớ và ổ đĩa.
3. Hệ điều hành và khởi động.
4. Tệp, thư mục và đường dẫn.
5. Tài khoản và quyền truy cập.
6. Cài đặt, cập nhật và phụ thuộc.
7. Terminal và câu lệnh.
8. Tiến trình, dịch vụ và tác vụ.
9. Nền tảng mạng và thiết bị mạng.
10. Địa chỉ IP và phân chia mạng.
11. DNS, DHCP và định tuyến.
12. Wi-Fi và trạng thái kết nối.
13. Giao thức, cổng và truyền dữ liệu.
14. Lỗi kết nối thường gặp.
15. Web, HTTP và mã trạng thái.
16. Bảo mật, tường lửa và truy cập từ xa.
17. Thông báo lỗi Linux và dòng lệnh.
18. Lỗi Windows và ứng dụng.
19. Nhật ký, giám sát và hiệu năng.
20. Sao lưu, khôi phục và tính toàn vẹn.
21. Máy ảo, đám mây và container.
22. Cơ sở dữ liệu và lỗi dữ liệu.
23. Triển khai và lỗi ứng dụng web.
24. Chẩn đoán sự cố và trao đổi hỗ trợ.

Đọc theo thứ tự nếu mới bắt đầu, hoặc chọn bộ lỗi đang gặp. Đây là khóa từ vựng đọc hiểu kỹ thuật, không phải hướng dẫn thực thi lệnh hay khóa chứng chỉ mạng. Các ví dụ mô tả ngữ cảnh, không yêu cầu người học thay đổi máy tính.

## Nạp dữ liệu và phát triển tiếp

Bộ chính **System & Network** thuộc tài khoản cá nhân, nằm ở **Thư viện → Bộ thẻ đã tạo** và tính là một mục trong danh sách. Bấm vào bộ chính mới thấy 24 bộ con; các bộ con không lặp lại ở danh sách ngoài. Các bộ thẻ độc lập khác vẫn hiện bình thường. Giao diện gọi đây là bộ thẻ theo chủ đề, không phải lộ trình học. Cấu trúc lưu trữ dùng lại quan hệ `learning_paths` / `path_sets` và API hiện có, không đổi ID hay tiến độ. Không có thẻ quảng bá riêng trên trang chủ. Nội dung private chỉ hiện với chủ tài khoản.

Trên máy mới, tạo tài khoản trước rồi lấy ID của chính tài khoản đó từ `/api/v1/me` khi đã đăng nhập. Chạy:

```sh
npm run course:system-network -- --user-id <ID tài khoản>
```

Không tự thêm khóa vào mọi tài khoản khi khởi động. Công cụ `--move-public` chỉ phục vụ chuyển bản public đã tạo trước đó sang tài khoản được chỉ định, giữ nguyên ID và tiến độ.

Mỗi hàng JSON gồm `[từ, nghĩa tiếng Việt, ví dụ tiếng Anh, bản dịch ví dụ]`. Bộ thẻ có `key` ổn định; giữ key khi sửa tiêu đề. Chạy lại công cụ khi nội dung JSON đổi sẽ cập nhật theo từ và giữ ID / tiến độ / ghi chú cá nhân. Không tự xóa thẻ cũ đã có lịch sử; việc đổi hẳn từ được xem là thêm một thẻ mới. Khi JSON không đổi, chạy lại không ghi đè chỉnh sửa riêng trên web. Bản dịch ví dụ soạn sẵn chỉ áp dụng khi câu ví dụ gốc khớp chính xác.

Kiểm thử: `node --test server/tests/system-network-vocabulary.test.mjs`.
