export function playAudio(text: string, lang = 'en-US', rate = 1.0, voiceUri = '') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;

  // Prefer natural English voices if available
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(v => v.voiceURI === voiceUri) || voices.find(v => v.lang.startsWith(lang.slice(0, 2)) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export function speechRecognitionAvailable() {
  return typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

// Returns a cancel function; recognition starts only after the learner presses the microphone.
export function recognizeSpeech(onText: (text: string) => void, onEnd: () => void, onError: (message: string) => void, lang = 'en-US') {
  const Constructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Constructor) { onError('Trình duyệt không hỗ trợ nhận giọng nói. Bạn vẫn có thể nhập câu trả lời.'); return () => {}; }
  const recognition = new Constructor();
  recognition.lang = lang; recognition.interimResults = false; recognition.continuous = false;
  recognition.onresult = (event: any) => onText(event.results[0][0].transcript);
  recognition.onerror = (event: any) => onError(event.error === 'not-allowed' ? 'Quyền micro chưa được cấp. Bạn có thể nhập câu trả lời.' : 'Không nhận được giọng nói. Hãy thử lại hoặc nhập câu trả lời.');
  recognition.onend = onEnd;
  recognition.start();
  return () => { recognition.onend = null; recognition.abort(); };
}

