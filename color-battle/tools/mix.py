import json, wave
import numpy as np
SR = 44100
D = json.load(open('events.json')); DUR = D['duration']; N = int(SR * DUR)
END = D['info']['endVT']; INTRO = 3.2
rng = np.random.default_rng(5)
out = np.zeros(N)
def put(sig, t, gain=1.0):
    i = int(t * SR)
    if i >= N or i < 0: return
    sig = sig[: N - i]; out[i:i + len(sig)] += sig * gain
def env(n, a, d):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)
def tone(f0, f1, dur, harm=(1.0,), a=0.004, d=None):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur) if f1 else np.full(n, f0)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return sum(h * np.sin(ph * (k + 1)) for k, h in enumerate(harm)) * env(n, a, d or dur / 3)
def noise(dur, d, smooth=1):
    n = int(dur * SR); s = rng.standard_normal(n)
    if smooth > 1: s = np.convolve(s, np.ones(smooth) / smooth, mode='same')
    return s * env(n, 0.001, d)
def piano(f, dur=0.55):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2*np.pi*f*t) + 0.5*np.sin(2*np.pi*2*f*t)*np.exp(-t/0.2) + 0.25*np.sin(2*np.pi*3*f*t)*np.exp(-t/0.12) + 0.1*np.sin(2*np.pi*4.01*f*t)*np.exp(-t/0.08)
    return s * env(n, 0.003, 0.28)

# countdown
for k in range(3): put(tone(880, 0, 0.18, (1, 0.3)), k * INTRO / 3, 0.35)
put(tone(1320, 0, 0.45, (1, 0.4, 0.2)), INTRO, 0.4)
put(noise(0.4, 0.12, 3), INTRO, 0.15)

# "In the Hall of the Mountain King" (Grieg, 1875, public domain): one note per wall bounce
MK = [0, 2, 3, 5, 7, 3, 7, 6, 2, 6, 5, 1, 5, 0, 2, 3, 5, 7, 3, 7, 12, 10, 7, 3, 7, 10]
B4 = 493.88
idx = 0; last = -1
for e in D['events']:
    if e['type'] != 'wall' or e['vt'] > END: continue
    if e['vt'] - last < 0.075: continue
    last = e['vt']
    cyc = idx // len(MK); semis = MK[idx % len(MK)] + min(cyc, 6)
    f = B4 * 2 ** (semis / 12)
    put(piano(f), e['vt'], 0.26)
    put(piano(f / 4, 0.4), e['vt'], 0.10)              # bass doubling
    idx += 1

# accelerating kick drum during the fight
t = INTRO
while t < END:
    prog = (t - INTRO) / (END - INTRO)
    put(tone(110, 45, 0.22, (1,), 0.002, 0.07), t, 0.45)
    t += 60 / (118 + 60 * prog)

# hits, crits, knockouts
for e in D['events']:
    t = e['vt']
    if e['type'] == 'hit':
        put(tone(170, 55, 0.16, (1, 0.3), 0.002, 0.05), t, 0.6)
        put(noise(0.08, 0.02, 2), t, 0.25)
        if e['crit']:
            put(tone(1800, 1200, 0.5, (1, 0.5), 0.002, 0.15), t, 0.12)
            put(noise(0.25, 0.08), t, 0.25)
    elif e['type'] == 'ko':
        put(tone(90, 30, 1.2, (1, 0.5), 0.002, 0.35), t, 1.0)
        put(noise(0.9, 0.25, 4), t, 0.5)
        put(tone(700, 120, 0.6, (1, 0.4), 0.01, 0.2), t + 0.05, 0.18)

# victory fanfare (D major)
FAN = [(0.0, [293.7]), (0.16, [370.0]), (0.32, [440.0]), (0.5, [587.3, 740.0, 880.0])]
for dt, fs in FAN:
    for f in fs:
        put(tone(f, 0, 1.6 if dt == 0.5 else 0.3, (1, 0.6, 0.35, 0.2), 0.01, 0.6 if dt == 0.5 else 0.15), END + 0.45 + dt, 0.16)
put(noise(2.5, 0.8, 1), END + 0.95, 0.12)
put(tone(73.4, 55, 2.0, (1, 0.5), 0.005, 0.7), END + 0.95, 0.6)

fi, fo = int(0.05 * SR), int(1.0 * SR)
out[:fi] *= np.linspace(0, 1, fi); out[-fo:] *= np.linspace(1, 0, fo)
out = np.tanh(out / np.max(np.abs(out)) * 1.5) / np.tanh(1.5) * 0.95
st = np.stack([out, out], axis=1)
with wave.open('soundtrack.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print('notes played', idx, 'duration', round(DUR, 2))
