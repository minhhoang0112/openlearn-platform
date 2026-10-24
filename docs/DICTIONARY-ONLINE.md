# DICT-01 — Tra từ và dịch trực tuyến Anh ↔ Việt

24/10/2026. Contract1.18.0/schema14/152route. Sửa trực tiếp BE + utility FE/modal tối thiểu để người dùng dùng được, không đợi thiết kế lại. Anti giữ nguyên logic này khi chỉnh bố cục CLARITY-02.

## Lỗi gốc

src/utils/dictionary.ts từng lấy exact.length?exact:result.words từ tìm kiếm LIKE. Vì vậy tail có thể trả detail. Đây là lỗi định nghĩa sai, không phải thiếu một từ cụ thể. Utility nay chỉ gọi API dịch mới; không lấy kết quả gần giống để làm nghĩa. Từ/câu trả về luôn là đầu vào gốc đã trim/NFKC.

## API mới

POST `/api/v1/dictionary/translate` cookie/CSRF như cũ:

```json
{"q":"tail","source_lang":"en","target_lang":"vi"}
```

Hai ngôn ngữ en/vi, auto được hỗ trợ bằng gợi ý chiều dịch và dấu tiếng Việt, không phải hệ nhận diện ngôn ngữ đầy đủ; văn bản không dấu mơ hồ nên chọn chiều rõ. Cùng ngôn ngữ trả nguyên văn, không gọi dịch vụ.

Data tương thích DictionaryLookupResult: `{term,query,phonetic,sourceLang,targetLang,senses:[{pos,meaning,exampleEn?,exampleVi?}],relatedWords,isSentence,fullTranslation?,source,cached,external_request}`.

- EN→VI: ưu tiên **exact** local/prepared từ dictionaryEntryService; không so LIKE.
- Không có exact hoặc dịchVI→EN: gọi HTTPS endpoint GET chính thức của MyMemory. Không Gemini, không key trả phí, không gửi email/tài khoản/khóa người dùng. Chỉ gửi text đang tìm và chiều dịch. Không gọi endpoint đóng góp/set vào kho dịch.
- Source local_exact/mymemory/identity rõ ràng. Dịch tự động không có IPA/loại từ đáng tin thì để trống, FE ghi “Bản dịch”, không tự đặt noun. relatedWords rỗng nếu không có dữ liệu; không tự gán synonym.
- Nội dung thiếu trong bộ thẻ vẫn dịch được khi dịch vụ hoạt động. Đây là dịch máy từ/cụm/câu ngắn, không tương đương một từ điển đầy đủ mọi nghĩa hoặc chất lượng/khả năng không giới hạn của Google Translate.
- Ngoại tuyến/timeout503 TRANSLATION_UNAVAILABLE; hết quota429 TRANSLATION_RATE_LIMITED; JSON/bản dịch lỗi502; quá dài400 TRANSLATION_TEXT_TOO_LONG. Không lỗi nào được biến thành một từ gần giống hoặc bản dịch cache giả.

## Giới hạn thực và dữ liệu

MyMemory giới hạn mỗi segment500byte UTF-8. API kiểm trước gửi, không âm thầm cắt. User chia đoạn dài thành câu ngắn. Free anonymous có5000ký tự/ngày theo [tài liệu nhà cung cấp](https://mymemory.translated.net/doc/usagelimits.php); hạn mức này độc lập Gemini và không được hứa vô hạn. [API specification](https://mymemory.translated.net/doc/spec.php).

Cache in-memory tối đa500 kết quả,24h, key gồmuser+chiều+nguyên văn; restart server mất cache. Không DB migration. Request cùng key đang bay dùng chung promise, cache hit không tốn provider request hay app rate quota. Outbound mới giới hạn20request/phút/user. Không cache lỗi. Local nghĩa được đọc lại theo quyền/note hiện tại, không cache toàn hệ thống làm lộ note người khác.

## FE đã nối

- lookupDictionaryWord gọi POST route mới, bỏ hẳn fallback lấy từ giống gần.
- Modal có notice text sẽ gửi MyMemory khi chưa có dữ liệu local, ghi nguồn bản dịch, thông báo lỗi mạng/quota, không nói từ không tồn tại.
- Chống response cũ ghi đè khi tìm từ khác/đóng modal; nhập query mới xóa kết quả cũ.
- Lưu thẻ dùng chiều ngôn ngữ kết quả thực, không hardcode en→vi.

Anti nếu chỉnh synonym: click đọc đúng mục; có thể gọi dictionary entry để lấy chi tiết, nếu foundfalse thì dịch bằng API mới theo hành động user và ghi rõ “Bản dịch trực tuyến”. Không nối lại utility cũ hoặc dùng LIKE. Popup thiếu IPA/pos thì không bịa. Giao diện câu dài nên dùng layout bản dịch thay vì h1 từ đơn; đây là tinh chỉnh FE, không thay API.

## Kiểm thử

server/tests/dictionary-translation.test.mjs:5nhóm, bao gồm tail/detail, seek, chiềuVI→EN, cache/dedup, phân quyền/cache riêng, quota/lỗi/size/auto. scripts/verify-dictionary-browser.mjs:5ca Chrome mock provider +DB riêng,0pageerrors.

Thử live đúng1 từ công khai tail: MyMemory HTTP200 trả “đuôi, đoạn cuối”; không gửi văn bản riêng hay dùng Gemini. Các test còn lại dùng fixture, không khẳng định chất lượng mọi bản dịch thật.
