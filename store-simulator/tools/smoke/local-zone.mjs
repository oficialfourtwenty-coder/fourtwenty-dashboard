import assert from 'node:assert/strict';
import { isInsideLocal } from '../../src/world/street.js';

const point = (x, z) => ({ x, z });

assert.equal(isInsideLocal(point(0, -6)), true, 'el centro del local debe ser interior');
assert.equal(isInsideLocal(point(1.5, -4.6)), true, 'la entrada debe activar la camara interior');
assert.equal(isInsideLocal(point(-40, -6)), false, 'la esquina izquierda sigue siendo exterior');
assert.equal(isInsideLocal(point(40, -6)), false, 'la esquina derecha sigue siendo exterior');
assert.equal(isInsideLocal(point(0, -4)), false, 'la galeria delante del local es exterior');
assert.equal(isInsideLocal(point(-2, -12)), false, 'detras del local y fuera del pocket es exterior');
assert.equal(isInsideLocal(point(1.5, -12)), true, 'el pocket de stock conserva camara interior');
assert.equal(isInsideLocal(point(1.5, -17)), false, 'mas alla del pocket vuelve a ser exterior');

console.log('local-zone: 8 checks OK');
