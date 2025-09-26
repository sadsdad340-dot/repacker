import { pack } from 'https://unpkg.com/bin-pack@5.0.0?module';

// Utility: read text file
async function readFile(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload  = () => res(fr.result);
    fr.onerror = () => rej(fr.error);
    fr.readAsText(file);
  });
}

// Parse Animate dump into frame defs
function parseAnimate(text) {
  const frames = [];
  const regex  = /SPRITE[\s\S]*?name\s*"(\d+)"[\s\S]*?x\s*(\d+)[\s\S]*?y\s*(\d+)[\s\S]*?w\s*(\d+)[\s\S]*?h\s*(\d+)/g;
  let m;
  while ((m = regex.exec(text))) {
    frames.push({ name: m[1], x:+m[2], y:+m[3], w:+m[4], h:+m[5] });
  }
  return frames;
}

// Trigger repack
document.getElementById('run').onclick = async () => {
  const atlasFile = atlas.files[0];
  const dataFile  = data.files[0];
  if (!atlasFile || !dataFile) return alert('Please select both PNG and TXT.');

  // 1) Parse data
  const text   = await readFile(dataFile);
  const frames = parseAnimate(text);

  // 2) Load atlas image
  const img = await new Promise(r => {
    const i = new Image();
    i.onload  = () => r(i);
    i.src     = URL.createObjectURL(atlasFile);
  });

  // 3) Crop each frame
  const images = frames.map(f => {
    const c = document.createElement('canvas');
    c.width  = f.w; c.height = f.h;
    c.getContext('2d').drawImage(img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
    return { width: f.w, height: f.h, canvas: c, name: f.name };
  });

  // 4) Pack with MaxRects
  const { width, height, positions } = pack(images);

  // 5) Render new atlas
  const outC = output;
  outC.width  = width;
  outC.height = height;
  const ctx = outC.getContext('2d');

  const meta = { frames: {}, meta: { width, height } };
  images.forEach((img, i) => {
    const p = positions[i];
    ctx.drawImage(img.canvas, p.x, p.y);
    meta.frames[img.name] = { frame: { x:p.x, y:p.y, w:img.width, h:img.height } };
  });

  // 6) Download results
  outC.toBlob(b => downloadBlob(b, 'repacked.png'));
  downloadText(JSON.stringify(meta, null,2), 'repacked.json');
};

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download= name;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadText(txt, name) {
  const b = new Blob([txt], { type: 'application/json' });
  downloadBlob(b, name);
}
