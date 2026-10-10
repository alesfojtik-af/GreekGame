"""Složí tři hudební smyčky hry (MIDI) a vyrenderuje je skutečnými nástroji.

Průzkum: pomalý epický pochod (bubny, sbor, lesní rohy).
Boj: rychlý rytmus v 6/8 (smyčce, rohy, trubky, tympány).
Hádanky: tichá harfa, smyčce a flétna.

Spuštění (potřebuje fluidsynth, FluidR3_GM.sf2, ffmpeg, mido, numpy):
    python3 tools/music/compose.py
Výstup: src/assets/music/{explore,combat,puzzle}.webm (Opus, smyčka bez švu).
"""
import os
import random
import subprocess
import wave

import mido
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'src', 'assets', 'music')
TMP = os.path.join(ROOT, 'tools', 'music', 'build')
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
RATE = 48000
TPB = 480  # tiků na čtvrťovou notu

NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def p(name):
    """'C#4' -> MIDI číslo."""
    n = NOTE[name[0]]
    i = 1
    while i < len(name) and name[i] in '#b':
        n += 1 if name[i] == '#' else -1
        i += 1
    return n + 12 * (int(name[i:]) + 1)


CHORDS = {
    'Dm': ['D', 'F', 'A'], 'C': ['C', 'E', 'G'], 'Bb': ['Bb', 'D', 'F'], 'A': ['A', 'C#', 'E'],
    'F': ['F', 'A', 'C'], 'Gm': ['G', 'Bb', 'D'], 'Asus': ['A', 'D', 'E'],
}


def pc(name):
    return p(name + '4') % 12


class Song:
    def __init__(self, beats_per_bar, beat_ticks, qpm, bars):
        self.bpb = beats_per_bar
        self.bt = beat_ticks
        self.qpm = qpm
        self.bars = bars
        self.parts = {}
        self.rng = random.Random(7)

    def part(self, name, ch, program, vol=100, pan=64, rev=70):
        self.parts[name] = {'ch': ch, 'program': program, 'vol': vol, 'pan': pan, 'rev': rev, 'notes': [], 'cc': []}
        return name

    def note(self, part, bar, beat, dur, pitch, vel, human=True):
        t = int(((bar - 1) * self.bpb + beat) * self.bt)
        d = int(dur * self.bt)
        if human:
            t = max(0, t + self.rng.randint(-8, 8))
            vel = max(1, min(127, vel + self.rng.randint(-5, 5)))
        self.parts[part]['notes'].append((t, d, pitch, vel))

    def cc(self, part, bar, beat, num, val):
        t = int(((bar - 1) * self.bpb + beat) * self.bt)
        self.parts[part]['cc'].append((t, num, val))

    def length_ticks(self):
        return self.bars * self.bpb * self.bt

    def seconds(self):
        return self.length_ticks() / TPB * 60 / self.qpm

    def save(self, path, tail_s=5.0):
        mid = mido.MidiFile(ticks_per_beat=TPB)
        meta = mido.MidiTrack()
        meta.append(mido.MetaMessage('set_tempo', tempo=int(60e6 / self.qpm), time=0))
        mid.tracks.append(meta)
        tail = int(tail_s * self.qpm / 60 * TPB)
        for prt in self.parts.values():
            tr = mido.MidiTrack()
            ch = prt['ch']
            ev = [(0, 0, mido.Message('program_change', channel=ch, program=prt['program']))]
            ev.append((0, 0, mido.Message('control_change', channel=ch, control=7, value=prt['vol'])))
            ev.append((0, 0, mido.Message('control_change', channel=ch, control=10, value=prt['pan'])))
            ev.append((0, 0, mido.Message('control_change', channel=ch, control=91, value=prt['rev'])))
            ev.append((0, 0, mido.Message('control_change', channel=ch, control=93, value=0)))
            for t, num, val in prt['cc']:
                ev.append((t, 0, mido.Message('control_change', channel=ch, control=num, value=val)))
            for t, d, pitch, vel in prt['notes']:
                ev.append((t, 2, mido.Message('note_on', channel=ch, note=pitch, velocity=vel)))
                ev.append((t + d, 1, mido.Message('note_off', channel=ch, note=pitch, velocity=0)))
            # prodloužení stopy, aby dozněl dozvuk
            ev.append((self.length_ticks() + tail, 3, mido.Message('control_change', channel=ch, control=110, value=0)))
            ev.sort(key=lambda e: (e[0], e[1]))
            last = 0
            for t, _, msg in ev:
                tr.append(msg.copy(time=t - last))
                last = t
            mid.tracks.append(tr)
        mid.save(path)


def check_melody(song, part, chords, strong):
    """Na silných dobách musí melodie znít tónem akordu (ochrana proti chybám v zápisu)."""
    bad = []
    for t, d, pitch, _ in song.parts[part]['notes']:
        beat_pos = t / song.bt
        bar = int(beat_pos // song.bpb)
        pos = beat_pos - bar * song.bpb
        for s in strong:
            if abs(pos - s) < 0.05:
                ch = chords[bar] if isinstance(chords[bar], str) else (chords[bar][0] if s < song.bpb / 2 else chords[bar][1])
                if pitch % 12 not in [pc(x) for x in CHORDS[ch]]:
                    bad.append((bar + 1, s, pitch, ch))
    if bad:
        raise SystemExit(f'{part}: tón mimo akord na silné době: {bad}')


def melody(song, part, start_bar, bars, vel, octave_shift=0, unit=1.0, human=True):
    """bars: seznam taktů, každý takt seznam (nota, délka v jednotkách); 'r' = pauza."""
    for i, notes in enumerate(bars):
        beat = 0.0
        for name, dur in notes:
            if name != 'r':
                song.note(part, start_bar + i, beat, dur * unit * 0.95, p(name) + 12 * octave_shift, vel, human)
            beat += dur * unit
        assert abs(beat - song.bpb) < 1e-6, f'{part} takt {start_bar + i}: délka {beat}'


# ---------------------------------------------------------------- průzkum (Conan)
def explore():
    s = Song(4, TPB, 62, 16)
    chords = ['Dm', 'Dm', 'C', 'A', 'Dm', 'Bb', 'C', 'A', 'Dm', 'F', 'C', 'Dm', 'Bb', 'C', 'A', 'Asus']
    s.part('choir', 0, 52, vol=78, pan=64, rev=90)
    s.part('low', 1, 49, vol=92, pan=50, rev=70)
    s.part('bass', 2, 43, vol=88, pan=60, rev=50)
    s.part('horn', 3, 60, vol=104, pan=48, rev=85)
    s.part('brass', 4, 61, vol=72, pan=78, rev=80)
    s.part('taiko', 5, 116, vol=96, pan=64, rev=60)
    s.part('timp', 6, 47, vol=92, pan=70, rev=70)

    voicing = {'Dm': ['D4', 'F4', 'A4'], 'C': ['C4', 'E4', 'G4'], 'Bb': ['D4', 'F4', 'Bb4'], 'A': ['C#4', 'E4', 'A4'],
               'F': ['C4', 'F4', 'A4'], 'Asus': ['D4', 'E4', 'A4']}
    root = {'Dm': 'D', 'C': 'C', 'Bb': 'Bb', 'A': 'A', 'F': 'F', 'Asus': 'A'}
    for b, ch in enumerate(chords, 1):
        v = 46 if b <= 4 else 54 if b <= 12 else 62
        for n in voicing[ch]:
            s.note('choir', b, 0, 3.9, p(n), v)
        r = root[ch]
        low = p(r + '3') if p(r + '3') <= p('D3') + 2 else p(r + '2')
        s.note('low', b, 0, 3.9, low, 58)
        s.note('low', b, 0, 3.9, low + 12, 44)
        s.note('bass', b, 0, 3.9, low - 12 if low - 12 >= p('C2') else low, 62)
        # válečný buben: 1, 2+, 3
        s.note('taiko', b, 0, 0.5, p('F2'), 84 if b % 4 == 1 else 72)
        s.note('taiko', b, 1.5, 0.5, p('F2'), 46)
        s.note('taiko', b, 2, 0.5, p('F2'), 64)
        if b % 2 == 0:
            s.note('taiko', b, 3.5, 0.5, p('F2'), 40)
    # sbor postupně sílí ke konci
    for b in range(1, 17):
        s.cc('choir', b, 0, 11, 80 if b <= 12 else 80 + (b - 12) * 10)
    # tympány: úder na začátku frází a vír na konci smyčky
    for b in (1, 5, 9, 13):
        s.note('timp', b, 0, 1.5, p('D2'), 78)
    for i in range(16):
        s.note('timp', 16, 2 + i * 0.125, 0.12, p('A2'), 36 + i * 3, human=False)

    # lesní roh: výzva v úvodu a hlavní téma
    melody(s, 'horn', 2, [[('A3', 1), ('D4', 3)]], 64)
    melody(s, 'horn', 4, [[('E4', 2), ('A3', 2)]], 60)
    theme = [
        [('D4', 1.5), ('E4', 0.5), ('F4', 1), ('A4', 1)],
        [('Bb4', 2), ('F4', 1), ('G4', 1)],
        [('G4', 2), ('E4', 1), ('F4', 1)],
        [('E4', 2), ('C#4', 1), ('E4', 1)],
        [('F4', 1.5), ('E4', 0.5), ('D4', 1), ('A4', 1)],
        [('C5', 2), ('A4', 1), ('F4', 1)],
        [('G4', 1.5), ('A4', 0.5), ('G4', 1), ('E4', 1)],
        [('D4', 4)],
        [('F4', 1), ('Bb4', 1), ('D5', 2)],
        [('C5', 1.5), ('Bb4', 0.5), ('G4', 2)],
        [('A4', 3), ('G4', 0.5), ('F4', 0.5)],
        [('E4', 4)],
    ]
    melody(s, 'horn', 5, theme, 76)
    melody(s, 'brass', 13, theme[8:], 50, octave_shift=-1)
    check_melody(s, 'horn', chords, [0, 2])
    return s, 'explore'


# ---------------------------------------------------------------- boj (Piráti)
def combat():
    # 6/8: doba = osmina, takt = 6 osmin
    s = Song(6, TPB // 2, 116, 24)
    chords = ['Dm', 'Dm', 'Bb', 'C', 'F', 'C', 'Gm', 'A',
              'Dm', 'Dm', 'Bb', 'C', 'Gm', 'Bb', 'A', 'A',
              'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'Gm', 'A']
    s.part('cello', 0, 42, vol=100, pan=46, rev=50)
    s.part('cbass', 1, 43, vol=96, pan=56, rev=40)
    s.part('strings', 2, 48, vol=86, pan=84, rev=70)
    s.part('violins', 3, 48, vol=84, pan=92, rev=75)
    s.part('horn', 4, 60, vol=108, pan=40, rev=75)
    s.part('trumpet', 5, 56, vol=80, pan=70, rev=70)
    s.part('timp', 6, 47, vol=100, pan=64, rev=60)
    s.part('taiko', 7, 116, vol=90, pan=64, rev=55)
    s.part('trombone', 8, 57, vol=84, pan=58, rev=65)
    s.part('drums', 9, 0, vol=70, pan=64, rev=70)

    roots = {'Dm': 'D', 'Bb': 'Bb', 'C': 'C', 'F': 'F', 'Gm': 'G', 'A': 'A'}
    stab = {'Dm': ['D4', 'F4', 'A4'], 'Bb': ['D4', 'F4', 'Bb4'], 'C': ['E4', 'G4', 'C5'], 'F': ['F4', 'A4', 'C5'],
            'Gm': ['D4', 'G4', 'Bb4'], 'A': ['E4', 'A4', 'C#5']}
    accents = [104, 58, 70, 96, 58, 72]
    for b, ch in enumerate(chords, 1):
        r = roots[ch]
        cel = p(r + '3') if p(r + '3') <= p('D3') + 3 else p(r + '2')
        for e in range(6):
            s.note('cello', b, e, 0.75, cel, accents[e])
            s.note('cbass', b, e, 0.75, cel - 12, accents[e] - 10)
        for n in stab[ch]:
            s.note('strings', b, 0, 1.6, p(n), 74)
            s.note('strings', b, 3, 1.6, p(n), 66)
        tim = p(r + '2') if p(r + '2') >= p('A1') else p(r + '3')
        s.note('timp', b, 0, 1, tim, 92 if b % 8 == 1 else 80)
        s.note('timp', b, 3, 1, tim, 66)
        s.note('taiko', b, 0, 0.5, p('F2'), 92)
        s.note('taiko', b, 3, 0.5, p('F2'), 72)
        s.note('trombone', b, 0, 5.7, cel, 56 if b <= 16 else 70)
        if b % 8 == 0:  # nájezd do další fráze
            for e, v in ((3, 60), (4, 76), (5, 96)):
                s.note('taiko', b, e, 0.5, p('F2'), v, human=False)
    for b in (1, 9, 17):
        s.note('drums', b, 0, 3, 49, 74)  # činel na začátku frází

    a = [
        [('D5', 2), ('A4', 1), ('D5', 2), ('F5', 1)],
        [('A5', 2), ('G5', 1), ('F5', 3)],
        [('D5', 2), ('C5', 1), ('Bb4', 2), ('C5', 1)],
        [('E5', 2), ('D5', 1), ('C5', 3)],
        [('F5', 2), ('G5', 1), ('A5', 2), ('F5', 1)],
        [('G5', 2), ('F5', 1), ('E5', 2), ('C5', 1)],
        [('D5', 2), ('Bb4', 1), ('G4', 2), ('Bb4', 1)],
        [('A4', 3), ('C#5', 2), ('E5', 1)],
        [('F5', 2), ('E5', 1), ('D5', 2), ('A4', 1)],
        [('D5', 1), ('E5', 1), ('F5', 1), ('A5', 3)],
        [('Bb5', 2), ('A5', 1), ('F5', 2), ('D5', 1)],
        [('G5', 2), ('E5', 1), ('C5', 2), ('E5', 1)],
        [('G5', 2), ('F5', 1), ('D5', 2), ('Bb4', 1)],
        [('F5', 2), ('D5', 1), ('Bb4', 2), ('D5', 1)],
        [('E5', 3), ('C#5', 2), ('A4', 1)],
        [('A4', 3), ('E5', 3)],
    ]
    b_sec = [
        [('D5', 3), ('F5', 3)],
        [('C5', 3), ('A4', 3)],
        [('E5', 2), ('D5', 1), ('C5', 2), ('G4', 1)],
        [('D5', 6)],
        [('F5', 2), ('G5', 1), ('F5', 2), ('D5', 1)],
        [('C5', 2), ('D5', 1), ('C5', 2), ('A4', 1)],
        [('Bb4', 2), ('A4', 1), ('G4', 2), ('D5', 1)],
        [('C#5', 3), ('E5', 3)],
    ]
    melody(s, 'horn', 1, a, 88, octave_shift=-1)
    melody(s, 'violins', 9, a[8:], 74)
    melody(s, 'horn', 17, b_sec, 92, octave_shift=-1)
    melody(s, 'trumpet', 17, b_sec, 70)
    check_melody(s, 'horn', chords, [0, 3])
    return s, 'combat'


# ---------------------------------------------------------------- hádanky
def puzzle():
    s = Song(4, TPB, 58, 8)
    chords = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'F', 'Gm', 'A']
    s.part('harp', 0, 46, vol=92, pan=80, rev=90)
    s.part('pad', 1, 49, vol=70, pan=48, rev=95)
    s.part('flute', 2, 73, vol=74, pan=56, rev=95)
    arps = {'Dm': ['D3', 'A3', 'D4', 'F4', 'A4', 'F4', 'D4', 'A3'], 'Bb': ['Bb2', 'F3', 'Bb3', 'D4', 'F4', 'D4', 'Bb3', 'F3'],
            'Gm': ['G2', 'D3', 'G3', 'Bb3', 'D4', 'Bb3', 'G3', 'D3'], 'A': ['A2', 'E3', 'A3', 'C#4', 'E4', 'C#4', 'A3', 'E3'],
            'F': ['F2', 'C3', 'F3', 'A3', 'C4', 'A3', 'F3', 'C3']}
    pads = {'Dm': ['D3', 'A3', 'F4'], 'Bb': ['Bb2', 'F3', 'D4'], 'Gm': ['G2', 'D3', 'Bb3'], 'A': ['A2', 'E3', 'C#4'], 'F': ['F2', 'C3', 'A3']}
    for b, ch in enumerate(chords, 1):
        for i, n in enumerate(arps[ch]):
            s.note('harp', b, i * 0.5, 1.2, p(n), 58 if i == 0 else 44)
        for n in pads[ch]:
            s.note('pad', b, 0, 3.95, p(n), 40)
    fl = [
        [('r', 2), ('A4', 2)],
        [('Bb4', 3), ('A4', 1)],
        [('G4', 2), ('D5', 2)],
        [('C#5', 3), ('A4', 1)],
        [('D5', 2), ('F5', 1), ('E5', 1)],
        [('A4', 2), ('C5', 2)],
        [('Bb4', 2), ('G4', 1), ('A4', 1)],
        [('E5', 2), ('C#5', 2)],
    ]
    melody(s, 'flute', 1, fl, 54)
    check_melody(s, 'flute', chords, [0, 2])
    return s, 'puzzle'


def read_wav(path):
    with wave.open(path) as w:
        n = w.getnframes()
        data = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
        return data.reshape(-1, w.getnchannels())


def write_wav(path, x):
    y = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(y.tobytes())


def render(song, name, loudness):
    os.makedirs(TMP, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    mid = os.path.join(TMP, name + '.mid')
    raw = os.path.join(TMP, name + '_raw.wav')
    song.save(mid)
    subprocess.run(['fluidsynth', '-ni', '-q', '-r', str(RATE), '-g', '0.6',
                    '-o', 'synth.reverb.room-size=0.75', '-o', 'synth.reverb.damp=0.35',
                    '-o', 'synth.reverb.width=1.0', '-o', 'synth.reverb.level=0.75',
                    '-o', 'synth.chorus.active=0',
                    '-F', raw, SF2, mid], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    x = read_wav(raw)
    n = int(round(song.seconds() * RATE))
    body = x[:n].copy()
    tail = x[n:]
    k = min(len(tail), n)
    body[:k] += tail[:k]  # dozvuk z konce smyčky přeneseme na její začátek: smyčka nemá šev
    rms = float(np.sqrt(np.mean(body ** 2)))
    body *= loudness / max(rms, 1e-6)
    peak = float(np.max(np.abs(body)))
    if peak > 0.95:
        body *= 0.95 / peak
    wav = os.path.join(TMP, name + '.wav')
    write_wav(wav, body)
    out = os.path.join(OUT, name + '.webm')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libopus', '-b:a', '72k', '-application', 'audio', out], check=True)
    print(f'{name}: {n / RATE:.3f} s, {n} vzorků, {os.path.getsize(out) // 1024} kB')
    return n


if __name__ == '__main__':
    lengths = {}
    for fn, loud in ((explore, 0.12), (combat, 0.14), (puzzle, 0.09)):
        song, name = fn()
        lengths[name] = render(song, name, loud)
    with open(os.path.join(OUT, 'loops.json'), 'w') as f:
        import json
        json.dump({k: {'samples': v, 'rate': RATE} for k, v in lengths.items()}, f)
