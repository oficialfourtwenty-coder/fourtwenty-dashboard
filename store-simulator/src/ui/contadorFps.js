// CONTADOR DE CUADROS POR SEGUNDO — `?fps=1` en la direccion.
//
// Para que Kusher compare en SU Mac si un cambio grafico cuesta rendimiento:
//
//   http://127.0.0.1:5201/?fps=1                    graficos nuevos
//   http://127.0.0.1:5201/?fps=1&graficos=antes     como estaba
//
// Las pruebas automaticas corren en un navegador que dibuja por software, a
// 2 cuadros por segundo: sirven para comparar dos versiones entre si, nunca para
// saber como anda el juego de verdad. Este numero, en la maquina real, si.
//
// Muestra tambien las llamadas de dibujo, que en este proyecto pesan mas que
// los triangulos (ver CLAUDE.md, seccion de prendas).

export function crearContadorFps(renderer) {
  if (typeof location === 'undefined') return null;
  if (new URLSearchParams(location.search).get('fps') !== '1') return null;

  const caja = document.createElement('div');
  caja.id = 'ft-contador-fps';
  caja.style.cssText = [
    'position:fixed', 'left:12px', 'bottom:12px', 'z-index:99999',
    'padding:6px 10px', 'border-radius:6px',
    'background:rgba(0,0,0,.62)', 'color:#b6ff9e',
    'font:600 13px/1.35 ui-monospace,Menlo,monospace',
    'pointer-events:none', 'white-space:pre',
  ].join(';');
  document.body.appendChild(caja);

  let cuadros = 0;
  let acumulado = 0;
  let peor = 0;
  return {
    // Se llama una vez por cuadro con el tiempo real del cuadro, en segundos.
    cuadro(dt) {
      if (!(dt > 0) || dt > 1) return;
      cuadros++;
      acumulado += dt;
      peor = Math.max(peor, dt);
      if (acumulado < 0.5) return;
      const fps = cuadros / acumulado;
      const info = renderer.info.render;
      caja.textContent = `${fps.toFixed(0)} fps  ·  peor ${(peor * 1000).toFixed(0)} ms\n`
        + `${info.calls} llamadas  ·  ${(info.triangles / 1000).toFixed(0)}k triangulos`;
      caja.style.color = fps >= 55 ? '#b6ff9e' : fps >= 30 ? '#ffe27a' : '#ff8a7a';
      cuadros = 0;
      acumulado = 0;
      peor = 0;
    },
  };
}
