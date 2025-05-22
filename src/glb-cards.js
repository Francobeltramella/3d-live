import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import gsap from 'gsap';

// Setup único del loader
const loader = new GLTFLoader();

// ✅ Configuramos Draco
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/'); // CDN de Google
loader.setDRACOLoader(dracoLoader);

// Función para crear escena
function createScene(containerSelector, glbPath) {
  return new Promise((resolve, reject) => {
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
    renderer.domElement.style.visibility = 'hidden';
    container.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 4);
    light.position.set(30, -10, 20);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI / 2;
    controls.maxPolarAngle = Math.PI / 2;
    controls.enableDamping = true;

    loader.load(
      glbPath,
      (gltf) => {
        scene.add(gltf.scene);
        renderer.domElement.style.visibility = 'visible';
        resolve();
      },
      (xhr) => {
        console.log(`${containerSelector}: ${(xhr.loaded / xhr.total) * 100}% loaded`);
      },
      (error) => {
        console.error(`Error loading ${glbPath}`, error);
        reject(error);
      }
    );

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
  });
}

// Cargar las escenas y luego disparar animación de salida
Promise.all([
  createScene(".astro", "https://3dlive.netlify.app/astro.glb"),
  createScene(".astro2", "https://3dlive.netlify.app/astro2.glb"),
  createScene(".astro3", "https://3dlive.netlify.app/astro3.glb")
]).then(() => {
  gsap.timeline()
    .to("[text-loading]", { opacity: 1, delay: 0.3, y: -20, duration: 1, ease: "power2.out" })
    .to("[text-loading]", { opacity: 0, y: 0, duration: 1, ease: "power2.in" })
    .to(".courtain", { height: 0, stagger: 0.5, duration: 1, ease: "power2.inOut" })
    .to(".loading-wrapper", { display: "none", duration: 0 });
}).catch((err) => {
  console.error("Error al cargar algún modelo:", err);
});
