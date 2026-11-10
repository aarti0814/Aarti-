import json, subprocess, wave
import numpy as np
SR = 44100; DUR = 59.9; N = int(SR * DUR)
rng = np.random.default_rng(3)

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)

def put(buf, sig, t, gain=1.0):
    i = int(t * SR)
    if i >= len(buf): return
    sig = sig[: len(buf) - i]
    buf[i:i + len(sig)] += sig * gain

def env(n, a=0.004, d=0.1):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)

def tone(f0, f1, dur, harm=(1.0,), d=None):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur) if f1 else np.full(n, f0)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = sum(a * np.sin(ph * (k + 1)) for k, a in enumerate(harm))
    return s * env(n, 0.004, d or dur / 4)

def bell(f, dur=1.2):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2*np.pi*f*t) + 0.45*np.sin(2*np.pi*f*2.76*t)*np.exp(-t/0.25) + 0.25*np.sin(2*np.pi*f*5.4*t)*np.exp(-t/0.12)
    return s * env(n, 0.003, 0.45)

def noise(dur, d):
    n = int(dur * SR); return rng.standard_normal(n) * env(n, 0.002, d)

# ---------------- voice ----------------
voice = np.zeros(N)
VO = [('../assets/vo/L1.mp3', 0.4), ('../assets/vo/L2.mp3', 7.2), ('../assets/vo/L4.mp3', 27.94), ('../assets/vo/L5.mp3', 37.8), ('../assets/vo/L6.mp3', 48.2)]
for p, t in VO: put(voice, load(p), t)

# ---------------- sound effects from the simulation ----------------
sfx = np.zeros(N)
ev = json.load(open('events.json'))
last = -1; home_k = 0
PENT = [0, 2, 4, 7, 9]
for e in ev['events']:
    t = e['vt']
    if e['type'] in ('up', 'down'):
        if t - last < 0.045: continue
        last = t
        n = e['n']
        if e['type'] == 'up':
            f = 260 + 55 * np.log2(n + 1)
            put(sfx, tone(f, f * 1.5, 0.08, (1, 0.3), 0.03), t, 0.10)
        else:
            f = 900 + 20 * np.log2(n + 1)
            put(sfx, tone(f, f * 0.7, 0.05, (1,), 0.015), t, 0.06)
    elif e['type'] == 'home':
        k = e['k']; semis = PENT[k % 5] + 12 * ((k // 5) % 3)
        put(sfx, bell(523.25 * 2 ** (semis / 12)), t, 0.16)
    elif e['type'] == 'peak27':
        # riser into the peak, then a deep boom
        rd = 3.0; n = int(rd * SR); tt = np.arange(n) / SR
        riser = rng.standard_normal(n) * (tt / rd) ** 2.2
        riser = np.convolve(riser, np.ones(8) / 8, mode='same')
        put(sfx, riser, t - rd, 0.22)
        put(sfx, tone(70, 32, 1.6, (1, 0.4), 0.5), t, 0.9)
        put(sfx, noise(0.8, 0.18), t, 0.25)
        for i, f in enumerate([220, 277.2, 329.6, 440]): put(sfx, bell(f * 2, 1.8), t + 0.05 + i * 0.06, 0.12)
    elif e['type'] == 'all':
        put(sfx, tone(55, 40, 2.4, (1, 0.5, 0.25), 0.9), t, 0.8)
        for i, f in enumerate([261.6, 329.6, 392.0, 523.3, 659.3]): put(sfx, bell(f, 2.6), t + i * 0.07, 0.14)

# ---------------- music: ambient Am – F – C – G pad + soft arpeggio ----------------
music = np.zeros(N)
CHORDS = [[110.0, 164.8, 220.0, 261.6], [87.3, 130.8, 174.6, 220.0], [130.8, 196.0, 261.6, 329.6], [98.0, 146.8, 196.0, 246.9]]
seg = 6.0
for ci in range(int(DUR / seg) + 2):
    ch = CHORDS[ci % 4]; t0 = ci * seg - 1.0
    n = int((seg + 2.0) * SR); tt = np.arange(n) / SR
    fade = np.clip(np.minimum(tt / 1.5, (seg + 2.0 - tt) / 1.5), 0, 1)
    s = np.zeros(n)
    for f in ch:
        for det in (-0.6, 0.6):
            s += (np.sin(2*np.pi*(f+det)*tt) + 0.35*np.sin(2*np.pi*2*(f+det)*tt) + 0.12*np.sin(2*np.pi*3*(f+det)*tt))
    lfo = 0.85 + 0.15 * np.sin(2 * np.pi * 0.15 * tt)
    if t0 < 0: s = s[int(-t0 * SR):]; fade = fade[int(-t0 * SR):]; lfo = lfo[int(-t0 * SR):]; t0 = 0
    put(music, s * fade * lfo, t0, 0.018)
beat = 60 / 96 / 2
for i in range(int(DUR / beat)):
    t = i * beat; ch = CHORDS[int(t // seg) % 4]
    f = ch[[1, 2, 3, 2][i % 4]] * 2
    put(music, tone(f, 0, 0.35, (1, 0.25), 0.12), t, 0.035 if t > 7 else 0.02)

# ---------------- mix: duck music + sfx under the voice ----------------
k = int(0.25 * SR)
venv = np.convolve(np.abs(voice), np.ones(k) / k, mode='same')
venv = np.clip(venv / (venv.max() * 0.15 + 1e-9), 0, 1)
duck = 1 - 0.55 * venv
mix = voice * 1.0 + music * duck * 1.0 + sfx * (1 - 0.35 * venv)
# fade in/out
fi = int(0.3 * SR); fo = int(1.2 * SR)
mix[:fi] *= np.linspace(0, 1, fi); mix[-fo:] *= np.linspace(1, 0, fo)
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.4) / np.tanh(1.4) * 0.95
st = np.stack([mix, mix], axis=1)
with wave.open('soundtrack.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
print('soundtrack.wav', round(len(mix) / SR, 2), 's')
