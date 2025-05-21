import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function createScene(containerSelector, glbPath) {
  const container = document.querySelector(containerSelector);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202020);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(2, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const light = new THREE.DirectionalLight(0xffffff, 4);
  light.position.set(30, -10,20);
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;            
    controls.enablePan = false;              
    controls.minPolarAngle = Math.PI / 2;   
    controls.maxPolarAngle = Math.PI / 2;     
    controls.enableDamping = true;

  const loader = new GLTFLoader();
  loader.load(
    glbPath,
    (gltf) => {
      scene.add(gltf.scene);
    },
    (xhr) => {
      console.log(`${containerSelector}: ${(xhr.loaded / xhr.total) * 100}% loaded`);
    },
    (error) => {
      console.error(`Error loading ${glbPath}`, error);
    }
  );

  // Responsive
  window.addEventListener("resize", () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();
}

// Init both scenes
createScene(".astro", "http://localhost:5173/static/astro.glb");
createScene(".astro2", "http://localhost:5173/static/astro2.glb");
createScene(".astro3", "http://localhost:5173/static/astro3.glb");
