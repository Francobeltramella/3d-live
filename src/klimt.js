
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { PMREMGenerator } from 'three';


// Escena, cámara, renderizador
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0, 8, 20);
camera.lookAt(0,5,0);



const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.querySelector('.element-3d').appendChild(renderer.domElement);// ---------- HDRI ----------
const pmremGenerator = new PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new EXRLoader().load('https://3dlive.netlify.app/videos/sky.exr', (texture) => {
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  scene.environment = envMap;
  scene.background = envMap;
  texture.dispose();
  pmremGenerator.dispose();
});

const loader = new GLTFLoader();
let concreteRing = null;

loader.load('https://3dlive.netlify.app/k12.glb', (gltf) => {
  const model = gltf.scene;

  // Centrarlo al terreno
  model.position.set(-2, 0, 0); // puedes ajustar Y si se entierra o flota

  // Escalar si es muy grande o chico
  model.scale.set(6, 6, 6); // ajusta según sea necesario\

  model.traverse((child) => {
    if (child.name) {
      console.log('Objeto:', child.name);
    }
  });

  concreteRing = model.getObjectByName('concrete_ring');
  if (concreteRing) {
    concreteRing.scale.set(4, 4, 4);
    console.log('✔️ concrete_ring encontrado y listo');
   // concreteRing.position.set(0, 0, 0);
    //concreteRing.rotation.set(0, 0, 0);
  } else {
    console.warn('❌ No se encontró concrete_ring');
  }

  scene.add(model);
});





// Terreno
const terrainSize = 70;
const terrainRes = 500;
const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainRes, terrainRes);
terrainGeo.rotateX(-Math.PI/2);
for (let i = 0; i < terrainGeo.attributes.position.count; i++){
  const x = terrainGeo.attributes.position.getX(i);
  const z = terrainGeo.attributes.position.getZ(i);
  const y = Math.sin(x*0.3) * Math.cos(z*0.3) * 1.5; // altura variable
  terrainGeo.attributes.position.setY(i, y);
}
terrainGeo.computeVertexNormals();
const terrainMat = new THREE.MeshStandardMaterial({ color:0x556644, flatShading:true });
const terrain = new THREE.Mesh(terrainGeo, terrainMat);
scene.add(terrain);

// Luz
const dirLight = new THREE.DirectionalLight(0xffffff, 0.1);

scene.add(dirLight);
scene.add(new THREE.AmbientLight(0x777777));

const flowerCount = 10000;

const stemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.5, 8);
stemGeo.translate(0, 0.25, 0);

// Flor
const flowerGeo = new THREE.PlaneGeometry(0.2, 0.2);
flowerGeo.scale(2.0, 2.0, 1); // agrandar la flor
flowerGeo.translate(0, 0.55, 0);

// Fusionar
const mergedGeo = BufferGeometryUtils.mergeGeometries([stemGeo, flowerGeo]);

const flowerTexture = new THREE.TextureLoader().load('https://cdn.prod.website-files.com/68f7d96bca9eac99488aefec/69096dbb5f994d7606274120_f3.png');
const flowerMat = new THREE.MeshBasicMaterial({
  map: flowerTexture,
  transparent: true,
  alphaTest: 0.5,
  side: THREE.DoubleSide
});

// Ahora creás el InstancedMesh
const flowers = new THREE.InstancedMesh(mergedGeo, flowerMat, flowerCount);
const dummy2 = new THREE.Object3D();

console.log('🌼 InstancedMesh agregado:', flowers);
console.log('Total instancias:', flowerCount);

for (let i = 0; i < flowerCount; i++) {
    const x = (Math.random() - 0.5) * terrainSize;
    const z = (Math.random() - 0.5) * terrainSize;
  
    // 💡 Usa el mismo cálculo que el terreno
    const y = Math.sin(x * 0.3) * Math.cos(z * 0.3) * 1.5;
  
    dummy2.position.set(x, y + 0.2, z); // más alto para destacar
    dummy2.rotation.y = Math.random() * Math.PI * 2;
    const s = 0.3 + Math.random() * 0.2;
    dummy2.scale.set(s, s, s);
    dummy2.updateMatrix();
  
    flowers.setMatrixAt(i, dummy2.matrix);
  }
scene.add(flowers);

// Uniforms para césped shader
const uniforms = {
    uTime: { value: 0 },
    uSpeed: { value: 1.0 },
    uHalfWidth: { value: 0.05 },
    uBaseColor: { value: new THREE.Color(0.1, 0.4, 0.1) },
    uTipColor: { value: new THREE.Color(0.4, 0.8, 0.4) },
    uFogColor: { value: new THREE.Color(0.8, 0.9, 0.9) },
    uMouseWorld: { value: new THREE.Vector3(0, 0, 0) } // 👈 importante
  };

// Geometría de una brizna
function createBladeGeometry(height = 1, width = 0.1, segments = 6){
  const positions = [];
  const halfWidth = width/2;
  const taper = width * 0.5 / segments;
  for (let i = 0; i < segments; i++){
    const y0 = (i/segments)*height;
    const y1 = ((i+1)/segments)*height;
    const w0 = halfWidth - taper*i;
    const w1 = halfWidth - taper*(i+1);
    positions.push(-w0, y0, 0);
    positions.push(w0, y0, 0);
    positions.push(-w1, y1, 0);
    positions.push(-w1, y1, 0);
    positions.push(w0, y0, 0);
    positions.push(w1, y1, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.computeVertexNormals();
  return geo;
}

const bladeGeo = createBladeGeometry(1, 0.1, 7);
const bladeMat = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uHalfWidth;
  uniform vec3 uMouseWorld;
  
  varying float vElevation;
  varying float vSideGradient;
  varying vec3 vNormal;
  varying vec3 vFakeNormal;
  varying vec3 vPosition;
  
  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
  }
  
  mat3 rotationY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c);
  }
  
  float bezier(float t, float p1) {
    float invT = 1.0 - t;
    return invT*invT*0.0 + 2.0*invT*t*p1 + t*t*1.0;
  }
  
  float cnoise(vec2 P){
    return sin(P.x * 0.5 + P.y * 0.3 + uTime * 0.2) * 0.5;
  }
  
  vec3 deform(vec3 pos){
    vec3 localPosition = pos;
    float hash = rand(vec2(instanceMatrix[3].x, instanceMatrix[3].z));
    float bendStrength = mix(0.3,0.6,hash);
    float bendStart = mix(0.0,0.3,hash);
    float t = clamp((pos.y/1.0 - bendStart)/(1.0 - bendStart), 0.0, 1.0);
    float topBendFactor = bezier(t, 0.1);
  
    float gentleSway = sin(uTime * uSpeed * 0.8 + hash * 10.0) * 0.1;
    vec3 gentleDir = normalize(vec3(1.0,0.0,1.0));
    vec3 gentleOffset = gentleDir * gentleSway * t;
  
    vec3 worldPos = (instanceMatrix * vec4(pos, 1.0)).xyz;
    float wave = cnoise(worldPos.xz * 0.3 + vec2(uTime * uSpeed * 0.2, 0.0));
    float strongWind = wave * 0.65;
    vec3 strongDir = normalize(vec3(0.0, 0.0, 1.0));
    vec3 strongOffset = strongDir * strongWind * pow(pos.y, 2.0);
  
    // Mouse interaction
    vec2 worldXZ = worldPos.xz;
    vec2 mouseXZ = uMouseWorld.xz;
    
    float dist = distance(worldXZ, mouseXZ);
    float influence = 1.0 - smoothstep(0.0, 5.0, dist); // más sutil
    vec2 pushDir = normalize(worldXZ - mouseXZ);
    
    // Empuje más suave
    localPosition.xz += pushDir * influence * 0.05;
    
  
    localPosition += instanceMatrix[2].xyz * bendStrength * topBendFactor;
    localPosition += gentleOffset;
    localPosition += strongOffset;
    localPosition.y -= 0.1 * strongOffset.z;
  
    vec3 camPos = inverse(viewMatrix)[3].xyz;
    vec3 bladeWorldPos = instanceMatrix[3].xyz;
    vec2 toCamera2D = normalize(camPos.xz - bladeWorldPos.xz);
    float angleToCamera = atan(toCamera2D.y, toCamera2D.x);
    mat3 billboardRot = rotationY(angleToCamera);
    localPosition = billboardRot * localPosition;
  
    return localPosition;
  }
  
  void main(){
    vec3 p = deform(position);
    vec3 offsetX = deform(position + vec3(0.01,0.0,0.0));
    vec3 offsetY = deform(position + vec3(0.0,0.01,0.0));
  
    vec4 worldPosition = instanceMatrix * vec4(p, 1.0);
    vec4 viewPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * viewPosition;
  
    vElevation = position.y;
    vPosition = worldPosition.xyz;
    vSideGradient = 1.0 - ((position.x + uHalfWidth) / (2.0 * uHalfWidth));
  
    vec3 normalWS = normalize(cross(offsetX - p, offsetY - p));
    vNormal = normalWS;
    vec3 invNormal = vNormal;
    invNormal.x *= -1.0;
    vFakeNormal = mix(vNormal, invNormal, vSideGradient);
  }
  `,
  fragmentShader: `
    uniform vec3 uBaseColor;
    uniform vec3 uTipColor;
    uniform vec3 uFogColor;
    varying float vElevation;
    varying float vSideGradient;
    varying vec3 vNormal;
    varying vec3 vFakeNormal;
    varying vec3 vPosition;

    vec3 directionalLight(vec3 lightColor,float lightIntensity,vec3 normal,vec3 lightPosition,vec3 viewDirection, float specularPower){
      vec3 lightDirection = normalize(lightPosition);
      vec3 lightReflection = reflect(-lightDirection, normal);
      float shading = dot(normal, lightDirection);
      shading = max(0.0, shading);
      float specular = - dot(lightReflection, viewDirection);
      specular = max(0.0, specular);
      specular = pow(specular, specularPower) * shading;
      return lightColor * lightIntensity * (shading + specular);
    }
    vec3 ambientLight(vec3 lightColor, float lightIntensity){
      return lightColor * lightIntensity;
    }

    void main(){
      float gradient = smoothstep(0.2, 1.0, vElevation);
      float sideGradient = smoothstep(0.2, 1.0, vSideGradient);
      vec3 finalColor = mix(uBaseColor, uTipColor, gradient);
      vec3 light = vec3(0.0);
      vec3 normal = gl_FrontFacing ? vFakeNormal : -vFakeNormal;
      vec3 viewDirection = normalize(cameraPosition - vPosition);

      light += ambientLight(vec3(1.0,1.0,1.0), 0.2);
      light += directionalLight(uFogColor, 1.0, normal, vec3(2.0,2.0,2.0), viewDirection, 200.0);

      finalColor *= clamp(light, 0.0, 1.0); // limita la intensidad

      float dist = length(cameraPosition - vPosition);
      float fogFactor = smoothstep(50.0, 80.0, dist);
      finalColor = mix(finalColor, uFogColor, fogFactor);

      gl_FragColor = vec4(finalColor,1.0);
    }
  `,
  side: THREE.DoubleSide
});

// InstancedMesh para el césped
const COUNT = 400000;
const grass = new THREE.InstancedMesh(bladeGeo, bladeMat, COUNT);
const dummy = new THREE.Object3D();

for (let i = 0; i < COUNT; i++){
  const x = (Math.random() - 0.5) * terrainSize;
  const z = (Math.random() - 0.5) * terrainSize;
  // obtener altura del terreno: aproximada
  const y = Math.sin(x*0.3) * Math.cos(z*0.3) * 1.5;
  dummy.position.set(x, y, z);
  dummy.rotation.y = Math.random() * Math.PI * 2;
  dummy.scale.setScalar(0.8 + Math.random()*0.4);
  dummy.updateMatrix();
  grass.setMatrixAt(i, dummy.matrix);
}
scene.add(grass);


const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // plano Y = 0
const mouseWorld = new THREE.Vector3();

window.addEventListener('mousemove', (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(plane, mouseWorld);

  uniforms.uMouseWorld.value.copy(mouseWorld);
});
let scrollProgress = 0;

window.addEventListener('scroll', () => {
  const scrollMax = document.body.scrollHeight - window.innerHeight;
  scrollProgress = window.scrollY / scrollMax;
});



// Animación
const clock = new THREE.Clock();
function animate(){
  uniforms.uTime.value = clock.getElapsedTime();


    // Scroll suave
    camera.position.z = 20 - scrollProgress * 20;
    //camera.rotation.y = scrollProgress * 0.2;
  
    if (concreteRing) {
      concreteRing.rotation.y = scrollProgress * Math.PI * 0.5;
       //   const t = clock.getElapsedTime();
    //   concreteRing.position.y = Math.sin(t * 1.0) * 0.1 + 0.1; // velocidad y amplitud
    }
  
    const camY = camera.position.y;

   
  renderer.render(scene, camera);
  requestAnimationFrame(animate);

  
}
animate();

// Resize
window.addEventListener('resize', ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

