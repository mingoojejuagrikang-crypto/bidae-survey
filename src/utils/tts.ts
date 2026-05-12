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

export function speakAsync(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) { resolve(); return }
    const synth = window.speechSynthesis
    // No voices = headless/unsupported; resolve immediately
    if (synth.getVoices().length === 0) { resolve(); return }
    synth.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'ko-KR'
    utt.rate = 1.1
    let done = false
    const finish = () => { if (!done) { done = true; resolve() } }
    utt.onend = finish
    utt.onerror = finish
    setTimeout(finish, 5000)
    synth.speak(utt)
  })
}
