#!/bin/bash
# ABRIR EL SIMULADOR CON DOBLE CLICK — para Kusher, sin escribir nada.
#
# Baja la ultima version, levanta el servidor y abre el navegador solo.
# En Mac, un archivo .command se abre con doble click y corre en Terminal.
#
# ⚠️ NUNCA BORRA TRABAJO. Si hay cambios sin guardar o la rama se separo de la
# de GitHub, AVISA Y SIGUE con lo que hay en la maquina, en vez de pisarlo.
# Actualizar no vale perder una tarde de acomodar objetos.
#
# Para cerrarlo: Control+C en esta ventana, o cerrar la ventana.

set -u

# La carpeta la saca de DONDE ESTA ESTE ARCHIVO, no de una ruta escrita a mano.
# Asi funciona igual en `auditoria-rendimiento`, en el Desktop o en cualquier
# copia nueva, y no se repite el lio de julio de probar en la carpeta
# equivocada creyendo que era la version nueva.
cd "$(dirname "$0")" || exit 1
RAIZ="$(pwd)"
APP="$RAIZ/store-simulator"

echo ""
echo "════════════════════════════════════════════"
echo "   SIMULADOR BOBILONIA"
echo "════════════════════════════════════════════"
echo ""
echo "Carpeta: $RAIZ"

if [ ! -d "$APP" ]; then
  echo ""
  echo "✖ No encuentro la carpeta store-simulator."
  echo "  Este archivo tiene que estar en la raiz del repositorio."
  echo ""
  read -r -p "Enter para cerrar."
  exit 1
fi

# ── 1. traer la ultima version ──────────────────────────────────────────────
RAMA="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
echo "Rama:    $RAMA"
echo ""
echo "1/3 · Buscando si hay algo nuevo..."

# ⚠️ `--untracked-files=no` a proposito: solo miran los archivos que git YA
# sigue. Sin eso, un `.DS_Store` —que macOS crea solo en cualquier carpeta que
# abras en Finder— contaba como "cambios sin guardar" y el simulador no se
# actualizaba NUNCA MAS, sin decir por que. Un archivo suelto no lo puede pisar
# una actualizacion, asi que no hay nada que proteger ahi.
if [ -n "$(git status --porcelain --untracked-files=no 2>/dev/null)" ]; then
  echo "    ⚠️ Tenes cambios sin guardar en archivos del proyecto."
  echo "       No actualizo para no pisarlos. Se abre con lo que tenes."
elif ! git fetch --quiet origin "$RAMA" 2>/dev/null; then
  echo "    ⚠️ Sin internet o sin acceso a GitHub. Se abre la version local."
elif git merge-base --is-ancestor HEAD "origin/$RAMA" 2>/dev/null; then
  ANTES="$(git rev-parse --short HEAD)"
  # Si por lo que sea el merge no entra, git FALLA y no rompe nada: nunca pisa
  # un archivo tuyo sin permiso. Por eso alcanza con avisar y seguir.
  if ! git merge --ff-only --quiet "origin/$RAMA" 2>/dev/null; then
    echo "    ⚠️ No pude actualizar sin tocar tus archivos. Se abre como esta."
  fi
  AHORA="$(git rev-parse --short HEAD)"
  if [ "$ANTES" = "$AHORA" ]; then
    echo "    ✔ Ya tenias la ultima ($AHORA)."
  else
    echo "    ✔ Actualizado: $ANTES → $AHORA"
    echo ""
    echo "    ⚠️ IMPORTANTE: si alguien mas movio objetos con el editor, NO los"
    echo "       vas a ver hasta que uses 'Clear Local' y refresques. Lo que"
    echo "       guardaste vos en este navegador MANDA sobre el archivo del repo."
    echo "       Antes de hacer Clear Local, exporta tu layout con DOWNLOAD."
  fi
else
  # La rama local se fue por otro lado: hay commits acá que no están en GitHub,
  # o al revés. Un pull automatico acá puede hacer un merge feo o perder algo.
  echo "    ⚠️ Esta rama se separo de la de GitHub. No la toco solo."
  echo "       Decile a Claude Code que la ordene. Se abre con lo que tenes."
fi

# ── 2. dependencias ─────────────────────────────────────────────────────────
cd "$APP" || exit 1
echo ""
echo "2/3 · Revisando dependencias..."
if [ ! -d node_modules ]; then
  echo "    Primera vez, esto tarda unos minutos. No cierres la ventana."
  npm install || { echo "✖ Fallo npm install."; read -r -p "Enter para cerrar."; exit 1; }
elif [ package-lock.json -nt node_modules ]; then
  echo "    Cambiaron las dependencias, actualizando..."
  npm install || { echo "✖ Fallo npm install."; read -r -p "Enter para cerrar."; exit 1; }
else
  echo "    ✔ Al dia."
fi

# ── 3. levantar el servidor ─────────────────────────────────────────────────
# Se busca un puerto LIBRE en vez de usar uno fijo. Si quedo otro servidor
# abierto de antes, con puerto fijo esto fallaba o —peor— el navegador abria el
# servidor VIEJO y parecia que el codigo nuevo no habia hecho nada.
PUERTO=""
for p in 5201 5202 5203 5204 5205 5206; do
  if ! (exec 3<>"/dev/tcp/127.0.0.1/$p") 2>/dev/null; then PUERTO=$p; break; fi
  exec 3<&- 2>/dev/null
done
if [ -z "$PUERTO" ]; then
  echo ""
  echo "✖ Estan todos los puertos ocupados. Cerra las otras ventanas de Terminal."
  read -r -p "Enter para cerrar."
  exit 1
fi

echo ""
echo "3/3 · Levantando el simulador en el puerto $PUERTO..."
echo ""

# Se abre el navegador recien cuando el servidor contesta de verdad. Abrirlo
# antes da "no se puede conectar" y hay que refrescar a mano.
(
  for _ in $(seq 1 60); do
    if (exec 3<>"/dev/tcp/127.0.0.1/$PUERTO") 2>/dev/null; then
      exec 3<&- 2>/dev/null
      sleep 1
      open "http://127.0.0.1:$PUERTO/"
      echo ""
      echo "  ✔ Abierto en http://127.0.0.1:$PUERTO/"
      echo "    Para cerrar: Control+C aca, o cerra esta ventana."
      echo ""
      exit 0
    fi
    sleep 0.5
  done
) &

npm run dev -- --port "$PUERTO" --strictPort

echo ""
echo "Servidor cerrado."
read -r -p "Enter para cerrar la ventana."
