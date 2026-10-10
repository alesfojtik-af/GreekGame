// Diktování odpovědí přes mikrofon (Web Speech API, cs-CZ) a měření hlasitosti.

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

export const speechSupported = !!SR;

// Spustí rozpoznávání. Vrací Promise<{ text, peak }>, kde peak je 0..1 (nejvyšší hlasitost).
export function listen(onInterim) {
  return new Promise(async (resolve, reject) => {
    if (!SR) return reject(new Error('Diktování tento prohlížeč nepodporuje. Zkus Chrome nebo Edge.'));
    let peak = 0;
    let stream = null;
    let raf = 0;
    let actx = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AC = window.AudioContext || window.webkitAudioContext;
      actx = new AC();
      const src = actx.createMediaStreamSource(stream);
      const an = actx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      const buf = new Float32Array(an.fftSize);
      const loop = () => {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        peak = Math.max(peak, rms);
        raf = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      // Bez měření hlasitosti diktování pořád funguje.
    }

    const cleanup = () => {
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (actx) actx.close();
    };

    const rec = new SR();
    rec.lang = 'cs-CZ';
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    let finalText = '';
    let alts = [];
    rec.onresult = (ev) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) {
          finalText += r[0].transcript;
          for (let k = 0; k < r.length; k++) alts.push(r[k].transcript);
        } else interim += r[0].transcript;
      }
      if (onInterim) onInterim(finalText + interim);
    };
    rec.onerror = (ev) => {
      cleanup();
      const msg = ev.error === 'not-allowed'
        ? 'Mikrofon není povolený. Povol ho v prohlížeči, nebo odpověz psaním.'
        : ev.error === 'no-speech' ? 'Nic jsem neslyšel. Zkus to znovu.' : 'Diktování selhalo (' + ev.error + ').';
      reject(new Error(msg));
    };
    rec.onend = () => {
      cleanup();
      // Hodnota 0.25 RMS odpovídá zhruba hlasitému křiku do běžného mikrofonu.
      resolve({ text: finalText.trim(), alts, peak: Math.min(1, peak / 0.25) });
    };
    rec.start();
  });
}

export function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Odpověď je správná, pokud obsahuje některou z přijatelných odpovědí jako celé slovo/slova.
export function matches(input, answers) {
  const n = ' ' + normalize(input) + ' ';
  return answers.some((a) => n.includes(' ' + normalize(a) + ' '));
}
