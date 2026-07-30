import * as THREE from 'three';

// Ubicacion aproximada de Calle Burela, Buenos Aires. Es suficiente para que
// amanecer, atardecer y duracion del dia acompanen la fecha real.
const BURELA_LATITUDE = -34.574;
const BURELA_LONGITUDE = -58.49;
const UPDATE_INTERVAL_MS = 30_000;
const SHADOW_UPDATE_INTERVAL_MS = 120_000;
const DEG = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2440588;
const J2000 = 2451545;
const EARTH_TILT = DEG * 23.4397;

const PHASE_ALTITUDES = Object.freeze({
  sol: 28,
  atardecer: 7,
  naranja: 1,
  'ultima-luz': -5,
  noche: -14,
});

const PALETTES = Object.freeze([
  {
    altitude: -18,
    sky: 0x06101f,
    fog: 0x0b1726,
    hemisphereSky: 0x284568,
    hemisphereGround: 0x090a0e,
    hemisphereIntensity: 0.28,
    sun: 0x9bb8df,
    sunIntensity: 0.22,
    exposure: 0.72,
    environmentIntensity: 0.1,
  },
  {
    altitude: -8,
    sky: 0x1a2949,
    fog: 0x2a3552,
    hemisphereSky: 0x46628f,
    hemisphereGround: 0x151322,
    hemisphereIntensity: 0.38,
    sun: 0x9db8df,
    sunIntensity: 0.28,
    exposure: 0.76,
    environmentIntensity: 0.12,
  },
  {
    altitude: -1,
    sky: 0xb84b32,
    fog: 0xa65d4c,
    hemisphereSky: 0xd87852,
    hemisphereGround: 0x3f2621,
    hemisphereIntensity: 0.52,
    sun: 0xff642e,
    sunIntensity: 1.15,
    exposure: 0.78,
    environmentIntensity: 0.13,
  },
  {
    altitude: 4,
    sky: 0xe39568,
    fog: 0xd9ad86,
    hemisphereSky: 0xf2c09a,
    hemisphereGround: 0x655047,
    hemisphereIntensity: 0.76,
    sun: 0xff8a3d,
    sunIntensity: 2.25,
    exposure: 0.88,
    environmentIntensity: 0.17,
  },
  {
    altitude: 10,
    sky: 0xa7c7e5,
    fog: 0xc0d5e8,
    hemisphereSky: 0xc9dceb,
    hemisphereGround: 0x9b958b,
    hemisphereIntensity: 0.92,
    sun: 0xffefd2,
    sunIntensity: 2.2,
    exposure: 0.98,
    environmentIntensity: 0.22,
  },
  {
    altitude: 50,
    sky: 0x86b9e3,
    fog: 0xafd0e8,
    hemisphereSky: 0xc8e0f2,
    hemisphereGround: 0x9d978c,
    hemisphereIntensity: 1.0,
    sun: 0xfff8e8,
    sunIntensity: 2.45,
    exposure: 1.02,
    environmentIntensity: 0.24,
  },
]);

function toDays(date) {
  return (date.valueOf() / DAY_MS) - 0.5 + J1970 - J2000;
}

function rightAscension(longitude, latitude) {
  return Math.atan2(
    Math.sin(longitude) * Math.cos(EARTH_TILT) - Math.tan(latitude) * Math.sin(EARTH_TILT),
    Math.cos(longitude),
  );
}

function declination(longitude, latitude) {
  return Math.asin(
    Math.sin(latitude) * Math.cos(EARTH_TILT)
      + Math.cos(latitude) * Math.sin(EARTH_TILT) * Math.sin(longitude),
  );
}

function solarPosition(date) {
  const days = toDays(date);
  const meanAnomaly = DEG * (357.5291 + 0.98560028 * days);
  const equationOfCenter = DEG * (
    1.9148 * Math.sin(meanAnomaly)
      + 0.02 * Math.sin(2 * meanAnomaly)
      + 0.0003 * Math.sin(3 * meanAnomaly)
  );
  const eclipticLongitude = meanAnomaly + equationOfCenter + DEG * 102.9372 + Math.PI;
  const sunDeclination = declination(eclipticLongitude, 0);
  const sunRightAscension = rightAscension(eclipticLongitude, 0);
  const observerLatitude = BURELA_LATITUDE * DEG;
  const observerLongitude = -BURELA_LONGITUDE * DEG;
  const siderealTime = DEG * (280.16 + 360.9856235 * days) - observerLongitude;
  const hourAngle = siderealTime - sunRightAscension;
  const altitude = Math.asin(
    Math.sin(observerLatitude) * Math.sin(sunDeclination)
      + Math.cos(observerLatitude) * Math.cos(sunDeclination) * Math.cos(hourAngle),
  );
  const azimuth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(observerLatitude)
      - Math.tan(sunDeclination) * Math.cos(observerLatitude),
  );
  return { altitude, azimuth };
}

function phaseForAltitude(altitudeDegrees) {
  if (altitudeDegrees >= 10) return 'SOL';
  if (altitudeDegrees >= 4) return 'ATARDECER';
  if (altitudeDegrees >= -1) return 'ATARDECER NARANJA';
  if (altitudeDegrees >= -8) return 'NOCHE CON ULTIMA LUZ';
  return 'NOCHE';
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function paletteFromFrame(frame) {
  return {
    sky: new THREE.Color(frame.sky),
    fog: new THREE.Color(frame.fog),
    hemisphereSky: new THREE.Color(frame.hemisphereSky),
    hemisphereGround: new THREE.Color(frame.hemisphereGround),
    sun: new THREE.Color(frame.sun),
    hemisphereIntensity: frame.hemisphereIntensity,
    sunIntensity: frame.sunIntensity,
    exposure: frame.exposure,
    environmentIntensity: frame.environmentIntensity,
  };
}

function paletteAt(altitudeDegrees) {
  if (altitudeDegrees <= PALETTES[0].altitude) return paletteFromFrame(PALETTES[0]);
  const last = PALETTES[PALETTES.length - 1];
  if (altitudeDegrees >= last.altitude) return paletteFromFrame(last);

  let low = PALETTES[0];
  let high = last;
  for (let index = 1; index < PALETTES.length; index++) {
    if (altitudeDegrees <= PALETTES[index].altitude) {
      high = PALETTES[index];
      low = PALETTES[index - 1];
      break;
    }
  }

  const raw = (altitudeDegrees - low.altitude) / (high.altitude - low.altitude);
  const mix = smoothstep(THREE.MathUtils.clamp(raw, 0, 1));
  const color = (key) => new THREE.Color(low[key]).lerp(new THREE.Color(high[key]), mix);
  const number = (key) => THREE.MathUtils.lerp(low[key], high[key], mix);
  return {
    sky: color('sky'),
    fog: color('fog'),
    hemisphereSky: color('hemisphereSky'),
    hemisphereGround: color('hemisphereGround'),
    sun: color('sun'),
    hemisphereIntensity: number('hemisphereIntensity'),
    sunIntensity: number('sunIntensity'),
    exposure: number('exposure'),
    environmentIntensity: number('environmentIntensity'),
  };
}

function dateFromQuery(now, params) {
  const rawHour = params.get('sunHour');
  if (rawHour === null || rawHour.trim() === '') return now;
  const hour = Number(rawHour);
  if (!Number.isFinite(hour)) return now;
  const date = new Date(now);
  const clamped = THREE.MathUtils.clamp(hour, 0, 23.999);
  date.setHours(Math.floor(clamped), Math.round((clamped % 1) * 60), 0, 0);
  return date;
}

function sampleCycle(now, params) {
  const date = dateFromQuery(now, params);
  const solar = solarPosition(date);
  const forcedPhase = params.get('sunPhase')?.toLowerCase();
  const forcedAltitude = PHASE_ALTITUDES[forcedPhase];
  const altitude = Number.isFinite(forcedAltitude) ? forcedAltitude * DEG : solar.altitude;
  const azimuth = Number.isFinite(forcedAltitude) ? Math.PI : solar.azimuth;
  const altitudeDegrees = THREE.MathUtils.radToDeg(altitude);
  return {
    date,
    altitude,
    azimuth,
    altitudeDegrees,
    phase: phaseForAltitude(altitudeDegrees),
    forced: Number.isFinite(forcedAltitude),
  };
}

export function createSunDisc(radius = 1.6) {
  const disc = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 18, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff2cf, fog: false, toneMapped: false }),
  );
  disc.name = 'Sol dinamico';
  disc.frustumCulled = false;
  return disc;
}

function applyLighting(lighting, renderer, sample) {
  const palette = paletteAt(sample.altitudeDegrees);
  const scene = lighting.scene;
  scene.background?.copy?.(palette.sky);
  if (scene.fog?.color) scene.fog.color.copy(palette.fog);
  scene.environmentIntensity = palette.environmentIntensity;

  lighting.hemisphere.color.copy(palette.hemisphereSky);
  lighting.hemisphere.groundColor.copy(palette.hemisphereGround);
  lighting.hemisphere.intensity = palette.hemisphereIntensity;
  lighting.sun.color.copy(palette.sun);
  lighting.sun.intensity = palette.sunIntensity;

  const nightFill = sample.altitudeDegrees < -1;
  const lightAzimuth = nightFill ? sample.azimuth + Math.PI : sample.azimuth;
  const lightAltitude = Math.max(sample.altitude, 3 * DEG);
  const horizontal = Math.cos(lightAltitude);
  lighting.sun.position.set(
    Math.sin(lightAzimuth) * horizontal * 45,
    Math.sin(lightAltitude) * 45,
    Math.cos(lightAzimuth) * horizontal * 45,
  );

  if (lighting.sunDisc) {
    const discDistance = 85;
    const discHorizontal = Math.cos(sample.altitude);
    lighting.sunDisc.position.set(
      Math.sin(sample.azimuth) * discHorizontal * discDistance,
      Math.sin(sample.altitude) * discDistance,
      Math.cos(sample.azimuth) * discHorizontal * discDistance,
    );
    lighting.sunDisc.material.color.copy(palette.sun);
    lighting.sunDisc.visible = sample.altitudeDegrees > -2.2;
  }

  renderer.toneMappingExposure = palette.exposure;
}

export function createDayNightCycle({ renderer, getLighting, onShadowRefresh } = {}) {
  const params = new URLSearchParams(location.search);
  let nextUpdateAt = 0;
  let nextShadowUpdateAt = 0;
  let state = null;

  function update(force = false) {
    const nowMs = Date.now();
    if (!force && nowMs < nextUpdateAt) return state;
    nextUpdateAt = nowMs + UPDATE_INTERVAL_MS;
    const lighting = getLighting?.() ?? null;
    if (!lighting) {
      renderer.toneMappingExposure = 1;
      state = null;
      return state;
    }

    const sample = sampleCycle(new Date(nowMs), params);
    applyLighting(lighting, renderer, sample);
    if (force || nowMs >= nextShadowUpdateAt) {
      nextShadowUpdateAt = nowMs + SHADOW_UPDATE_INTERVAL_MS;
      onShadowRefresh?.();
    }
    state = {
      phase: sample.phase,
      altitude: Number(sample.altitudeDegrees.toFixed(2)),
      hour: sample.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      forced: sample.forced,
    };
    return state;
  }

  return { update, getState: () => state };
}
