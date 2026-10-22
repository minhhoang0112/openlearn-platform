import React, { useState } from 'react';
import {
  X,
  Mic,
  Volume2,
  Send,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { speakText, startSpeechRecognition } from '../utils/speech';

interface AiConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'vi' | 'en';
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  audioText?: string;
  grammarError?: {
    mistake: string;
    correction: string;
    reason: string;
  };
  score?: number;
}

export const AiConversationModal: React.FC<AiConversationModalProps> = ({
  isOpen,
  onClose,
  lang
}) => {
  if (!isOpen) return null;

  const [scenario, setScenario] = useState<'ielts' | 'interview' | 'travel'>('interview');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mandatoryWords, setMandatoryWords] = useState(['resilient', 'leverage', 'breakthrough']);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: "Hello! Welcome to our interview today. To start off, could you tell me about a major professional challenge you faced and how you overcame it?",
      audioText: "Hello! Welcome to our interview today. To start off, could you tell me about a major professional challenge you faced and how you overcame it?"
    }
  ]);

  const handleSpeakAi = (text: string) => {
    speakText(text, 'en-US');
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    // Check mandatory words
    const updatedUsed = new Set(usedWords);
    mandatoryWords.forEach(w => {
      if (text.toLowerCase().includes(w.toLowerCase())) {
        updatedUsed.add(w);
      }
    });
    setUsedWords(updatedUsed);

    // Mock intelligent grammar coach detection
    let grammarErr = undefined;
    if (text.toLowerCase().includes('did not gave') || text.toLowerCase().includes('did not went')) {
      grammarErr = {
        mistake: 'did not gave',
        correction: 'did not give',
        reason: 'Sau trợ động từ "did/did not" động từ chính luôn giữ nguyên thể.'
      };
    } else if (text.toLowerCase().includes('very much like')) {
      grammarErr = {
        mistake: 'very much like',
        correction: 'really like / like very much',
        reason: 'Trạng từ "very much" thường đứng sau tân ngữ thay vì trước động từ.'
      };
    }

    const userMsg: Message = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: text,
      grammarError: grammarErr,
      score: grammarErr ? 78 : 94
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // AI Replies
    setTimeout(() => {
      const aiReplies = [
        "That demonstrates remarkable resilience under pressure! How did your strategy affect the long-term collaboration with your team?",
        "Fascinating insights. Could you elaborate on what tools or methodology you leveraged to ensure high accuracy?",
        "Thank you for sharing that experience. It aligns well with our core company values."
      ];
      const nextReply = aiReplies[Math.floor(Math.random() * aiReplies.length)];

      const aiMsg: Message = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: nextReply,
        audioText: nextReply
      };
      setMessages(prev => [...prev, aiMsg]);
      speakText(nextReply, 'en-US');
    }, 1200);
  };

  const handleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    const rec = startSpeechRecognition(
      (transcript) => {
        setInputText(transcript);
      },
      () => {
        // Fallback simulation
        setTimeout(() => {
          setInputText("In my previous project, we were resilient when facing tight deadlines and managed to leverage AI tools for a breakthrough.");
          setIsRecording(false);
        }, 2500);
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-[16px] border bg-background shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-emerald-600 text-white font-black">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                Luyện Nói Tương Tác Cùng AI Conversation
              </h2>
              <p className="text-xs text-muted-foreground">
                Chủ đề: Phỏng vấn xin việc (Job Interview) • Đánh giá ngữ pháp & PronScore
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mandatory Target Words Banner */}
        <div className="bg-muted/40 border-b px-6 py-2.5 flex items-center justify-between text-xs">
          <span className="font-bold text-foreground">Từ vựng bắt buộc ép vào câu:</span>
          <div className="flex items-center gap-2">
            {mandatoryWords.map((word) => {
              const isUsed = usedWords.has(word);
              return (
                <span
                  key={word}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                    isUsed
                      ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/30'
                      : 'bg-card text-muted-foreground border-border'
                  }`}
                >
                  {isUsed && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                  {word}
                </span>
              );
            })}
          </div>
        </div>

        {/* Chat Messages Log */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div className={`max-w-[80%] space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-[14px] p-4 text-xs leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-card border text-foreground rounded-tl-none'
                  }`}
                >
                  <p>{msg.text}</p>

                  {msg.audioText && (
                    <button
                      onClick={() => handleSpeakAi(msg.audioText!)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>Nghe AI phát âm</span>
                    </button>
                  )}
                </div>

                {/* Grammar Feedback Alert if user made a mistake */}
                {msg.grammarError && (
                  <div className="rounded-[10px] bg-red-50 dark:bg-red-950/40 border border-red-500/30 p-3 text-xs space-y-1 text-red-900 dark:text-red-200">
                    <p className="font-bold flex items-center gap-1.5 text-red-700 dark:text-red-300">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Lỗi ngữ pháp: "{msg.grammarError.mistake}" → Sửa thành: "{msg.grammarError.correction}"
                    </p>
                    <p className="text-[11px] text-muted-foreground">{msg.grammarError.reason}</p>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="border-t p-4 bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={handleRecord}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] text-white transition-all ${
                isRecording ? 'bg-red-500 animate-pulse' : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
              title="Bật micro nói trực tiếp"
            >
              <Mic className="h-5 w-5" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập câu trả lời hoặc dùng micro..."
              className="flex-1 rounded-[8px] border border-input bg-background px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <button
              type="submit"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
              title="Gửi câu trả lời"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

