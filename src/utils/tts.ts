let ttsEnabled = true

export function setTTSEnabled(v: boolean) {
  ttsEnabled = v
}

export function speak(text: string): void {
  if (!ttsEnabled) return
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'ko-KR'
  utt.rate = 1.1
  window.speechSynthesis.speak(utt)
}
