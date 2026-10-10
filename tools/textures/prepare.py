"""Připraví textury pro hru: stáhne fotografické textury z Babylon.js Assets (CC BY 4.0),
zmenší je, doplní normálové mapy tam, kde chybí, a vygeneruje mramor.

Spuštění: python3 tools/textures/prepare.py
Výstup: src/assets/tex/*.jpg a src/assets/tex/CREDITS.md
"""
import io
import os
import urllib.request

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'src', 'assets', 'tex')
SRC = 'https://raw.githubusercontent.com/BabylonJS/Assets/master/textures/'
SIZE = 512


def fetch(name):
    with urllib.request.urlopen(SRC + name, timeout=60) as r:
        return Image.open(io.BytesIO(r.read())).convert('RGB')


def save(im, name, q=84):
    im.save(os.path.join(OUT, name), 'JPEG', quality=q, optimize=True, progressive=True)


def height_to_normal(h, strength):
    """Výšková mapa (0..1) -> normálová mapa v konvenci OpenGL (jako three.js)."""
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    n = np.dstack([-gx, gy, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8))


def lum(im, blur=0):
    g = im.convert('L')
    if blur:
        g = g.filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(g, dtype=np.float32) / 255
    return (a - a.min()) / max(1e-6, a.max() - a.min())


def fbm(size, octaves, seed, base=4):
    rng = np.random.default_rng(seed)
    out = np.zeros((size, size), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        n = base * 2 ** o
        grid = rng.random((n, n)).astype(np.float32)
        layer = np.asarray(Image.fromarray((grid * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC), np.float32) / 255
        # opakovatelnost: mřížka se zabalí, takže okraje navazují
        out += layer * amp
        total += amp
        amp *= 0.5
    return out / total


def marble():
    s = SIZE
    y, x = np.mgrid[0:s, 0:s].astype(np.float32) / s
    t = fbm(s, 6, 3) * 6.0
    veins = np.abs(np.sin((x * 3 + y * 1.5) * np.pi * 2 + t))
    veins = veins ** 0.35
    base = 0.86 + fbm(s, 5, 9) * 0.1
    v = np.clip(base * (0.72 + 0.28 * veins), 0, 1)
    rgb = np.dstack([v * 0.98, v * 0.96, v * 0.92])
    img = Image.fromarray((rgb * 255).astype(np.uint8))
    nrm = height_to_normal(v, 1.5)
    return img, nrm


def main():
    os.makedirs(OUT, exist_ok=True)
    # kámen: dlažba z nepravidelných kvádrů s vlastní normálovou mapou
    stone = fetch('floor.png').resize((SIZE, SIZE), Image.LANCZOS)
    save(stone, 'stone.jpg')
    save(fetch('floorn.png').resize((SIZE, SIZE), Image.LANCZOS), 'stone_n.jpg', 90)
    # písek arény
    sand = fetch('sand.jpg').resize((SIZE, SIZE), Image.LANCZOS)
    save(sand, 'sand.jpg')
    save(height_to_normal(lum(sand, 1), 6), 'sand_n.jpg', 88)
    # dřevo dveří a beden
    wood = fetch('woodAlbedo.png').resize((SIZE, SIZE), Image.LANCZOS)
    save(wood, 'wood.jpg')
    save(height_to_normal(lum(wood, 1), 4), 'wood_n.jpg', 88)
    # tráva u východu
    save(fetch('grass.jpg').resize((SIZE, SIZE), Image.LANCZOS), 'grass.jpg', 80)
    # hrubá skála (zával, strop)
    rock = fetch('rock.png').resize((SIZE, SIZE), Image.LANCZOS)
    save(rock, 'rock.jpg')
    save(fetch('rockn.png').resize((SIZE, SIZE), Image.LANCZOS), 'rock_n.jpg', 88)
    # mramor (generovaný)
    m, mn = marble()
    save(m, 'marble.jpg')
    save(mn, 'marble_n.jpg', 88)
    with open(os.path.join(OUT, 'CREDITS.md'), 'w') as f:
        f.write('# Textury\n\n'
                'stone, sand, wood, grass, rock: Babylon.js Assets (https://github.com/BabylonJS/Assets), '
                'licence CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Zmenšeno na 512 px, '
                'normálové mapy pro písek a dřevo dopočítány z jasu.\n\n'
                'marble: vygenerováno skriptem tools/textures/prepare.py.\n')
    for fn in sorted(os.listdir(OUT)):
        print(fn, os.path.getsize(os.path.join(OUT, fn)) // 1024, 'kB')


if __name__ == '__main__':
    main()
