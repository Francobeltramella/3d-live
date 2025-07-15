import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.querySelector(".coin-3d");

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  30,
  container.clientWidth / container.clientHeight,
  0.1,
  100
);
camera.position.set(3, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Lights
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10);
light.castShadow = true;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
light.shadow.bias = -0.001;
scene.add(light);

const light2 = new THREE.DirectionalLight(0xffffff, 2);
light2.position.set(-10, 10, -10);
light2.castShadow = true;
scene.add(light2);

// const lightHelper = new THREE.DirectionalLightHelper(light, 1);
// scene.add(lightHelper);

const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
scene.add(hemiLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;


const light4 = new THREE.DirectionalLight(0xffffff, 2);
light4.position.set(5, 5, 5);
scene.add(light4);

const ambient4 = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambient4);


// GLB Loader
const loader = new GLTFLoader();
let model = null;

const textureLoader = new THREE.TextureLoader();


const diffuseMap   = textureLoader.load('https://cdn.prod.website-files.com/672b98669f7d5338576ee43f/6870599fa1a3837da3069885_686e146a92ab8954ee2aa224_op-thumbnail.webp');
const normalMap    = textureLoader.load('https://cdn.prod.website-files.com/672b98669f7d5338576ee43f/68756b3043280a2cfad92aa2_Snow005_1K-JPG_NormalGL.jpg');
const roughnessMap = textureLoader.load('https://cdn.prod.website-files.com/672b98669f7d5338576ee43f/687082ab0af5fb0edfcc5c3a_Snow006_1K-JPG_Displacement.jpg');

loader.load(
  "https://3dlive.netlify.app/tripo3.glb",
  (gltf) => {
    model = gltf.scene;

    // Mejora de materiales y sombras
    model.traverse((child) => {
        if (child.isMesh) {
            child.material.vertexColors = false;
            child.material = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color('#E3F3FA'),
                transmission:0.1,
                thickness:1.5,
                roughness: 4.95,
                attenuationColor: new THREE.Color('#B5E8FF'),
                attenuationDistance: 0.8,
                metalness: 0.00,
                ior: 2.31,
                transparent: true,
                //opacity: 10,
                envMap: diffuseMap,
                envMapIntensity: 0.9,  // este valor es clave para que se vean los reflejos
                side: THREE.DoubleSide,
                normalMap: normalMap,
              });
        }
      });

    scene.add(model);
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  (error) => {
    console.error("An error happened", error);
  }
);

// Responsive
window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// Animate
const animate = () => {
  requestAnimationFrame(animate);

  if (model) {
    model.rotation.y += 0.005; // Rotación suave
  }

  controls.update();
  renderer.render(scene, camera);
};

animate();
