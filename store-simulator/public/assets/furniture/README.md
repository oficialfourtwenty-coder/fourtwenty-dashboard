# Muebles propios (modelos 3D)

Acá van los archivos `.glb` de muebles que generás vos con tu herramienta de
conversión imagen → 3D (la misma que usaste para el perchero y para BOB).

## Cómo agregar un mueble nuevo

1. Generá el `.glb` con tu herramienta y guardalo acá, con nombre simple sin
   espacios: `perchero_remeras.glb`, `mesa_exhibicion.glb`, etc.
2. **Si pesa mucho** (tu herramienta suele exportar 300-500 mil triángulos y
   15-20 MB), pedime que lo optimice antes de usarlo — lo dejo liviano sin
   que se note la diferencia. Si ya está liviano, saltealo.
3. Abrí `src/world/layout.js` y agregá una línea donde quieras que aparezca:
   ```js
   { tipo: 'modelo', x: 0, z: -1.6, archivo: 'perchero_remeras.glb', alto: 1.5 },
   ```
4. Guardá. Con `npm run dev` corriendo, se actualiza solo. Ajustá `x`/`z`
   (posición) y `alto` (metros que mide) hasta que quede como querés.

El mueble se escala, se apoya en el piso y calcula su propio espacio de
colisión automáticamente — no hace falta calcular nada a mano. Ver los
comentarios de `layout.js` para todas las opciones (`rot` para girarlo).

## Reemplazando muebles placeholder

Los muebles "de prueba" (percheros circulares, mesas, maniquíes dibujados
por código) siguen funcionando igual — están para no dejar ningún hueco
vacío mientras vas generando los tuyos. Cambiá una línea `{ tipo: 'perchero', ... }`
por `{ tipo: 'modelo', archivo: '...', ... }` y listo, sin tocar nada más.
