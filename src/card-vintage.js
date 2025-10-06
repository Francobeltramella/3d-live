import * as THREE from 'three';
import gsap from 'gsap';


// Animación de carga

gsap.timeline()
  .to("[text-loading]", { opacity: 1,delay:0.3, y: -20, duration: 1, ease: "power2.out" })
  .to("[text-loading]", { opacity: 0, y: 0, duration: 1, ease: "power2.in" })
  .to(".courtain", { height: 0, stagger: 0.5, duration: 1, ease: "power2.inOut" })
  .to(".loading-wrapper", { display: "none", duration: 0 });

const CONFIG = {
  cardSize: { width: 2.7, height: 3.3 },
  animationSpeed: 0.02,
  rotationIntensity: 0.3,
  vintageIntensity: 0.8
};

class LenticularCard {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    this.mouseX = 0;
    this.mouseY = 0;
    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.currentMix = 0;
    this.targetMix = 0;

    this.init();
    this.animate();
  }

  init() {
    // Escena y cámara
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, this.width / this.height, 0.1, 100);
    this.camera.position.z = 6;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.container.appendChild(this.renderer.domElement);

    // Luces
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 5, 5);
    this.scene.add(dirLight);

    // Texturas iniciales
    const loader = new THREE.TextureLoader();
    const tex1 = loader.load(this.container.dataset.img1);
    const tex2 = loader.load(this.container.dataset.img2);
    [tex1, tex2].forEach(t => {
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.minFilter = THREE.LinearFilter;
    });

    // Geometría
    const geometry = new THREE.PlaneGeometry(CONFIG.cardSize.width, CONFIG.cardSize.height, 64, 64);

    // Material con shader
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_mix: { value: 0 },
        u_texture1: { value: tex1 },
        u_texture2: { value: tex2 },
        u_time: { value: 0 },
        u_vintage: { value: CONFIG.vintageIntensity },
        u_lightDirection: { value: new THREE.Vector3(1, 1, 1) },
        u_glitch: { value: 0 },
        u_lightWave: { value: 0 },
        u_dust: { value: 0 } // 👈 nuevo
      },
      
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
      uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform float u_mix;
uniform float u_time;
uniform float u_vintage;
uniform vec3 u_lightDirection;
uniform float u_dust;

varying vec2 vUv;
varying vec3 vNormal;

// --- ruido pseudoaleatorio base ---
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// --- ruido fino tipo "grain" ---
float grain(vec2 uv, float time) {
  return random(uv + time * 0.1) * 0.3;
}

// --- polvo / neblina ---
float dustNoise(vec2 uv, float time) {
  float n = random(uv * 20.0 + time * 0.5);
  n += random(uv * 40.0 - time * 0.8) * 0.5;
  return smoothstep(0.4, 0.8, n);
}

// --- vignette y sepia ---
float vignette(vec2 uv) {
  vec2 center = vec2(0.5);
  float dist = distance(uv, center);
  return 1.0 - smoothstep(0.3, 0.8, dist);
}

vec3 sepia(vec3 color) {
  return vec3(
    dot(color, vec3(0.393, 0.769, 0.189)),
    dot(color, vec3(0.349, 0.686, 0.168)),
    dot(color, vec3(0.272, 0.534, 0.131))
  );
}

void main() {
  vec2 uv = vUv;

  // texturas base
  vec4 t1 = texture2D(u_texture1, uv);
  vec4 t2 = texture2D(u_texture2, uv);
  vec4 color = mix(t2, t1, u_mix);

  // --- efecto polvo ---
  float dust = dustNoise(uv, u_time);
  vec3 dustColor = vec3(1.0, 0.972, 0.78); // ≈ #fff8c7 cálido suave
  color.rgb = mix(color.rgb, dustColor, u_dust * dust);

  // --- GRAIN restaurado con color cálido ---
  float grainAmount = grain(uv, u_time) * (0.6 + u_dust * 0.4);
  vec3 warmGrainColor = vec3(1.0, 0.972, 0.78); // mismo tono #fff8c7
  color.rgb += warmGrainColor * grainAmount;

  // --- vintage toning ---
  if (u_vintage > 0.0) {
    float vignetteAmount = vignette(uv) * 0.3 * u_vintage;
    color.rgb *= (1.0 + vignetteAmount);
    vec3 sepiaColor = sepia(color.rgb);
    color.rgb = mix(color.rgb, sepiaColor, u_vintage * 0.3);
    color.rgb = pow(color.rgb, vec3(1.1 + u_vintage * 0.2));
  }

  // --- luz suave ---
  vec3 lightDir = normalize(u_lightDirection);
  float NdotL = max(dot(vNormal, lightDir), 0.0);
  float lighting = 0.7 + 0.3 * NdotL;
  color.rgb *= lighting;

  gl_FragColor = color;
}

      
      
      `
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);

    // Movimiento mouse
    this.container.addEventListener("mousemove", (e) => {
      const rect = this.container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      this.mouseX = x * 2 - 1;
      this.mouseY = -(y * 2 - 1);

      this.targetRotationY = this.mouseX * CONFIG.rotationIntensity;
      this.targetRotationX = this.mouseY * CONFIG.rotationIntensity * 0.5;
      this.targetMix = (this.mouseX + 1.0) / 2.0;
    });
  }

  updateTextures(img1, img2) {
    const loader = new THREE.TextureLoader();
    const tex1 = loader.load(img1);
    const tex2 = loader.load(img2);
    [tex1, tex2].forEach(t => {
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.minFilter = THREE.LinearFilter;
    });
    this.material.uniforms.u_texture1.value = tex1;
    this.material.uniforms.u_texture2.value = tex2;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.mesh.rotation.y += (this.targetRotationY - this.mesh.rotation.y) * 0.1;
    this.mesh.rotation.x += (this.targetRotationX - this.mesh.rotation.x) * 0.1;
    this.currentMix += (this.targetMix - this.currentMix) * 0.1;
    this.material.uniforms.u_mix.value = this.currentMix;
    this.material.uniforms.u_time.value += CONFIG.animationSpeed;
    this.renderer.render(this.scene, this.camera);
  }
}

// ======= INSTANCIA + CLICK GLITCH =======

const card = new LenticularCard(document.querySelector('.card3d'));

document.querySelectorAll('.thumbs img').forEach(img => {
  img.addEventListener('click', () => {
    const img1 = img.dataset.img1;
    const img2 = img.dataset.img2;

    const tl = gsap.timeline();

    // 1. polvo aparece cubriendo la card
    tl.to(card.material.uniforms.u_dust, { value: 1, duration: 0.4, ease: "power2.in" })
      .to(card.material.uniforms.u_mix, { value: 0, duration: 0.3 }, "<")
      // 2. cambiamos las texturas en el punto medio
      .add(() => {
        card.updateTextures(img1, img2);
      })
      // 3. polvo se disipa lentamente revelando la nueva imagen
      .to(card.material.uniforms.u_dust, { value: 0, duration: 1.2, ease: "power3.out" })
      .to(card.material.uniforms.u_mix, { value: 0.5, duration: 0.5 }, "<");
  });
});

