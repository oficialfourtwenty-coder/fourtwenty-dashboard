import { chromium } from 'playwright';
const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:5233';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox']});
const p = await b.newPage({ viewport:{ width: 1320, height: 300 }});
p.on('pageerror', e=>console.log('ERROR:', e.message));
await p.goto(`${URL}/?q=low`, { waitUntil:'domcontentloaded', timeout:120000 });
await p.waitForTimeout(3000);
const clip = process.argv[2] ?? 'Dribble';
const res = await p.evaluate(async (clip) => {
  const THREE = await import('/node_modules/three/build/three.module.js');
  const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  document.body.innerHTML = '';
  document.body.style.margin = '0';
  const ren = new THREE.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true });
  ren.setSize(1320, 300); ren.setClearColor(0x1a1a1e);
  document.body.appendChild(ren.domElement);
  const gltf = await new GLTFLoader().loadAsync('/assets/bob/bob-meshy.glb');
  const clipObj = gltf.animations.find(a => a.name === clip);
  if (!clipObj) return { error: 'no esta el clip ' + clip + ' — hay: ' + gltf.animations.map(a=>a.name).join(',') };
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const act = mixer.clipAction(clipObj); act.play();
  // 6 fotos repartidas por el clip, una al lado de la otra
  const N = 6, ancho = 1320 / N;
  const escena = new THREE.Scene();
  escena.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.2));
  const dir = new THREE.DirectionalLight(0xffffff, 1.6); dir.position.set(2,4,3); escena.add(dir);
  escena.add(gltf.scene);
  const caja = new THREE.Box3().setFromObject(gltf.scene);
  const alto = caja.max.y - caja.min.y;
  const centro = caja.getCenter(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera(35, ancho/300, 0.1, alto*20);
  const fotos = [];
  ren.setSize(ancho, 300);
  for (let i = 0; i < N; i++) {
    mixer.setTime((i / N) * clipObj.duration);
    gltf.scene.updateMatrixWorld(true);
    const c = new THREE.Box3().setFromObject(gltf.scene).getCenter(new THREE.Vector3());
    cam.position.set(centro.x, c.y, centro.z + alto * 2.0);
    cam.lookAt(centro.x, c.y, centro.z);
    ren.render(escena, cam);
    fotos.push(ren.domElement.toDataURL('image/png'));
  }
  return { fotos, ancho, dur: clipObj.duration, huesos: clipObj.tracks.length };
}, clip);
if (res.error) { console.log('✖', res.error); await b.close(); process.exit(1); }
console.log(`clip ${clip}: ${res.dur.toFixed(2)} s, ${res.huesos} pistas`);
// pegar las 6 en una tira
const tira = await p.evaluate(async ({fotos, ancho}) => {
  const c = document.createElement('canvas'); c.width = ancho*fotos.length; c.height = 300;
  const g = c.getContext('2d');
  for (let i=0;i<fotos.length;i++) {
    const im = new Image(); im.src = fotos[i];
    await im.decode();
    g.drawImage(im, i*ancho, 0);
    g.strokeStyle='#39ff6a'; g.strokeRect(i*ancho+0.5, 0.5, ancho-1, 299);
  }
  return c.toDataURL('image/png');
}, res);
const fs = await import('node:fs');
fs.writeFileSync(process.argv[3] ?? 'tira.png', Buffer.from(tira.split(',')[1], 'base64'));
console.log('foto:', process.argv[3]);
await b.close();
