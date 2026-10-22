# Cấu hình AI trên BE

Ngày 21/10/2026: key đã cấu hình trong `.env` BE. Model hiện tại **`gemini-3.5-flash`** đã kiểm tra HTTP 200, lời mở đầu/gợi ý/dịch hội thoại và gợi ý Speaking gọi thật thành công. Xem [kết nối hiện tại](current-ai-connection.json), [luồng AI thật](live-functional-validation.json) và [bàn giao mới nhất](ANTI-BE-HANDOFF.md). Báo cáo sáu tác vụ trong live-ai-validation.json là kiểm tra model 3.8 ở lượt trước, không thay cho trạng thái model hiện tại.

FE không cần nhập lại key khi dùng cấu hình chung này. Khi chuyển máy, tạo `.env` từ `.env.example`:

```dotenv
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-3.5-flash
GEMINI_API_KEY=YOUR_OWN_KEY
```

Khởi động lại BE sau khi đổi `.env`. Không thêm tiền tố `VITE_` vào key. Không đưa key vào mã nguồn, tài liệu, browser bundle hoặc response API.

Launcher dùng `node --use-env-proxy` để fetch Gemini đi qua HTTP(S)_PROXY khi có. BE phát triển có watch để nạp thay đổi logic. Lỗi 429 khoảng bốn giờ ở lượt trước thuộc model 3.8, không phải kết quả hiện tại của 3.5. Khi có lỗi mới, đọc đúng code/model/retry từ response, không ghi cứng thông báo “hết lượt”. Không tự chuyển sang dịch vụ trả phí.

`GET /api/v1/capabilities` báo `ai.configured: true` khi đã có cấu hình. `POST /api/v1/settings/ai/test` với body `{}` kiểm tra bằng một yêu cầu thật. Trang Cài đặt AI có thể lưu cấu hình riêng từng tài khoản trên BE; key riêng ưu tiên key chung. GET chỉ trả trạng thái, không trả bí mật.

Gemini tạo nội dung mới cho ứng dụng; không tái tạo nội dung premium chưa nhìn thấy. Speaking qua transcript sửa ngữ pháp/từ vựng; nhận xét phát âm dùng bản ghi âm gửi tới Gemini. Không suy ra điểm phát âm từ văn bản. Kiểm thử audio hiện dùng giọng tổng hợp, chưa phải đánh giá chất lượng giọng người dùng.

Quá tải upstream: BE thử lại tối đa ba lần với HTTP 500/502/503; 503 cuối trả `AI_PROVIDER_BUSY`. Hết hạn mức trả `AI_RATE_LIMITED`; không tự đổi sang model trả phí. Hạn mức API của nhà cung cấp không phải gói Pro của ứng dụng này.

Ollama có adapter dùng `http://127.0.0.1:11434`, mặc định `qwen3:8b`, nhưng chưa được cài/chạy trên máy và không hỗ trợ đường audio hiện tại. Gateway riêng cấu hình bằng `AI_PROVIDER=gateway`, `AI_SERVICE_URL`, `AI_SERVICE_KEY` theo API-CONTRACT.

Nguồn cấu hình chính thức: [Gemini API key](https://ai.google.dev/gemini-api/docs/api-key), [generateContent](https://ai.google.dev/api/generate-content), [audio](https://ai.google.dev/gemini-api/docs/audio), [hạn mức và giá](https://ai.google.dev/gemini-api/docs/pricing). Kiểm tra giá/hạn mức của chính dự án trước khi đổi model hoặc bật billing.
