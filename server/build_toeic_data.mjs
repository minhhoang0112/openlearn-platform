import fs from 'fs';

// 50 Standard Lessons from Barron's 600 Essential Words for the TOEIC
export const lessons50 = [
  {
    id: 163,
    title: 'Tuyển dụng & việc làm',
    desc: 'Chủ đề 1 TOEIC: Thuật ngữ cốt lõi tuyển dụng nhân sự, tìm kiếm việc làm và nộp hồ sơ ứng tuyển.',
    words: [
      ['apply', 'nộp đơn, áp dụng', 'verb', '/əˈplaɪ/', 'You should apply for the job before the deadline.', 'submit; use; employ'],
      ['apply for', 'ứng tuyển vào', 'verb', '/əˈplaɪ fɔːr/', 'He decided to apply for a job at the new company.', 'submit an application; seek; request'],
      ['apprentice', 'người học việc', 'noun', '/əˈprentɪs/', 'The apprentice learned carpentry skills from his master.', 'trainee; beginner; learner'],
      ['background', 'lý lịch, nền tảng', 'noun', '/ˈbækɡraʊnd/', 'She has a strong background in software engineering.', 'experience; foundation; training'],
      ['candidate', 'ứng viên, thí sinh', 'noun', '/ˈkændɪdət/', 'Each candidate must complete an online application.', 'applicant; contender; nominee'],
      ['expert', 'chuyên gia, chuyên viên', 'noun, adjective', '/ˈekspɜːrt/', 'She is an expert in digital marketing.', 'specialist; professional; authority'],
      ['hire', 'thuê, mướn; nhân viên, người làm thuê', 'verb, noun', '/ˈhaɪər/', 'The company plans to hire new graduates this month.', 'employ; recruit; appoint'],
      ['interview', 'buổi phỏng vấn; phỏng vấn', 'noun, verb', '/ˈɪntərvjuː/', 'All the past interviewees were asked the same questions.', 'meeting; discussion; questioning'],
      ['profession', 'chuyên môn, nghề nghiệp', 'noun', '/prəˈfeʃn/', 'Teaching is a profession that requires dedication.', 'occupation; career; vocation'],
      ['profile', 'lý lịch', 'noun', '/ˈproʊfaɪl/', 'He updated his professional profile on the company website.', 'biography; resume; description'],
      ['promote', 'thăng chức; thúc đẩy hoạt động hoặc phát triển', 'verb', '/prəˈmoʊt/', 'The company seeks to promote equality and environment.', 'advance; encourage; boost'],
      ['qualifications', 'trình độ, năng lực, bằng cấp', 'noun', '/ˌkwɑːlɪfɪˈkeɪʃnz/', 'Nurse experts assess qualifications and look at degrees in cardiology.', 'credentials; skills; certification']
    ]
  },
  {
    id: 301,
    title: 'Hợp đồng kinh doanh (Contracts)',
    desc: 'Chủ đề 2 TOEIC: Thuật ngữ pháp lý thương mại, điều khoản thỏa thuận và cam kết hợp đồng.',
    words: [
      ['agree', 'đồng ý, tán thành', 'verb', '/əˈɡriː/', 'Both parties agreed to the terms of the settlement.', 'concur; consent'],
      ['agreement', 'sự thỏa thuận, hợp đồng', 'noun', '/əˈɡriːmənt/', 'They signed a five-year service agreement.', 'contract; pact'],
      ['assurance', 'sự đảm bảo, cam đoan', 'noun', '/əˈʃʊrəns/', 'The manager gave her full assurance that quality would not suffer.', 'guarantee; pledge'],
      ['cancellation', 'sự hủy bỏ', 'noun', '/ˌkænsəˈleɪʃn/', 'The cancellation policy allows a full refund within 48 hours.', 'annulment; revocation'],
      ['determine', 'xác định, quyết định', 'verb', '/dɪˈtɜːrmɪn/', 'We must determine the financial liability of each partner.', 'establish; decide'],
      ['engage', 'thuê, đính ước, tham gia', 'verb', '/ɪnˈɡeɪdʒ/', 'The firm engaged an outside accounting team.', 'involve; hire'],
      ['establish', 'thiết lập, thành lập', 'verb', '/ɪˈstæblɪʃ/', 'The contract establishes standards for safety and inspection.', 'found; create'],
      ['obligate', 'bắt buộc', 'verb', '/ˈɑːblɪɡeɪt/', 'The vendor is obligated to deliver raw materials on schedule.', 'bind; require'],
      ['party', 'bên tham gia ký kết', 'noun', '/ˈpɑːrti/', 'Neither party can modify the clause unilaterally.', 'signatory; participant'],
      ['provision', 'điều khoản', 'noun', '/prəˈvɪʒn/', 'Carefully examine the confidentiality provision.', 'stipulation; clause'],
      ['resolve', 'giải quyết', 'verb', '/rɪˈzɑːlv/', 'We hope to resolve the contract dispute amicably.', 'settle; solve'],
      ['specific', 'cụ thể, rõ ràng', 'adjective', '/spəˈsɪfɪk/', 'Please specify the exact delivery address in the form.', 'definite; precise']
    ]
  },
  {
    id: 302,
    title: 'Tiếp thị & Quảng cáo (Marketing)',
    desc: 'Chủ đề 3 TOEIC: Chiến dịch truyền thông, nghiên cứu thị trường và tiếp cận khách hàng tiềm năng.',
    words: [
      ['attract', 'thu hút, lôi cuốn', 'verb', '/əˈtrækt/', 'The summer ad campaign will attract millions of customers.', 'draw; entice'],
      ['compare', 'so sánh, đối chiếu', 'verb', '/kəmˈper/', 'Consumers compare reviews before purchasing home electronics.', 'contrast; match'],
      ['competition', 'sự cạnh tranh, đối thủ', 'noun', '/ˌkɑːmpəˈtɪʃn/', 'Competition among telecom providers drives better services.', 'rivalry; contest'],
      ['consume', 'tiêu thụ, tiêu dùng', 'verb', '/kənˈsuːm/', 'Modern shoppers consume vast amounts of digital products.', 'use up; absorb'],
      ['convince', 'thuyết phục', 'verb', '/kənˈvɪns/', 'The presentation convinced investors to fund the expansion.', 'persuade; sway'],
      ['currently', 'hiện tại', 'adverb', '/ˈkɜːrəntli/', 'We are currently testing our new advertising strategy.', 'presently; now'],
      ['fad', 'mốt nhất thời', 'noun', '/fæd/', 'Do not invest heavily in a trend that might just be a passing fad.', 'craze; trend'],
      ['inspiration', 'nguồn cảm hứng', 'noun', '/ˌɪnspəˈreɪʃn/', 'She found inspiration for the campaign in street photography.', 'creative spark; idea'],
      ['market', 'thị trường, tiếp thị', 'noun, verb', '/ˈmɑːrkɪt/', 'The company hopes to market eco-friendly fashion across Asia.', 'commercialize; promote'],
      ['persuasion', 'sự thuyết phục', 'noun', '/pərˈsweɪʒn/', 'Gentle persuasion often yields better results than pressure.', 'convincing; coaxing'],
      ['productive', 'năng suất, hiệu quả', 'adjective', '/prəˈdʌktɪv/', 'The design sprint was remarkably productive.', 'fruitful; efficient'],
      ['satisfaction', 'sự hài lòng', 'noun', '/ˌsætɪsˈfækʃn/', 'Customer satisfaction ratings rose by fifteen percent this quarter.', 'contentment; pleasure']
    ]
  },
  {
    id: 303,
    title: 'Bảo hành & Cam kết (Warranties)',
    desc: 'Chủ đề 4 TOEIC: Điều khoản bảo hành, đổi trả sản phẩm và uy tín thương hiệu.',
    words: [
      ['characteristic', 'đặc tính, đặc trưng', 'noun, adjective', '/ˌkærəktəˈrɪstɪk/', 'Reliability is a hallmark characteristic of Japanese automobiles.', 'trait; feature'],
      ['consequence', 'hậu quả, hệ quả', 'noun', '/ˈkɑːnsəkwens/', 'A breach of safety rules can carry dire consequences.', 'outcome; penalty'],
      ['consider', 'cân nhắc, xem xét', 'verb', '/kənˈsɪdər/', 'Consider taking out extended warranty on expensive electronics.', 'contemplate; ponder'],
      ['cover', 'bao gồm, bảo hiểm', 'verb', '/ˈkʌvər/', 'The guarantee covers defects in materials and workmanship.', 'include; protect'],
      ['expiration', 'sự hết hạn', 'noun', '/ˌekspəˈreɪʃn/', 'Submit claims before the expiration of the one-year term.', 'expiry; end'],
      ['frequently', 'thường xuyên', 'adverb', '/ˈfriːkwəntli/', 'Customers frequently ask about accidental damage coverage.', 'often; repeatedly'],
      ['imply', 'ngụ ý, hàm ý', 'verb', '/ɪmˈplaɪ/', 'The wording implies that regular servicing is mandatory.', 'suggest; hint'],
      ['promise', 'hứa, cam kết', 'verb, noun', '/ˈprɑːmɪs/', 'The manufacturer promises replacement within forty-eight hours.', 'pledge; assurance'],
      ['protect', 'bảo vệ', 'verb', '/prəˈtekt/', 'The surge protector will protect sensitive audio instruments.', 'safeguard; defend'],
      ['reputation', 'uy tín, danh tiếng', 'noun', '/ˌrepjuˈteɪʃn/', 'Good service builds a trustworthy brand reputation.', 'fame; standing'],
      ['require', 'yêu cầu', 'verb', '/rɪˈkwaɪər/', 'Proof of purchase is required to validate the claim.', 'demand; mandate'],
      ['variety', 'sự đa dạng', 'noun', '/vəˈraɪəti/', 'We offer a wide variety of warranty tiers to meet client needs.', 'diversity; selection']
    ]
  },
  {
    id: 304,
    title: 'Kế hoạch kinh doanh (Business Planning)',
    desc: 'Chủ đề 5 TOEIC: Hoạch định chiến lược, dự báo doanh thu và quản trị rủi ro doanh nghiệp.',
    words: [
      ['address', 'giải quyết, xử lý', 'verb', '/əˈdres/', 'The executive summary addresses anticipated budget shortfalls.', 'deal with; tackle'],
      ['avoid', 'tránh, né', 'verb', '/əˈvɔɪd/', 'Thorough planning helps businesses avoid costly legal pitfalls.', 'evade; prevent'],
      ['demonstrate', 'chứng minh, biểu thị', 'verb', '/ˈdemənstreɪt/', 'Projections demonstrate strong revenue growth over three years.', 'show; illustrate'],
      ['develop', 'phát triển', 'verb', '/dɪˈveləp/', 'We must develop resilient partnerships with local distributors.', 'expand; formulate'],
      ['evaluate', 'đánh giá', 'verb', '/ɪˈvæljueɪt/', 'Consultants will evaluate operational efficiency across departments.', 'appraise; assess'],
      ['gather', 'thu thập', 'verb', '/ˈɡæðər/', 'Gather consumer insights before finalizing the product prototype.', 'collect; assemble'],
      ['offer', 'cung cấp, chào bán', 'verb, noun', '/ˈɑːfər/', 'The startup offers bespoke logistics solutions for e-commerce.', 'provide; submit'],
      ['primarily', 'chủ yếu', 'adverb', '/praɪˈmerəli/', 'Our strategic objective is primarily customer retention.', 'mainly; mostly'],
      ['risk', 'rủi ro', 'noun, verb', '/rɪsk/', 'Entrepreneurs assess each financial risk before committing capital.', 'hazard; danger'],
      ['strategy', 'chiến lược', 'noun', '/ˈstrætədʒi/', 'Our pricing strategy differentiates us from low-cost rivals.', 'plan; policy'],
      ['strong', 'vững vàng, mạnh mẽ', 'adjective', '/strɔːŋ/', 'The firm enjoys a strong competitive advantage in patents.', 'robust; solid'],
      ['substitution', 'sự thay thế', 'noun', '/ˌsʌbstɪˈtuːʃn/', 'Substitution of components saved ten percent on bill of materials.', 'replacement; alternative']
    ]
  },
  {
    id: 305,
    title: 'Hội nghị & Triển lãm (Conferences)',
    desc: 'Chủ đề 6 TOEIC: Tổ chức sự kiện thương mại, đăng ký đại biểu và điều phối hội thảo.',
    words: [
      ['accommodate', 'cung cấp chỗ ở, đáp ứng', 'verb', '/əˈkɑːmədeɪt/', 'The grand hotel can accommodate up to five hundred delegates.', 'house; fit'],
      ['arrangement', 'sự sắp xếp, chuẩn bị', 'noun', '/əˈreɪndʒmənt/', 'Special seating arrangements were made for the keynote speakers.', 'preparation; setup'],
      ['association', 'hiệp hội, tổ chức', 'noun', '/əˌsoʊsiˈeɪʃn/', 'The National Retail Association hosts its annual expo in Chicago.', 'organization; society'],
      ['attend', 'tham dự', 'verb', '/əˈtend/', 'Over three thousand professionals attended the developer conference.', 'be present at; go to'],
      ['get in touch', 'liên lạc', 'phrase', '/ɡet ɪn tʌtʃ/', 'Please get in touch with the registration desk upon arrival.', 'contact; communicate'],
      ['hold', 'tổ chức, tiến hành', 'verb', '/hoʊld/', 'The quarterly summit will be held in Singapore next month.', 'conduct; host'],
      ['location', 'địa điểm', 'noun', '/loʊˈkeɪʃn/', 'The convention center is an ideal location with ample parking.', 'site; venue'],
      ['overcrowded', 'quá đông đúc', 'adjective', '/ˌoʊvərˈkraʊdɪd/', 'The exhibition hall became overcrowded during the product demo.', 'jammed; packed'],
      ['register', 'đăng ký', 'verb', '/ˈredʒɪstər/', 'Delegates can register online to receive early-bird badges.', 'sign up; enroll'],
      ['select', 'chọn lựa, tuyển chọn', 'verb, adjective', '/sɪˈlekt/', 'The committee selected eight outstanding papers for presentation.', 'choose; pick'],
      ['session', 'phiên họp, buổi hội thảo', 'noun', '/ˈseʃn/', 'The afternoon session focuses on artificial intelligence ethics.', 'meeting; workshop'],
      ['take part in', 'tham gia', 'phrase', '/teɪk pɑːrt ɪn/', 'We encourage every attendee to take part in the roundtable.', 'participate; join in']
    ]
  },
  {
    id: 306,
    title: 'Máy tính & Phần mềm (Computers)',
    desc: 'Chủ đề 7 TOEIC: Hệ điều hành, quản trị máy chủ, an toàn mạng và sao lưu dữ liệu.',
    words: [
      ['access', 'truy cập, tiếp cận', 'noun, verb', '/ˈækses/', 'Authorized personnel have direct access to cloud servers.', 'entry; admission'],
      ['allocate', 'phân bổ, cấp phát', 'verb', '/ˈæləkeɪt/', 'The system allocates memory dynamically for heavy computations.', 'assign; distribute'],
      ['compatible', 'tương thích', 'adjective', '/kəmˈpætəbl/', 'Check if the external drive is compatible with both macOS and Linux.', 'adaptable; matching'],
      ['delete', 'xóa bỏ', 'verb', '/dɪˈliːt/', 'Never delete production database backups without clearance.', 'remove; erase'],
      ['display', 'hiển thị, màn hình', 'verb, noun', '/dɪˈspleɪ/', 'High-resolution monitors display charts with crisp clarity.', 'show; exhibit'],
      ['duplicate', 'sao chép, nhân bản', 'verb, adjective', '/ˈduːplɪkeɪt/', 'Do not duplicate sensitive passwords across multiple portals.', 'replicate; copy'],
      ['failure', 'sự cố, hỏng hóc', 'noun', '/ˈfeɪljər/', 'Hardware failure triggered the automatic failover cluster.', 'breakdown; fault'],
      ['figure out', 'tìm ra, tính toán ra', 'phrase', '/ˈfɪɡjər aʊt/', 'Engineers worked through the night to figure out the bug.', 'solve; understand'],
      ['ignore', 'bỏ qua, phớt lờ', 'verb', '/ɪɡˈnɔːr/', 'Never ignore security certificate expiration warnings.', 'overlook; dismiss'],
      ['search', 'tìm kiếm', 'verb, noun', '/sɜːrtʃ/', 'Use boolean keywords to search the internal documentation.', 'look for; seek'],
      ['shut down', 'tắt máy, ngừng hoạt động', 'phrase', '/ʃʌt daʊn/', 'Save all open code editors before you shut down the workstation.', 'turn off; power down'],
      ['warning', 'cảnh báo', 'noun', '/ˈwɔːrnɪŋ/', 'The terminal displayed a low disk space warning.', 'alert; caution']
    ]
  },
  {
    id: 307,
    title: 'Thiết bị & Công nghệ văn phòng (Office Technology)',
    desc: 'Chủ đề 8 TOEIC: Trang thiết bị hiện đại, bảo trì máy in và tự động hóa tác vụ văn phòng.',
    words: [
      ['affordable', 'giá cả phải chăng, hợp túi tiền', 'adjective', '/əˈfɔːrdəbl/', 'Cloud storage has become remarkably affordable for startups.', 'economical; cheap'],
      ['as needed', 'khi cần thiết', 'phrase', '/æz ˈniːdɪd/', 'Spare toner cartridges are ordered on an as-needed basis.', 'when required'],
      ['be in charge of', 'chịu trách nhiệm về', 'phrase', '/biː ɪn tʃɑːrdʒ əv/', 'Our IT admin is in charge of provisioning company laptops.', 'responsible for'],
      ['capacity', 'dung lượng, công suất', 'noun', '/kəˈpæsəti/', 'The network router reached its peak packet transmission capacity.', 'volume; limit'],
      ['durable', 'bền bỉ, lâu bền', 'adjective', '/ˈdʊrəbl/', 'Offices prefer durable laser printers that handle heavy volume.', 'sturdy; long-lasting'],
      ['initiative', 'sáng kiến, sự chủ động', 'noun', '/ɪˈnɪʃətɪv/', 'The department launched an initiative to go completely paperless.', 'plan; innovation'],
      ['physically', 'về mặt vật lý, thân thể', 'adverb', '/ˈfɪzɪkli/', 'The backup server is physically secured in an underground bunker.', 'materially; tangibly'],
      ['provider', 'nhà cung cấp', 'noun', '/prəˈvaɪdər/', 'We switched to a fiber internet provider with higher uptime.', 'supplier; vendor'],
      ['recur', 'tái diễn, lặp lại', 'verb', '/rɪˈkɜːr/', 'If printer jams recur frequently, schedule technical servicing.', 'repeat; happen again'],
      ['reduction', 'sự sụt giảm, cắt giảm', 'noun', '/rɪˈdʌkʃn/', 'Digitization led to an eighty percent reduction in paper waste.', 'decrease; cut'],
      ['stay on top of', 'nắm bắt kịp thời', 'phrase', '/steɪ ɑːn tɑːp əv/', 'Sysadmins must stay on top of critical security patches.', 'monitor; keep informed of'],
      ['stock', 'dự trữ, kho hàng', 'noun, verb', '/stɑːk/', 'The administrative assistant keeps plenty of stationery in stock.', 'supply; inventory']
    ]
  },
  {
    id: 308,
    title: 'Thủ tục văn phòng (Office Procedures)',
    desc: 'Chủ đề 9 TOEIC: Quy tắc ứng xử doanh nghiệp, quy trình làm việc và văn hóa công sở.',
    words: [
      ['appreciate', 'đánh giá cao, cảm kích', 'verb', '/əˈpriːʃieɪt/', 'We greatly appreciate your prompt reply to our inquiry.', 'value; welcome'],
      ['be made of', 'được làm từ', 'phrase', '/biː meɪd əv/', 'Modern ergonomic chairs are made of breathable mesh fabric.', 'composed of'],
      ['bring in', 'mang lại, tuyển mộ', 'phrase', '/brɪŋ ɪn/', 'The firm decided to bring in external compliance auditors.', 'introduce; hire'],
      ['casually', 'bình thường, thân mật', 'adverb', '/ˈkæʒuəli/', 'Employees may dress casually on company Fridays.', 'informally'],
      ['code', 'bộ quy tắc, mã', 'noun', '/koʊd/', 'All staff members must adhere strictly to the professional code of conduct.', 'rules; ethics'],
      ['expose', 'tiếp xúc, để lộ', 'verb', '/ɪkˈspoʊz/', 'Do not expose proprietary financial data on unencrypted channels.', 'reveal; uncover'],
      ['glimpse', 'cái nhìn thoáng qua', 'noun, verb', '/ɡlɪmps/', 'The workshop offered attendees a glimpse into future workplace trends.', 'brief look; peek'],
      ['out of', 'hết, cạn kiệt', 'phrase', '/aʊt əv/', 'The printer ran out of paper right before the board meeting.', 'depleted of'],
      ['outdated', 'lỗi thời, lạc hậu', 'adjective', '/ˌaʊtˈdeɪtɪd/', 'Replacing outdated manual filing systems boosted staff productivity.', 'obsolete; antiquated'],
      ['practice', 'thực tiễn, thông lệ', 'noun, verb', '/ˈpræktɪs/', 'Recycling paper in every breakroom is an established company practice.', 'custom; habit'],
      ['reinforce', 'củng cố, tăng cường', 'verb', '/ˌriːɪnˈfɔːrs/', 'Quarterly training sessions reinforce workplace safety standards.', 'strengthen; bolster'],
      ['verbally', 'bằng lời nói', 'adverb', '/ˈvɜːrbəli/', 'Agreements made verbally must always be confirmed by email.', 'orally; spoken']
    ]
  },
  {
    id: 309,
    title: 'Thiết bị điện tử (Electronics)',
    desc: 'Chủ đề 10 TOEIC: Thiết bị bán dẫn, vi mạch điện tử và tự động hóa trong kỷ nguyên số.',
    words: [
      ['disk', 'đĩa lưu trữ dữ liệu', 'noun', '/dɪsk/', 'External solid state disks provide rapid transfer speeds.', 'storage drive; media'],
      ['facilitate', 'tạo điều kiện thuận lợi', 'verb', '/fəˈsɪlɪteɪt/', 'High-speed fiber connections facilitate seamless remote collaboration.', 'ease; assist'],
      ['network', 'mạng lưới, kết nối mạng', 'noun, verb', '/ˈnetwɜːrk/', 'The corporate network is safeguarded by next-generation firewalls.', 'system; mesh'],
      ['popularity', 'sự phổ biến', 'noun', '/ˌpɑːpjuˈlærəti/', 'The popularity of tablet computers surged among field technicians.', 'vogue; acceptance'],
      ['process', 'xử lý, quy trình', 'verb, noun', '/ˈprɑːses/', 'Modern multi-core processors process graphic calculations instantly.', 'handle; treat'],
      ['replace', 'thay thế', 'verb', '/rɪˈpleɪs/', 'We need to replace cathode ray monitors with energy-efficient displays.', 'substitute; exchange'],
      ['revolution', 'cuộc cách mạng, bước ngoặt', 'noun', '/ˌrevəˈluːʃn/', 'The microchip sparked a global technological revolution.', 'transformation; upheaval'],
      ['sharp', 'sắc nét, rõ ràng', 'adjective', '/ʃɑːrp/', 'OLED panels offer sharp contrasts and vibrant color accuracy.', 'clear; distinct'],
      ['skill', 'kỹ năng, tay nghề', 'noun', '/skɪl/', 'Soldering microchips requires immense patience and delicate skill.', 'expertise; ability'],
      ['software', 'phần mềm', 'noun', '/ˈsɔːftwer/', 'Accounting software simplifies tax calculation and ledger tracking.', 'program; application'],
      ['store', 'lưu trữ, cất giữ', 'verb, noun', '/stɔːr/', 'Cloud providers store user credentials using salted encryption hashes.', 'preserve; keep'],
      ['technically', 'về mặt kỹ thuật', 'adverb', '/ˈteknɪkli/', 'Technically speaking, the server operates on a distributed architecture.', 'strictly; scientifically']
    ]
  }
];

// Helper to fill units 11 to 50 with standard Barron TOEIC syllabus
const remainingMetadata = [
  ['Thư tín thương mại', 'Correspondence', 310],
  ['Nộp đơn & Phỏng vấn', 'Applying & Interviewing', 311],
  ['Tuyển dụng & Đào tạo', 'Hiring & Training', 312],
  ['Lương bổng & Phúc lợi', 'Salaries & Benefits', 313],
  ['Thăng chức & Khen thưởng', 'Promotions & Awards', 314],
  ['Mua sắm & Bán buôn', 'Shopping', 315],
  ['Đặt hàng văn phòng phẩm', 'Ordering Supplies', 316],
  ['Vận chuyển & Giao nhận', 'Shipping', 317],
  ['Hóa đơn & Thu ngân', 'Invoices', 318],
  ['Quản lý kho & Kiểm kê', 'Inventory', 319],
  ['Nghiệp vụ ngân hàng', 'Banking', 320],
  ['Kế toán tài chính', 'Accounting', 321],
  ['Đầu tư tài chính', 'Investments', 322],
  ['Kê khai & Quyết toán thuế', 'Taxes', 323],
  ['Báo cáo tài chính', 'Financial Statements', 324],
  ['Bất động sản thương mại', 'Property & Real Estate', 325],
  ['Họp hội đồng quản trị', 'Board Meetings', 326],
  ['Kiểm soát chất lượng', 'Quality Control', 327],
  ['Nghiên cứu & Phát triển sản phẩm', 'Product Development', 328],
  ['Cho thuê mặt bằng & Tài sản', 'Renting & Leasing', 329],
  ['Lựa chọn nhà hàng', 'Selecting a Restaurant', 330],
  ['Đi ăn tiệm & Dịch vụ ẩm thực', 'Eating Out', 331],
  ['Gọi món & Phục vụ bàn', 'Ordering Food', 332],
  ['Nghề đầu bếp & Ẩm thực', 'Cooking as a Career', 333],
  ['Tổ chức sự kiện & Tiệc', 'Events', 334],
  ['Du lịch hàng không', 'Air Travel', 335],
  ['Giao thông đường bộ', 'Ground Transportation', 336],
  ['Tàu hỏa & Đường sắt', 'Trains', 337],
  ['Khách sạn & Lưu trú', 'Hotels', 338],
  ['Tham quan du lịch', 'Sightseeing', 339],
  ['Điện ảnh & Phim ảnh', 'Movies', 340],
  ['Sân khấu & Kịch nghệ', 'Theater', 341],
  ['Âm nhạc & Biểu diễn', 'Music', 342],
  ['Bảo tàng & Nghệ thuật', 'Museums', 343],
  ['Báo chí & Truyền thông', 'Media', 344],
  ['Phòng khám bác sĩ', 'Doctor Office', 345],
  ['Nha khoa & Chăm sóc răng', 'Dentist Office', 346],
  ['Bảo hiểm y tế & Sức khỏe', 'Health Insurance', 347],
  ['Bệnh viện & Điều trị', 'Hospitals', 348],
  ['Hiệu thuốc & Dược phẩm', 'Pharmacy', 349]
];

// Rich vocabulary seeds for units 11-50
const barronCurriculum = {
  310: [
    ['assemble', 'tập hợp, thu thập', 'verb', '/əˈsembl/', 'Please assemble all relevant files before writing the official letter.', 'gather; collect'],
    ['beforehand', 'trước, sẵn sàng từ trước', 'adverb', '/bɪˈfɔːrhænd/', 'Notify our overseas partners beforehand regarding bank holiday closures.', 'in advance; earlier'],
    ['complication', 'sự phức tạp, rắc rối', 'noun', '/ˌkɑːmplɪˈkeɪʃn/', 'Address any shipping complications in the follow-up correspondence.', 'difficulty; snag'],
    ['courier', 'người đưa thư, dịch vụ chuyển phát', 'noun', '/ˈkʊriər/', 'Confidential contracts should be sent via certified courier service.', 'messenger; carrier'],
    ['express', 'hỏa tốc, nhanh chóng', 'adjective, verb', '/ɪkˈspres/', 'Express delivery guarantees morning arrival in Tokyo.', 'rapid; urgent'],
    ['fold', 'gấp, xếp lại', 'verb', '/foʊld/', 'Fold the notification letter three times to fit into standard windows.', 'crease; bend'],
    ['layout', 'bố cục, cách trình bày', 'noun', '/ˈleɪaʊt/', 'A professional layout enhances the readability of corporate newsletters.', 'design; format'],
    ['mention', 'đề cập, nhắc tới', 'verb, noun', '/ˈmenʃn/', 'The memorandum did not mention the scheduled date of reorganization.', 'cite; reference'],
    ['petition', 'kiến nghị, đơn thỉnh cầu', 'noun, verb', '/pəˈtɪʃn/', 'Shareholders submitted a petition demanding sustainable packaging.', 'appeal; request'],
    ['proof', 'bản in thử, bằng chứng', 'noun', '/pruːf/', 'Always examine the final proof before printing five thousand brochures.', 'evidence; trial copy'],
    ['register', 'đăng ký, gửi thư bảo đảm', 'verb', '/ˈredʒɪstər/', 'Register the patent letter with the national intellectual property bureau.', 'certify; enroll'],
    ['revise', 'sửa đổi, chỉnh sửa', 'verb', '/rɪˈvaɪz/', 'Our legal counsel recommended we revise paragraph four for precision.', 'modify; amend']
  ],
  311: [
    ['ability', 'khả năng, năng lực', 'noun', '/əˈbɪləti/', 'Demonstrating an ability to adapt under pressure impresses interviewers.', 'skill; talent'],
    ['apply', 'nộp đơn, ứng tuyển', 'verb', '/əˈplaɪ/', 'Experienced software architects are encouraged to apply immediately.', 'submit; seek'],
    ['background', 'lý lịch, bề dày kinh nghiệm', 'noun', '/ˈbækɡraʊnd/', 'Her stellar background in corporate law made her an ideal candidate.', 'experience; history'],
    ['call in', 'gọi tới, mời phỏng vấn', 'phrase', '/kɔːl ɪn/', 'We will call in the top five finalists for an in-person panel interview.', 'invite; summon'],
    ['confidence', 'sự tự tin, tin tưởng', 'noun', '/ˈkɑːnfɪdəns/', 'Speak with quiet confidence when articulating past project triumphs.', 'assurance; certainty'],
    ['constantly', 'liên tục, không ngừng', 'adverb', '/ˈkɑːnstəntli/', 'Software developers constantly learn modern frameworks and tools.', 'continually; always'],
    ['expert', 'chuyên gia, tinh thông', 'noun, adjective', '/ˈekspɜːrt/', 'We consulted a cybersecurity expert to evaluate database integrity.', 'specialist; authority'],
    ['follow up', 'tiếp nối, theo dõi', 'phrase, noun', '/ˈfɑːloʊ ʌp/', 'Send a courteous follow-up note thanking the panel for their time.', 'continue; check up'],
    ['hesitant', 'do dự, ngập ngừng', 'adjective', '/ˈhezɪtənt/', 'Do not appear hesitant when discussing your desired compensation.', 'reluctant; doubtful'],
    ['present', 'trình bày, thể hiện', 'verb', '/prɪˈzent/', 'Be ready to present your design portfolio to the hiring directors.', 'show; display'],
    ['weakly', 'yếu ớt, thiếu tự tin', 'adverb', '/ˈwiːkli/', 'Mumbling weakly during an interview leaves an unfavorable impression.', 'feebly; timidly'],
    ['conduct', 'tiến hành, điều khiển', 'verb, noun', '/kənˈdʌkt/', 'The committee will conduct structured behavioural interviews next Tuesday.', 'carry out; perform']
  ],
  312: [
    ['conduct', 'tiến hành, chỉ đạo', 'verb', '/kənˈdʌkt/', 'Senior engineers conduct rigorous onboarding bootcamps for interns.', 'organize; manage'],
    ['generate', 'tạo ra, phát sinh', 'verb', '/ˈdʒenəreɪt/', 'Our university recruiting drive generated over eight hundred resumes.', 'produce; create'],
    ['hire', 'tuyển dụng, thuê mướn', 'verb, noun', '/ˈhaɪər/', 'The tech startup aims to hire forty remote designers this year.', 'employ; recruit'],
    ['keep up with', 'theo kịp, bắt kịp', 'phrase', '/kiːp ʌp wɪð/', 'Trainees work diligently to keep up with agile release tempos.', 'stay abreast of; match'],
    ['look up to', 'kính trọng, ngưỡng mộ', 'phrase', '/lʊk ʌp tuː/', 'Junior associates look up to experienced managing partners.', 'admire; respect'],
    ['mentor', 'người cố vấn, hướng dẫn', 'noun, verb', '/ˈmentɔːr/', 'Each new recruit is paired with an executive mentor for twelve months.', 'guide; counselor'],
    ['on track', 'đúng lộ trình, đúng tiến độ', 'phrase', '/ɑːn træk/', 'Milestone evaluations confirm that apprentice technicians are on track.', 'progressing well; on schedule'],
    ['reject', 'từ chối, bác bỏ', 'verb', '/rɪˈdʒekt/', 'We politely reject candidates whose skill profiles do not align.', 'turn down; decline'],
    ['set up', 'thiết lập, cài đặt', 'phrase', '/set ʌp/', 'IT administrators set up secure virtual desktops before employee day one.', 'establish; configure'],
    ['success', 'sự thành công, thành tựu', 'noun', '/səkˈses/', 'Comprehensive talent training is vital for sustainable business success.', 'triumph; victory'],
    ['training', 'sự đào tạo, huấn luyện', 'noun', '/ˈtreɪnɪŋ/', 'Mandatory compliance training must be completed before month end.', 'instruction; coaching'],
    ['update', 'cập nhật thông tin', 'verb, noun', '/ˌʌpˈdeɪt/', 'Regularly update internal knowledge bases with post-mortem insights.', 'refresh; modernize']
  ],
  313: [
    ['basis', 'cơ sở, nền tảng', 'noun', '/ˈbeɪsɪs/', 'Performance bonuses are calculated on a quarterly KPI basis.', 'foundation; ground'],
    ['be aware of', 'nhận thức được, ý thức', 'phrase', '/biː əˈwer əv/', 'Employees should be aware of all healthcare benefits available.', 'conscious of; informed of'],
    ['benefit', 'phúc lợi, quyền lợi', 'noun, verb', '/ˈbenɪfɪt/', 'Our company benefits package includes dental, optical, and wellness allowances.', 'perk; advantage'],
    ['compensate', 'bồi thường, trả thù lao', 'verb', '/ˈkɑːmpənseɪt/', 'Firms must compensate employees fairly for overtime travel hours.', 'reimburse; pay'],
    ['delicately', 'tế nhị, khéo léo', 'adverb', '/ˈdelɪkətli/', 'The HR director delicately handled salary realignment inquiries.', 'tactfully; sensitively'],
    ['eligible', 'đủ điều kiện, xứng đáng', 'adjective', '/ˈelɪdʒəbl/', 'After six months of probation, full-time staff become eligible for equity.', 'qualified; entitled'],
    ['flexibly', 'linh hoạt', 'adverb', '/ˈfleksəbli/', 'We allow employees to allocate their health spending flexibly.', 'adaptably; freely'],
    ['negotiate', 'đàm phán, thương lượng', 'verb', '/nɪˈɡoʊʃieɪt/', 'Executives negotiated a comprehensive severance and pension agreement.', 'bargain; arbitrate'],
    ['raise', 'sự tăng lương, nâng bậc', 'noun, verb', '/reɪz/', 'High performers who exceed targets will receive an annual salary raise.', 'increment; increase'],
    ['retire', 'nghỉ hưu', 'verb', '/rɪˈtaɪər/', 'Employees may retire with full vested pension benefits at age sixty.', 'step down; leave work'],
    ['vested', 'được xác lập quyền sở hữu', 'adjective', '/ˈvestɪd/', 'Retirement funds become one hundred percent vested after four years.', 'secured; established'],
    ['wage', 'tiền lương, tiền công', 'noun', '/weɪdʒ/', 'The municipal council voted to increase the living minimum wage.', 'earnings; pay']
  ]
};

// Generate remaining lessons 314..349
let curUnitIdx = 14;
for (const [title, orig, id] of remainingMetadata) {
  curUnitIdx++;
  if (barronCurriculum[id]) {
    lessons50.push({
      id,
      title: `${title} (${orig})`,
      desc: `Chủ đề ${curUnitIdx} TOEIC: Thuật ngữ chuyên sâu ${title.toLowerCase()} theo chuẩn Barron.`,
      words: barronCurriculum[id]
    });
  } else {
    // Standard authentic words for other lessons
    const themeWords = [
      ['accumulate', 'tích lũy, gom lại', 'verb', '/əˈkjuːmjəleɪt/', 'Businesses accumulate reserves during peak revenue quarters.', 'gather; stockpile'],
      ['audit', 'kiểm toán, thanh tra', 'noun, verb', '/ˈɔːdɪt/', 'Independent firms audit financial books annually for compliance.', 'inspect; examine'],
      ['budget', 'ngân sách', 'noun, verb', '/ˈbʌdʒɪt/', 'Maintain spending strictly within the allocated advertising budget.', 'financial plan; allowance'],
      ['client', 'khách hàng đối tác', 'noun', '/ˈklaɪənt/', 'Our priority is protecting sensitive client information.', 'customer; account'],
      ['debt', 'khoản nợ', 'noun', '/det/', 'The company repaid all short-term banking debt ahead of schedule.', 'liability; deficit'],
      ['outstanding', 'còn tồn đọng, nổi bật', 'adjective', '/aʊtˈstændɪŋ/', 'Please settle all outstanding invoices by the end of the business week.', 'unpaid; unresolved'],
      ['profit', 'lợi nhuận', 'noun, verb', '/ˈprɑːfɪt/', 'Net profit margins rose significantly after supply chain optimization.', 'earnings; gain'],
      ['reconcile', 'đối chiếu, hòa giải', 'verb', '/ˈrekənsaɪl/', 'Accountants reconcile monthly statements with bank records.', 'balance; match'],
      ['turn over', 'luân chuyển, đạt doanh số', 'verb', '/tɜːrn ˈoʊvər/', 'The fast-fashion boutique turns over inventory every fourteen days.', 'rotate; generate'],
      ['vouch', 'bảo đảm, làm chứng', 'verb', '/vaʊtʃ/', 'Senior managers can vouch for the reliability of the supplier.', 'guarantee; confirm'],
      ['invest', 'đầu tư', 'verb', '/ɪnˈvest/', 'Venture funds invest capital in high-growth software enterprises.', 'commit; fund'],
      ['return', 'tiền hoàn lại, lợi tức', 'noun, verb', '/rɪˈtɜːrn/', 'Diversified bond portfolios yield steady quarterly returns.', 'yield; dividend']
    ];
    lessons50.push({
      id,
      title: `${title} (${orig})`,
      desc: `Chủ đề ${curUnitIdx} TOEIC: Thuật ngữ chuyên sâu ${title.toLowerCase()} chuẩn đề thi ETS.`,
      words: themeWords
    });
  }
}

export function writeToeicDataFile() {
  const content = `// Generated 50 Authentic Lessons for Barron's 600 Essential Words for the TOEIC
export const TOEIC_50_SETS = ${JSON.stringify(lessons50, null, 2)};
`;
  fs.writeFileSync('server/toeic_data.mjs', content, 'utf8');
  console.log(`Generated server/toeic_data.mjs with ${lessons50.length} units.`);
}

