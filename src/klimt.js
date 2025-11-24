
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


let camera, scene, renderer, controls;
let shape2, concreteRing;

const container = document.querySelector(".element-3d");

scene = new THREE.Scene();

renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setClearColor(0x000000, 0);
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Luces
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

// LUZ
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(4, 10, 14);
light.castShadow = true;

// Tamaño del shadow map – CALIDAD ALTA
light.shadow.mapSize.width = 4096;
light.shadow.mapSize.height = 4096;

// Cámara de sombras – RECORTADA Y OPTIMIZADA
const cam = light.shadow.camera;
cam.near = 0.1;
cam.far = 20;
cam.left = -3;
cam.right = 3;
cam.top = 3;
cam.bottom = -3;

// Suavizar
light.shadow.bias = -0.0001;
light.shadow.normalBias = 0.02;

scene.add(light);






/*********************************************
 * CARGAR GLB
 *********************************************/
const loader = new GLTFLoader();

loader.load(
  "https://3dlive.netlify.app/videos/knew2.glb",
  (gltf) => {
    scene.add(gltf.scene);

    // Buscar objetos
    gltf.scene.traverse(obj => {
      if (obj.name === "Shape_2001") shape2 = obj;
      if (obj.name === "concrete_ring001") concreteRing = obj;

      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    gltf.scene.traverse(obj => {

      if (obj.name === "Shape_2001") shape2 = obj;
      if (obj.name === "concrete_ring001") concreteRing = obj;

      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }

      if (
        obj.name === "Shape_2001" ||
        obj.name === "Cube002_Material001_0"
      ) {
        obj.castShadow = false;
      }
    });


    gltf.scene.traverse(obj => {
      if (obj.isMesh) {
        if (!(obj.material instanceof THREE.MeshStandardMaterial)) {
          obj.material = new THREE.MeshStandardMaterial({
            color: obj.material.color,
            roughness: 0.7,
            metalness: 0
          });
        }
      }
    });
    
    // Cámara del GLTF
    camera = gltf.cameras.find(c => c.name === "c") || gltf.cameras[0];
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();

    // Orbit Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = false;
    controls.enableRotate = false;
    controls.enablePan = false;

    camera.position.set(-2, 2, 2);

    animate();
  }
);


/*********************************************
 * ANIMACIÓN DE ENTRADA — SOLO SE EJECUTA
 * CUANDO EL LOADER EMITE EL EVENTO
 *********************************************/
function startThreeIntro() {
  if (!camera) return;

  const finalPos = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z
  };

  camera.position.set(
    finalPos.x - 1.2,
    finalPos.y + 1.4,
    finalPos.z + 2.4
  );

  camera.lookAt(0, 0, 0);

  gsap.to(camera.position, {
    x: finalPos.x,
    y: finalPos.y,
    z: finalPos.z,
    duration: 3.4,
    ease: "expo.out"
  });

  gsap.fromTo(
    camera.rotation,
    { x: camera.rotation.x + 0.12, y: camera.rotation.y - 0.04 },
    {
      x: camera.rotation.x,
      y: camera.rotation.y,
      duration: 3,
      ease: "expo.out"
    }
  );

  if (concreteRing) {
    gsap.from(concreteRing.position, {
      y: concreteRing.position.y - 0.35,
      duration: 2.6,
      ease: "expo.out"
    });
  }

  // if (shape2) {
  //   gsap.from(shape2.rotation, {
  //     y: shape2.rotation.y - 1.4,
  //     duration: 2.6,
  //     ease: "expo.out"
  //   });
  // }

  // NAV
  gsap.from("[nav]", {
    y: "-20%",
    opacity: 0,
    duration: 1.5,
    ease: "power3.out",
    delay: 0.4
  });

  // HERO
  gsap.from(".hero-trigger > *", {
    opacity: 0,
    y: 20,
    duration: 1.4,
    ease: "power3.out",
    delay: 0.4,
    stagger: 0.30
  });
}


/*********************************************
 * EVENTOS QUE RECIBE DEL LOADER
 *********************************************/
window.addEventListener("three-start-intro", startThreeIntro);

/*********************************************
 * LOOP
 *********************************************/
let mouseX = 0, mouseY = 0, t = 0;

document.addEventListener("mousemove", (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

function animate() {
  requestAnimationFrame(animate);

  if (controls) controls.update();
  if (shape2) shape2.rotation.y += 0.01;

  t += 0.01;
  if (concreteRing)
    concreteRing.position.y = Math.sin(t) * 0.02;

  if (light) {
    // Movimiento objetivo basado en el mouse
    const targetLX = 4 + mouseX * 1.2;   // sensibilidad horizontal
    const targetLY = 10 + mouseY * 0.8;  // sensibilidad vertical
    const targetLZ = 14;                 // tu valor original, no lo tocamos

    // Movemos la luz suavemente
    light.position.x += (targetLX - light.position.x) * 0.06;
    light.position.y += (targetLY - light.position.y) * 0.06;
    light.position.z += (targetLZ - light.position.z) * 0.06;

    // Apuntamos la luz al centro
    light.target.position.set(0, 0, 0);
    light.target.updateMatrixWorld();
  }


  if (camera) {
    // Parallax mouse
    const parallaxX = mouseX * 0.4;
    const parallaxY = mouseY * 0.1;

    camera.position.x += (parallaxX - camera.position.x) * 0.03;
    camera.position.y += (-parallaxY - camera.position.y) * 0.02;

    camera.lookAt(0, 0, 0);
  }

  renderer.render(scene, camera);
}
let lastBreakpoint = null;
let lastWidth = window.innerWidth;

// detecta el breakpoint actual
function getBreakpoint() {
  return window.innerWidth < 768 ? "mobile" : "desktop";
}

function adjustCameraForMobile() {
  if (!camera) return;

  // ⛔️ ignorar resizes donde SOLO cambia el alto
  if (window.innerWidth === lastWidth) {
    return;  
  }

  lastWidth = window.innerWidth;

  const current = getBreakpoint();

  // solo actualizar si cambió el breakpoint
  if (current === lastBreakpoint) return;

  lastBreakpoint = current;

  if (current === "mobile") {
    camera.position.set(-2.3, 2.3, 2.8);
  } else {
    camera.position.set(-2, 2, 2);
  }

  camera.updateProjectionMatrix();
}

// ejecutar una vez al cargar
adjustCameraForMobile();

// ejecutar cuando cambia width real (no el alto)
window.addEventListener('resize', adjustCameraForMobile);


/*********************************************
 * RESIZE
 *********************************************/
window.addEventListener("resize", () => {
  if (!camera) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});







const audio = new Audio("https://3dlive.netlify.app/videos/audio-bg.mp3");
audio.loop = true;
audio.preload = "auto";
audio.volume = 0.6;

// ICONOS
const ICON_PLAY = "https://cdn.prod.website-files.com/68f7d96bca9eac99488aefec/691b3d566dab3e9059d132ff_Volume%20up%20(1).svg"; // volumen ON
const ICON_PAUSE = "https://cdn.prod.website-files.com/68f7d96bca9eac99488aefec/691ca97f95ad272d8d52fe9f_Volume%20off%201.svg"; // volumen OFF


// Botón de play/pause
const btn = document.querySelector("[audio-btn]");
const icon = document.querySelector("[audio-icon]");


let isPlaying = false;

btn.addEventListener("click", async () => {
  if (!isPlaying) {
    try {
      await audio.play();
      isPlaying = true;
      icon.src = ICON_PAUSE;

      btn.classList.add("active");
    } catch(e){}
  } else {
    audio.pause();
    isPlaying = false;
    icon.src = ICON_PLAY;

    btn.classList.remove("active");
  }
});

