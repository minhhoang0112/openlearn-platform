import { VocabSet, FaqItem, TestimonialPost, LearnerReview } from '../types';

export const mockVocabSets: VocabSet[] = [
  {
    id: 'business-meetings',
    title: 'Business English - Meetings',
    description: 'Từ vựng chuyên nghiệp dùng trong các cuộc họp và thảo luận dự án',
    category: 'Business English',
    language: 'English',
    level: 'Intermediate',
    words: [
      {
        id: 'w1',
        term: 'resilient',
        definition: 'kiên cường, có khả năng phục hồi nhanh sau khó khăn',
        partOfSpeech: 'adj',
        phonetic: '/rɪˈzɪliənt/',
        example: 'She remained resilient in the face of immense project deadlines.',
        status: 'learning',
        language: 'en-US'
      },
      {
        id: 'w2',
        term: 'clarify',
        definition: 'làm rõ, giải thích tường minh',
        partOfSpeech: 'verb',
        phonetic: '/ˈklærəfaɪ/',
        example: 'Could you please clarify the deliverables for phase two?',
        status: 'learning',
        language: 'en-US'
      },
      {
        id: 'w3',
        term: 'deadline',
        definition: 'hạn chót, thời hạn hoàn thành',
        partOfSpeech: 'noun',
        phonetic: '/ˈdedlaɪn/',
        example: 'The team worked overtime to meet the tight deadline.',
        status: 'new',
        language: 'en-US'
      },
      {
        id: 'w4',
        term: 'proposal',
        definition: 'đề xuất, bản kế hoạch dự thảo',
        partOfSpeech: 'noun',
        phonetic: '/prəˈpoʊzl/',
        example: 'We reviewed the client proposal during the morning stand-up.',
        status: 'mastered',
        language: 'en-US'
      },
      {
        id: 'w5',
        term: 'consensus',
        definition: 'sự đồng thuận, nhất trí chung',
        partOfSpeech: 'noun',
        phonetic: '/kənˈsensəs/',
        example: 'After hours of debate, we finally reached a consensus.',
        status: 'new',
        language: 'en-US'
      },
      {
        id: 'w6',
        term: 'leverage',
        definition: 'tận dụng tối đa, đòn bẩy',
        partOfSpeech: 'verb',
        phonetic: '/ˈlevərɪdʒ/',
        example: 'We should leverage AI automation to accelerate our development.',
        status: 'learning',
        language: 'en-US'
      }
    ]
  },
  {
    id: 'ielts-speaking-band7',
    title: 'IELTS Speaking Band 7.0+ Essential',
    description: 'Từ vựng học thuật ghi điểm cao cho bài thi nói IELTS',
    category: 'IELTS Prep',
    language: 'English',
    level: 'Advanced',
    words: [
      {
        id: 'ielts-1',
        term: 'adversity',
        definition: 'nghịch cảnh, hoàn cảnh khó khăn',
        partOfSpeech: 'noun',
        phonetic: '/ədˈvɜːrsəti/',
        example: 'Courage is the capacity to perform well even under immense adversity.',
        status: 'learning',
        language: 'en-US'
      },
      {
        id: 'ielts-2',
        term: 'ubiquitous',
        definition: 'phổ biến khắp nơi, nhan nhản',
        partOfSpeech: 'adj',
        phonetic: '/juːˈbɪkwɪtəs/',
        example: 'Smartphones have become ubiquitous in modern society.',
        status: 'mastered',
        language: 'en-US'
      },
      {
        id: 'ielts-3',
        term: 'meticulous',
        definition: 'tỉ mỉ, kỹ lưỡng từng chi tiết',
        partOfSpeech: 'adj',
        phonetic: '/məˈtɪkjələs/',
        example: 'He gave a meticulous presentation on the research methodology.',
        status: 'new',
        language: 'en-US'
      }
    ]
  }
];

export const mockFaqsVi: FaqItem[] = [
  {
    q: 'OpenQuiz có thực sự miễn phí không?',
    a: 'Có. OpenQuiz là nền tảng học từ vựng hoàn toàn miễn phí. Bạn có thể tạo số lượng học phần không giới hạn, học với thẻ flashcard, làm bài kiểm tra trắc nghiệm, luyện viết, nghe chính tả và ôn tập lặp lại ngắt quãng (SRS). Các chế độ học cốt lõi này luôn miễn phí mãi mãi.'
  },
  {
    q: 'Có giới hạn số lượng học phần hoặc số từ tôi có thể tạo không?',
    a: 'Không hề. Bạn có thể tạo không giới hạn học phần từ vựng và không giới hạn số từ. OpenQuiz phù hợp cho việc tự học cá nhân, ôn thi chứng chỉ (IELTS, TOEIC, HSK, JLPT), giảng dạy trên lớp hoặc xây dựng kho từ vựng cá nhân lâu dài.'
  },
  {
    q: 'OpenQuiz khác gì so với các ứng dụng flashcard thông thường như Quizlet hay Anki?',
    a: 'OpenQuiz không chỉ dừng lại ở việc giúp bạn nhận diện mặt chữ. Lộ trình học được thiết kế toàn diện: từ hiểu định nghĩa, gõ từ gợi nhớ, nghe chính tả, thuật toán lặp lại ngắt quãng (Spaced Repetition), và đặc biệt là đưa ngay từ vựng vừa học vào câu hội thoại thực tế với AI để biến từ vựng thụ động thành chủ động.'
  },
  {
    q: 'OpenQuiz có tính năng luyện nói miễn phí không?',
    a: 'Có. OpenQuiz có trải nghiệm luyện nói miễn phí nơi bạn sử dụng chính những từ vựng đang học để trả lời các câu hỏi tình huống thực tế. AI sẽ phân tích phản hồi của bạn, chỉ ra lỗi ngữ pháp và đưa ra câu mẫu cải thiện.'
  },
  {
    q: 'Có chấm điểm phát âm chi tiết từng từ không?',
    a: 'Có. Hệ thống PronScore của OpenQuiz phân tích toàn diện 4 tiêu chí: Độ chính xác (Accuracy), Độ trôi chảy (Fluency), Độ hoàn chỉnh (Completeness) và Ngữ điệu (Prosody) — đồng thời chấm điểm từng âm tiết để bạn biết chính xác cần cải thiện ở đâu.'
  },
  {
    q: 'Tôi có cần nhập thẻ tín dụng để bắt đầu học miễn phí không?',
    a: 'Hoàn toàn không cần thẻ tín dụng. Bạn chỉ cần đăng nhập qua Google hoặc Apple, tạo một học phần từ vựng và bắt đầu học ngay trong chưa đầy 1 phút.'
  }
];

export const mockFaqsEn: FaqItem[] = [
  {
    q: 'Is OpenQuiz really free?',
    a: 'Yes. OpenQuiz is a free vocabulary learning platform where you can create unlimited sets, study with flashcards, quizzes, writing, dictation, and spaced repetition. Core study modes are always free with no limits.'
  },
  {
    q: 'Is there a limit on vocabulary sets or words I can create?',
    a: 'No. You can create unlimited vocabulary sets with unlimited words. OpenQuiz is perfect for personal study, exam prep, classroom use, and building a long-term vocabulary bank.'
  },
  {
    q: 'How is OpenQuiz different from regular flashcard apps?',
    a: 'OpenQuiz doesn\'t just help you recognize words. The learning flow goes from knowing definitions, typing answers, listening and writing, spaced repetition, and then using those words actively in speech.'
  },
  {
    q: 'Does OpenQuiz have free speaking practice?',
    a: 'Yes. OpenQuiz has a speaking practice experience where you use the vocabulary you are currently learning to answer questions. Advanced AI features or unlimited conversation may require a Premium plan, but you can start for free.'
  },
  {
    q: 'Is there pronunciation scoring per word?',
    a: 'Yes. OpenQuiz has pronunciation scoring that shows your score, accuracy, fluency, and completeness — pointing out specific sounds or words to improve, rather than just memorizing spelling.'
  },
  {
    q: 'Do I need a credit card to study for free?',
    a: 'No credit card needed. Sign in with Google or Apple, create a vocabulary set, and start learning for free in under a minute.'
  }
];

export const mockTestimonials: TestimonialPost[] = [
  {
    platform: 'TikTok',
    handle: '@carrooon',
    tag: 'Learning English',
    title: 'IELTS free',
    views: '216K',
    likes: '31.5K',
    avatarText: 'C',
    url: 'https://www.tiktok.com/@carrooon/video/7628878923350281479'
  },
  {
    platform: 'Threads',
    handle: '@crush_ielts_ftu',
    tag: 'Study Mindset',
    title: 'Language learning mindset',
    avatarText: 'F',
    url: 'https://www.threads.com/@crush_ielts_ftu/post/DX4MTpFICep'
  },
  {
    platform: 'TikTok',
    handle: '@openqai27',
    tag: 'Learning English',
    title: 'IELTS Speaking',
    views: '328.3K',
    likes: '33.2K',
    avatarText: 'O',
    url: 'https://www.tiktok.com/@openqai27/video/7637034737701227783'
  },
  {
    platform: 'TikTok',
    handle: '@reizend16',
    tag: 'Learning German',
    title: 'German Vocabulary',
    views: '12.8K',
    likes: '866',
    avatarText: 'R',
    url: 'https://www.tiktok.com/@reizend16/video/7635651336377240850'
  },
  {
    platform: 'Threads',
    handle: '@soonxinhday',
    tag: 'Productivity',
    title: 'Anki + Quizlet + Speaking',
    avatarText: 'S',
    url: 'https://www.threads.com/@soonxinhday/post/DW8jXhYiZZd'
  },
  {
    platform: 'TikTok',
    handle: '@openquiztienghan',
    tag: 'Learning Korean',
    title: 'Korean Daily Words',
    views: '30.8K',
    likes: '2.2K',
    avatarText: 'K',
    url: 'https://www.tiktok.com/@openquiztienghan/video/7628248694822882578'
  }
];

export const mockReviews: LearnerReview[] = [
  {
    id: 'rev-1',
    author: 'bn9*****',
    avatar: 'b',
    content: 'Không có gì để chê. Mình vốn học từ vựng rất chậm nhưng học bằng flashcard và phát âm ở đây cực kỳ vào đầu. Tính năng thích nhất là speaking.',
    favoriteFeature: 'Speaking'
  },
  {
    id: 'rev-2',
    author: 'kieuoan*****',
    avatar: 'k',
    content: 'Tính năng AI import từ vựng siêu đỉnh: gõ một chủ đề là AI tự gợi ý cả cụm từ, phiên âm và ví dụ thực tế. Số 1 trong các app mình từng dùng.',
    favoriteFeature: 'AI Import'
  },
  {
    id: 'rev-3',
    author: 'kj*****',
    avatar: 'k',
    content: 'Trải nghiệm quá mượt mà ngay trên gói miễn phí. Giao diện trực quan, không bị quảng cáo rác làm phiền.',
    favoriteFeature: 'Free Experience'
  },
  {
    id: 'rev-4',
    author: 'duongm*****',
    avatar: 'd',
    content: 'Câu ví dụ cho mỗi từ rất dễ hiểu, có cả từ đồng nghĩa và biết rõ từ nào mình cần ôn lại theo SRS. Rất mê OpenQuiz.',
    favoriteFeature: 'Spaced Repetition'
  },
  {
    id: 'rev-5',
    author: 'nhungtuyet17****',
    avatar: 'n',
    content: 'Cảm ơn tâm huyết của team phát triển. Vừa học từ vựng vừa luyện nói, sửa ngữ pháp và đặt câu tức thì.',
    favoriteFeature: 'Grammar Feedback'
  },
  {
    id: 'rev-6',
    author: '24562*****',
    avatar: '2',
    content: 'Điểm thích nhất là học từ vựng qua Speaking: học đến từ nào là được ứng dụng ngay vào câu trả lời đến đó.',
    favoriteFeature: 'Speaking in Context'
  }
];

export const mockCuratedPaths = [
  {
    lang: 'English',
    flag: '🇬🇧',
    courses: [
      { name: 'Vocabulary in Use Advanced', count: '45 bài • 1,200 từ', badge: 'Popular' },
      { name: 'Vocabulary in Use Pre-Intermediate', count: '30 bài • 800 từ', badge: 'Beginner' },
      { name: 'Vocabulary for IELTS Reading & Speaking', count: '50 bài • 1,500 từ', badge: 'IELTS' },
      { name: '600 TOEIC Essential Words', count: '50 bài • 600 từ', badge: 'TOEIC' },
      { name: 'English for Work & Global Business', count: '35 bài • 900 từ', badge: 'Work' }
    ]
  },
  {
    lang: 'Chinese',
    flag: '🇨🇳',
    courses: [
      { name: 'HSK I - Căn bản nhập môn', count: '150 từ vựng cốt lõi', badge: 'HSK 1' },
      { name: 'HSK II - Giao tiếp hàng ngày', count: '300 từ vựng nâng cao', badge: 'HSK 2' },
      { name: 'HSK III - Trung cấp thực hành', count: '600 từ vựng', badge: 'HSK 3' },
      { name: 'HSK IV - Đọc hiểu & Viết văn', count: '1,200 từ vựng', badge: 'HSK 4' },
      { name: 'HSK V - Chuyên sâu & Thảo luận', count: '2,500 từ vựng', badge: 'HSK 5' },
      { name: 'HSK VI - Thành thạo như bản xứ', count: '5,000 từ vựng', badge: 'HSK 6' }
    ]
  },
  {
    lang: 'Korean',
    flag: '🇰🇷',
    courses: [
      { name: 'TOPIK I (Level 1–2) Tiếng Hàn cơ bản', count: '40 bài • 1,000 từ', badge: 'TOPIK I' },
      { name: 'TOPIK II (Level 3–4) Tiếng Hàn trung cấp', count: '60 bài • 2,000 từ', badge: 'TOPIK II' },
      { name: 'TOPIK II (Level 5–6) Tiếng Hàn học thuật', count: '80 bài • 3,500 từ', badge: 'Master' }
    ]
  },
  {
    lang: 'Japanese',
    flag: '🇯🇵',
    courses: [
      { name: 'JLPT N5 - Nhập môn Hiragana & Kanji', count: '800 từ • 100 Kanji', badge: 'N5' },
      { name: 'JLPT N4 - Giao tiếp cơ bản & Ngữ pháp', count: '1,500 từ • 300 Kanji', badge: 'N4' },
      { name: 'JLPT N3 - Trung cấp thực chiến', count: '3,000 từ • 650 Kanji', badge: 'N3' },
      { name: 'JLPT N2 - Đọc báo & Công việc', count: '6,000 từ • 1,000 Kanji', badge: 'N2' },
      { name: 'JLPT N1 - Cao cấp toàn diện', count: '10,000 từ • 2,000 Kanji', badge: 'N1' }
    ]
  }
];

