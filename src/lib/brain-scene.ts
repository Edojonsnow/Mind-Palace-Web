import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

export type BrainAction = "save" | "ask" | "reminisce";
export type BrainScene = {
  highlight: (action: BrainAction | null) => void;
  rotate: (horizontal: number, vertical: number) => void;
  reset: () => void;
  dispose: () => void;
};

// Illustrative associations, not exclusive functional or diagnostic regions.
function belongsTo(action: BrainAction, label: string, region: string) {
  switch (action) {
    case "save": return /hippocamp/i.test(label);
    case "ask": return /middle frontal|superior frontal|triangular part of inferior frontal/i.test(label);
    case "reminisce": return region === "Occipital lobe";
  }
}

export function createBrainScene(host: HTMLElement, onReady: () => void, onError: () => void): BrainScene {
  const token = (name: string) => getComputedStyle(host).getPropertyValue(name).trim();
  const palette: Record<BrainAction, string> = {
    save: token("--mp-lumen"), ask: token("--mp-echo"), reminisce: token("--mp-lumen"),
  };
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  const initialPosition = new THREE.Vector3(4.6, 2.0, 5.5);
  camera.position.copy(initialPosition);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.rotateSpeed = 0.65;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = Math.PI - 0.25;
  controls.update();
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(token("--mp-brain-key"), 3.2);
  key.position.set(-3, 5, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(token("--mp-echo"), 2.1);
  fill.position.set(4, -2, -3);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);
  const baseColor = new THREE.Color(token("--mp-brain"));
  const noEmission = new THREE.Color(0x000000);
  const surfaces: Array<{ material: THREE.MeshStandardMaterial; label: string; region: string; ghost?: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> }> = [];
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const edgeMaterials: THREE.MeshBasicMaterial[] = [];
  const nodeMaterial = new THREE.PointsMaterial({ color: token("--mp-lumen"), size: .022, sizeAttenuation: true, transparent: true, opacity: .85 });
  materials.add(nodeMaterial);
  const draco = new DRACOLoader();
  draco.setDecoderPath("/models/draco/");
  draco.setWorkerLimit(1);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let active: BrainAction | null = null;
  let disposed = false;
  let frame = 0;
  let remainingFrames = 0;
  let inView = true;

  // Render only while interacting or changing color, never an idle 60fps loop.
  function render() {
    frame = 0;
    if (disposed || document.hidden || !inView) return;
    controls.update();
    const amount = reducedMotion.matches ? 1 : 0.2;
    for (const item of surfaces) {
      const selected = active !== null && belongsTo(active, item.label, item.region);
      const target = selected ? new THREE.Color(palette[active!]) : baseColor;
      item.material.color.lerp(target, amount);
      item.material.emissive.lerp(selected ? target : noEmission, amount);
      item.material.emissiveIntensity = 0.035;
      if (item.ghost) {
        item.ghost.material.color.copy(target);
        item.ghost.material.opacity = THREE.MathUtils.lerp(item.ghost.material.opacity, selected ? 0.48 : 0, amount);
        item.ghost.visible = item.ghost.material.opacity > 0.005;
      }
    }
    renderer.render(scene, camera);
    if (--remainingFrames > 0 && !frame) frame = requestAnimationFrame(render);
  }
  function invalidate() {
    remainingFrames = reducedMotion.matches ? 1 : 36;
    if (!frame && !disposed && !document.hidden && inView) frame = requestAnimationFrame(render);
  }
  const theme = new MutationObserver(() => {
    baseColor.set(token("--mp-brain"));
    key.color.set(token("--mp-brain-key"));
    fill.color.set(token("--mp-echo"));
    nodeMaterial.color.set(token("--mp-lumen"));
    edgeMaterials.forEach(material => material.color.set(token("--mp-brain-edge")));
    for (const action of Object.keys(palette) as BrainAction[]) palette[action] = token(action === "ask" ? "--mp-echo" : "--mp-lumen");
    invalidate();
  });
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  controls.addEventListener("change", invalidate);
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    invalidate();
  });
  resize.observe(host);
  const visibility = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) invalidate();
  });
  visibility.observe(host);
  document.addEventListener("visibilitychange", invalidate);
  reducedMotion.addEventListener("change", invalidate);
  const contextLost = (event: Event) => { event.preventDefault(); onError(); };
  renderer.domElement.addEventListener("webglcontextlost", contextLost);

  loader.load("/models/brain/brain-minimal.glb", (gltf) => {
    if (disposed) {
      gltf.scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          (Array.isArray(node.material) ? node.material : [node.material]).forEach((material) => material.dispose());
        }
      });
      return;
    }
    const meshes: THREE.Mesh[] = [];
    gltf.scene.traverse((node) => { if (node instanceof THREE.Mesh) meshes.push(node); });
    for (const mesh of meshes) {
      const label = String(mesh.userData.bx_label ?? mesh.name);
      const region = String(mesh.userData.bx_region ?? "");
      const originalMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      originalMaterials.forEach((material) => material.dispose());
      const material = new THREE.MeshStandardMaterial({ color: baseColor, roughness: .38, metalness: .28 });
      mesh.material = material;
      materials.add(material);
      geometries.add(mesh.geometry);
      // Inverted normal hulls trace anatomical folds, rather than triangle wireframes.
      const outlineMaterial = new THREE.MeshBasicMaterial({ color: token("--mp-brain-edge"), side: THREE.BackSide, transparent: true, opacity: .25, depthWrite: false });
      edgeMaterials.push(outlineMaterial);
      outlineMaterial.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed += normal * 0.00028;");
      };
      const outline = new THREE.Mesh(mesh.geometry, outlineMaterial);
      mesh.add(outline);
      materials.add(outlineMaterial);
      const item: typeof surfaces[number] = { material, label, region };
      if (/^hippocampus$/i.test(label)) {
        // A translucent highlight makes this internal structure legible through cortex.
        const ghostMaterial = new THREE.MeshBasicMaterial({ color: palette.save, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
        const ghost = new THREE.Mesh(mesh.geometry, ghostMaterial);
        ghost.renderOrder = 5;
        ghost.visible = false;
        mesh.add(ghost);
        materials.add(ghostMaterial);
        item.ghost = ghost;
      }
      surfaces.push(item);
    }
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    gltf.scene.position.sub(center);
    root.add(gltf.scene);
    root.scale.setScalar(3.1 / Math.max(size.x, size.y, size.z));
    // Fixed decorative markers contain no user data; sample the cortical surface.
    gltf.scene.updateWorldMatrix(true, true);
    const cortex = meshes.filter(mesh => !/hippocamp|thalam|ventric/i.test(String(mesh.userData.bx_label ?? mesh.name)));
    const positions: number[] = [];
    for (let i = 0; i < 40 && cortex.length; i++) {
      const mesh = cortex[i % cortex.length];
      const attribute = mesh.geometry.getAttribute("position");
      const point = new THREE.Vector3().fromBufferAttribute(attribute, Math.floor((i * .61803398875 % 1) * attribute.count));
      mesh.localToWorld(point);
      root.worldToLocal(point);
      positions.push(point.x, point.y, point.z);
    }
    const nodesGeometry = new THREE.BufferGeometry();
    nodesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometries.add(nodesGeometry);
    root.add(new THREE.Points(nodesGeometry, nodeMaterial));
    invalidate();
    onReady();
  }, undefined, () => { if (!disposed) onError(); });

  return {
    highlight(action) { active = action; invalidate(); },
    rotate(horizontal, vertical) {
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta += horizontal;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical, controls.minPolarAngle, controls.maxPolarAngle);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
      controls.update();
      invalidate();
    },
    reset() { camera.position.copy(initialPosition); controls.target.set(0, 0, 0); controls.update(); invalidate(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      visibility.disconnect();
      theme.disconnect();
      document.removeEventListener("visibilitychange", invalidate);
      reducedMotion.removeEventListener("change", invalidate);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      controls.dispose();
      draco.dispose();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
