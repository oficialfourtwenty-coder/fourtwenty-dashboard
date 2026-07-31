import * as THREE from 'three';

const UPDATE_INTERVAL_MS = 30_000;
const SHADOW_UPDATE_INTERVAL_MS = 120_000;
const MANUAL_HOUR_KEY = 'fourtwenty:manual-hour';

const PHASE_HOURS = Object.freeze({
  sol: 12,
  atardecer: 16,
  naranja: 18,
  'ultima-luz': 19.5,
  noche: 23,
});

// Hitos visuales del dia. Los valores intermedios se mezclan de forma suave.
const HOUR_FRAMES = Object.freeze([
  {
    hour: 0,
    sky: 0x102440,
    fog: 0x162a45,
    hemisphereSky: 0x7897ba,
    hemisphereGround: 0x101522,
    hemisphereIntensity: 0.42,
    light: 0xeaf2ff,
    lightIntensity: 0.55,
    exposure: 0.78,
    environmentIntensity: 0.12,
  },
  {
    hour: 5,
    sky: 0x4d7fa9,
    fog: 0x698eac,
    hemisphereSky: 0xb7d8ed,
    hemisphereGround: 0x364250,
    hemisphereIntensity: 0.65,
    light: 0xf4f8ff,
    lightIntensity: 0.72,
    exposure: 0.88,
    environmentIntensity: 0.16,
  },
  {
    hour: 6,
    sky: 0x93c9ed,
    fog: 0xb7d8ec,
    hemisphereSky: 0xd9efff,
    hemisphereGround: 0x8f9597,
    hemisphereIntensity: 0.9,
    light: 0xfff8e9,
    lightIntensity: 1.4,
    exposure: 0.96,
    environmentIntensity: 0.2,
  },
  {
    hour: 9,
    sky: 0x83bde7,
    fog: 0xabcde5,
    hemisphereSky: 0xd4e9f7,
    hemisphereGround: 0x9d978c,
    hemisphereIntensity: 1,
    light: 0xffedb5,
    lightIntensity: 2.25,
    exposure: 1,
    environmentIntensity: 0.23,
  },
  {
    hour: 12,
    sky: 0x72b4e5,
    fog: 0xa7cce7,
    hemisphereSky: 0xd5ecfa,
    hemisphereGround: 0xa39b8c,
    hemisphereIntensity: 1.05,
    light: 0xffdc6a,
    lightIntensity: 2.8,
    exposure: 1.03,
    environmentIntensity: 0.25,
  },
  {
    hour: 15,
    sky: 0x82b8df,
    fog: 0xb4cce0,
    hemisphereSky: 0xd9e6ee,
    hemisphereGround: 0xa29683,
    hemisphereIntensity: 1,
    light: 0xffc845,
    lightIntensity: 2.5,
    exposure: 1,
    environmentIntensity: 0.23,
  },
  {
    hour: 17,
    sky: 0xd99a69,
    fog: 0xd7ac85,
    hemisphereSky: 0xf0c095,
    hemisphereGround: 0x6e5548,
    hemisphereIntensity: 0.82,
    light: 0xff8a38,
    lightIntensity: 2,
    exposure: 0.91,
    environmentIntensity: 0.18,
  },
  {
    hour: 18,
    sky: 0xed7748,
    fog: 0xcf8567,
    hemisphereSky: 0xf0a174,
    hemisphereGround: 0x4d332c,
    hemisphereIntensity: 0.68,
    light: 0xff5b22,
    lightIntensity: 1.35,
    exposure: 0.84,
    environmentIntensity: 0.15,
  },
  {
    hour: 19,
    sky: 0x435a82,
    fog: 0x59677e,
    hemisphereSky: 0x879fbc,
    hemisphereGround: 0x252637,
    hemisphereIntensity: 0.5,
    light: 0xf0f5ff,
    lightIntensity: 0.58,
    exposure: 0.79,
    environmentIntensity: 0.13,
  },
  {
    hour: 21,
    sky: 0x172d4d,
    fog: 0x213753,
    hemisphereSky: 0x718eae,
    hemisphereGround: 0x141925,
    hemisphereIntensity: 0.44,
    light: 0xeaf2ff,
    lightIntensity: 0.52,
    exposure: 0.77,
    environmentIntensity: 0.11,
  },
  {
    hour: 24,
    sky: 0x102440,
    fog: 0x162a45,
    hemisphereSky: 0x7897ba,
    hemisphereGround: 0x101522,
    hemisphereIntensity: 0.42,
    light: 0xeaf2ff,
    lightIntensity: 0.55,
    exposure: 0.78,
    environmentIntensity: 0.12,
  },
]);

function normalizeHour(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return ((number % 24) + 24) % 24;
}

function currentHour(date = new Date()) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

function formatHour(value) {
  const normalized = normalizeHour(value) ?? 0;
  const totalMinutes = Math.round(normalized * 60) % (24 * 60);
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function phaseForHour(hour) {
  if (hour >= 6 && hour < 15) return 'SOL';
  if (hour >= 15 && hour < 17) return 'ATARDECER';
  if (hour >= 17 && hour < 19) return 'ATARDECER NARANJA';
  if (hour >= 19 && hour < 20) return 'NOCHE CON ULTIMA LUZ';
  return 'NOCHE';
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function paletteAt(hour) {
  let low = HOUR_FRAMES[0];
  let high = HOUR_FRAMES[HOUR_FRAMES.length - 1];
  for (let index = 1; index < HOUR_FRAMES.length; index++) {
    if (hour <= HOUR_FRAMES[index].hour) {
      low = HOUR_FRAMES[index - 1];
      high = HOUR_FRAMES[index];
      break;
    }
  }

  const raw = (hour - low.hour) / Math.max(high.hour - low.hour, 0.001);
  const mix = smoothstep(THREE.MathUtils.clamp(raw, 0, 1));
  const color = (key) => new THREE.Color(low[key]).lerp(new THREE.Color(high[key]), mix);
  const number = (key) => THREE.MathUtils.lerp(low[key], high[key], mix);
  return {
    sky: color('sky'),
    fog: color('fog'),
    hemisphereSky: color('hemisphereSky'),
    hemisphereGround: color('hemisphereGround'),
    light: color('light'),
    hemisphereIntensity: number('hemisphereIntensity'),
    lightIntensity: number('lightIntensity'),
    exposure: number('exposure'),
    environmentIntensity: number('environmentIntensity'),
  };
}

function celestialPosition(angle, distance, inverted = false) {
  const direction = inverted ? -1 : 1;
  return new THREE.Vector3(
    -Math.cos(angle) * distance * direction,
    Math.sin(angle) * distance,
    6,
  );
}

function sampleCycle(hour) {
  const sunAngle = ((hour - 6) / 12) * Math.PI;
  const extendedMoonHour = hour < 6 ? hour + 24 : hour;
  const moonAngle = ((extendedMoonHour - 18) / 12) * Math.PI;
  const sunVisible = hour >= 6 && hour < 19;
  const moonVisible = hour >= 19 || hour < 6;
  const sunPosition = celestialPosition(sunAngle, 85);
  const moonPosition = celestialPosition(moonAngle, 85, true);
  const activePosition = sunVisible ? sunPosition : moonPosition;
  const activeAngle = sunVisible ? sunAngle : moonAngle;

  return {
    hour,
    phase: phaseForHour(hour),
    palette: paletteAt(hour),
    sunVisible,
    moonVisible,
    sunPosition,
    moonPosition,
    activePosition,
    altitudeDegrees: Math.sin(activeAngle) * 90,
  };
}

export function createSunDisc(radius = 1.6) {
  const disc = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 18, 10),
    new THREE.MeshBasicMaterial({ color: 0xffdc6a, fog: false, toneMapped: false }),
  );
  disc.name = 'Sol dinamico';
  disc.frustumCulled = false;
  return disc;
}

export function createMoonDisc(radius = 1.35) {
  const disc = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 18, 10),
    new THREE.MeshBasicMaterial({ color: 0xf5f8ff, fog: false, toneMapped: false }),
  );
  disc.name = 'Luna dinamica';
  disc.frustumCulled = false;
  return disc;
}

function applyLighting(lighting, renderer, sample) {
  const { palette } = sample;
  const scene = lighting.scene;
  if (scene.background?.isColor) scene.background.copy(palette.sky);
  else scene.background = palette.sky.clone();
  if (scene.fog?.color) scene.fog.color.copy(palette.fog);
  scene.environmentIntensity = palette.environmentIntensity;

  lighting.hemisphere.color.copy(palette.hemisphereSky);
  lighting.hemisphere.groundColor.copy(palette.hemisphereGround);
  lighting.hemisphere.intensity = palette.hemisphereIntensity;
  lighting.sun.color.copy(palette.light);
  lighting.sun.intensity = palette.lightIntensity;

  lighting.sun.position.copy(sample.activePosition).normalize().multiplyScalar(45);
  lighting.sun.position.y = Math.max(lighting.sun.position.y, 3);

  if (lighting.sunDisc) {
    lighting.sunDisc.position.copy(sample.sunPosition);
    lighting.sunDisc.material.color.copy(palette.light);
    lighting.sunDisc.visible = sample.sunVisible;
  }
  if (lighting.moonDisc) {
    lighting.moonDisc.position.copy(sample.moonPosition);
    lighting.moonDisc.visible = sample.moonVisible;
  }

  renderer.toneMappingExposure = palette.exposure;
}

function storedHour() {
  try {
    return normalizeHour(localStorage.getItem(MANUAL_HOUR_KEY));
  } catch {
    return null;
  }
}

function queryHour(params) {
  const hour = normalizeHour(params.get('sunHour'));
  if (hour !== null) return hour;
  return PHASE_HOURS[params.get('sunPhase')?.toLowerCase()] ?? null;
}

export function createDayNightCycle({ renderer, getLighting, onShadowRefresh } = {}) {
  const params = new URLSearchParams(location.search);
  let forcedQueryHour = queryHour(params);
  let manualHour = storedHour();
  let nextUpdateAt = 0;
  let nextShadowUpdateAt = 0;
  let state = null;

  function effectiveHour(date = new Date()) {
    return manualHour ?? forcedQueryHour ?? currentHour(date);
  }

  function update(force = false) {
    const nowMs = Date.now();
    if (!force && nowMs < nextUpdateAt) return state;
    nextUpdateAt = nowMs + UPDATE_INTERVAL_MS;

    const hour = effectiveHour(new Date(nowMs));
    const sample = sampleCycle(hour);
    const lighting = getLighting?.() ?? null;
    if (lighting) applyLighting(lighting, renderer, sample);
    else renderer.toneMappingExposure = 1;

    if (force || nowMs >= nextShadowUpdateAt) {
      nextShadowUpdateAt = nowMs + SHADOW_UPDATE_INTERVAL_MS;
      onShadowRefresh?.();
    }
    state = {
      phase: sample.phase,
      altitude: Number(sample.altitudeDegrees.toFixed(2)),
      hour: formatHour(hour),
      hourValue: hour,
      manual: manualHour !== null || forcedQueryHour !== null,
      celestial: sample.sunVisible ? 'SOL' : 'LUNA',
    };
    return state;
  }

  function setHour(value) {
    const normalized = normalizeHour(value);
    if (normalized === null) return state;
    forcedQueryHour = null;
    manualHour = normalized;
    try { localStorage.setItem(MANUAL_HOUR_KEY, String(normalized)); } catch { /* sin persistencia */ }
    nextUpdateAt = 0;
    return update(false);
  }

  function useRealTime() {
    forcedQueryHour = null;
    manualHour = null;
    try { localStorage.removeItem(MANUAL_HOUR_KEY); } catch { /* sin persistencia */ }
    return update(true);
  }

  return { update, setHour, useRealTime, getState: () => state };
}
