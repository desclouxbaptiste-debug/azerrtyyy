import * as THREE from "three";

/** A pointed-oval pear leaf outline, extruded paper-thin. */
export function buildLeafGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.06, 0.04, 0.11, 0.16, 0.085, 0.32);
  shape.bezierCurveTo(0.075, 0.4, 0.03, 0.46, 0, 0.5);
  shape.bezierCurveTo(-0.03, 0.46, -0.075, 0.4, -0.085, 0.32);
  shape.bezierCurveTo(-0.11, 0.16, -0.06, 0.04, 0, 0);

  // Deliberately not centered: the shape's (0,0) base point stays at the mesh
  // origin so rotating the mesh pivots the leaf naturally around its stalk.
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.006,
    bevelEnabled: false,
    curveSegments: 16,
  });
  geometry.translate(0, 0, -0.003);
  geometry.computeVertexNormals();
  return geometry;
}
