#!/bin/bash
# CAMBIAR DE VERSION CON DOBLE CLICK — para probar una version de prueba y
# volver a la normal, sin escribir nada en la terminal.
#
# Muestra una lista numerada, se elige con un numero, cambia de version y abre
# el simulador (usa ABRIR-SIMULADOR.command, que baja lo ultimo).
#
# ⚠️ NUNCA BORRA TRABAJO. Si hay cambios sin guardar en archivos del proyecto,
# no cambia de version y avisa. Lo que se acomoda con el editor (T) vive en el
# navegador, no en estos archivos: cambiar de version no lo toca.
#
# Para sumar una version de prueba nueva, agregar una linea a VERSIONES:
#   "nombre-de-la-rama|Descripcion que ve Kusher"

set -u
cd "$(dirname "$0")" || exit 1

VERSIONES=(
  "claude/fourtwenty-store-simulator-g3rigz|Version NORMAL (la de todos los dias)"
)

echo ""
echo "════════════════════════════════════════════"
echo "   ELEGIR VERSION DEL SIMULADOR"
echo "════════════════════════════════════════════"
ACTUAL="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
echo ""
echo "Ahora estas en: $ACTUAL"
echo ""

i=1
for v in "${VERSIONES[@]}"; do
  rama="${v%%|*}"; texto="${v#*|}"
  marca="  "; [ "$rama" = "$ACTUAL" ] && marca="▶ "
  echo "  $marca$i) $texto"
  i=$((i + 1))
done
echo ""
read -r -p "Escribi el numero y Enter: " ELEGIDO

if ! [[ "$ELEGIDO" =~ ^[0-9]+$ ]] || [ "$ELEGIDO" -lt 1 ] || [ "$ELEGIDO" -gt "${#VERSIONES[@]}" ]; then
  echo ""
  echo "✖ Ese numero no esta en la lista. No se cambio nada."
  read -r -p "Enter para cerrar."
  exit 1
fi

DESTINO="${VERSIONES[$((ELEGIDO - 1))]%%|*}"

if [ "$DESTINO" != "$ACTUAL" ]; then
  # Mismo cuidado que ABRIR-SIMULADOR: solo cuentan archivos que git ya sigue.
  # Un `.DS_Store` suelto no bloquea nada.
  if [ -n "$(git status --porcelain --untracked-files=no 2>/dev/null)" ]; then
    echo ""
    echo "⚠️ Tenes cambios sin guardar en archivos del proyecto."
    echo "   No cambio de version para no pisarlos. Decile a Claude Code."
    read -r -p "Enter para cerrar."
    exit 1
  fi
  echo ""
  echo "Cambiando a: $DESTINO ..."
  git fetch --quiet origin "$DESTINO" 2>/dev/null
  if git show-ref --verify --quiet "refs/heads/$DESTINO"; then
    ERROR="$(git switch --quiet "$DESTINO" 2>&1)"
  else
    # La rama existe en GitHub pero todavia no en esta Mac.
    ERROR="$(git switch --quiet --track "origin/$DESTINO" 2>&1)"
  fi
  if [ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" != "$DESTINO" ]; then
    echo ""
    # ⚠️ Ya paso el 03/08: git NO deja tener la misma version abierta en dos
    # carpetas a la vez ("already checked out at ..."). Se dice la causa real
    # en vez de un generico "fallo", que hizo perder mas de una hora.
    if echo "$ERROR" | grep -qi "already\|worktree"; then
      echo "✖ Esa version ya esta abierta en OTRA carpeta de esta Mac."
      echo "  Git no deja tenerla en dos lugares a la vez."
      echo "  Detalle: $ERROR"
    elif echo "$ERROR" | grep -qi "invalid reference\|not a commit\|did not match"; then
      echo "✖ No encuentro esa version. ¿Hay internet? Si hay, avisale a Claude Code."
    else
      echo "✖ No pude cambiar de version. No se toco nada."
      echo "  Detalle: $ERROR"
    fi
    read -r -p "Enter para cerrar."
    exit 1
  fi
  echo "✔ Listo."
fi

# Abre el simulador con el lanzador de siempre (baja lo ultimo de esta version).
exec "./ABRIR-SIMULADOR.command"
