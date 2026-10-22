export interface WordItem {
  id: string;
  term: string;
  definition: string;
  partOfSpeech?: string;
  phonetic?: string;
  example?: string;
  status: 'new' | 'learning' | 'mastered';
  language?: string;
}

export interface VocabSet {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  words: WordItem[];
  level?: string;
}

export interface PronScore {
  overall: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  prosody: number;
  words: {
    word: string;
    score: number;
    error?: string;
  }[];
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface TestimonialPost {
  platform: 'TikTok' | 'Threads';
  handle: string;
  tag: string;
  title: string;
  views?: string;
  likes?: string;
  avatarText: string;
  url: string;
}

export interface LearnerReview {
  id: string;
  author: string;
  avatar: string;
  content: string;
  favoriteFeature?: string;
}

