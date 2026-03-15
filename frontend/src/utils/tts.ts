let voices: SpeechSynthesisVoice[] = [];

const loadVoices = () => {
  voices = window.speechSynthesis.getVoices();
};

// VERY IMPORTANT
if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export const speakText = (text: string, lang = "en-US") => {
  if (!text) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;

  // find best matching voice
  const voice =
    voices.find(v => v.lang === lang) ||
    voices.find(v => v.lang.startsWith(lang.split("-")[0])) ||
    null;

  if (voice) {
    utterance.voice = voice;
  }

  utterance.rate = 1;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
};
