let activeShader = null;
  
function initWebGLEffects() {
  // Configurar botones de cambio de shader
  const bulgeBtn = document.querySelector('[data-shader="bulge"]');
  const rippleBtn = document.querySelector('[data-shader="glitch"]');
  const gridBtn = document.querySelector('[data-shader="grid"]');


  const shaderButtons = [bulgeBtn, rippleBtn,gridBtn];

  function setActiveButton(button) {
    shaderButtons.forEach(btn => btn?.classList.remove("active")); 
    button.classList.add("active");
  }

  if (bulgeBtn) {
    bulgeBtn.addEventListener("click", () => {
      console.log("click bulge")
      setActiveButton(bulgeBtn);
      setTimeout(() => {
        clearShaders();
        activeShader = new VideoBulgeEffect();
      }, 400);
    });
  }

  if (rippleBtn) {
    rippleBtn.addEventListener("click", () => {
      setActiveButton(rippleBtn);

      setTimeout(() => {
        clearShaders();
        activeShader = new VideoInkRevealEffect();
      }, 400);
    });
  }



if (gridBtn) {
  gridBtn.addEventListener("click", () => {
    setActiveButton(gridBtn);
    setTimeout(() => {
      clearShaders();
      activeShader = new VideoGridLiftEffect();
    }, 400);
  });
}

  // Iniciar con el efecto por defecto
  activeShader = new VideoBulgeEffect();
}

function clearShaders() {
  // Limpiar todos los canvas previos
  document.querySelectorAll("canvas").forEach((c) => c.remove());

  // Resetear videos
  document.querySelectorAll("video").forEach((v) => {
    v.pause();
    v.currentTime = 0;
    v.load();
  });
}

function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}


class VideoBulgeEffect {
  constructor() {
    this.videos = document.querySelectorAll("#test-video");
    this.canvases = [];
    this.gl = null;
    this.programs = [];
    this.textures = [];
    this.mouse = { x: 0.5, y: 0.5 };
    this.targetMouse = { x: 0.5, y: 0.5 };
    this.isHovering = false;
    this.effectStrength = 0;
    this.time = 0;
    this.colorShift = 0;
    this.flareIntensity = 0;

    this.init();
  }

  async init() {
    for (let i = 0; i < this.videos.length; i++) {
      const video = this.videos[i];

      // Set CORS attributes
      video.crossOrigin = "anonymous";

      // Wait for video to be ready
      try {
        await this.setupVideo(video);
      } catch (error) {
        console.error("Error setting up video:", error);
        continue;
      }

      const wrapper = video.parentElement;

      // Create canvas with high DPI support
      const canvas = document.createElement("canvas");
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.zIndex = "2";
      wrapper.appendChild(canvas);
      this.canvases.push(canvas);

      // Setup WebGL with high quality settings
      const gl = canvas.getContext("webgl", {
        preserveDrawingBuffer: true,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        depth: false,
        stencil: false,
      });
      if (!gl) {
        console.error("WebGL not supported");
        return;
      }

      // Enable high quality texture settings
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

      // Create program
      const program = this.createProgram(gl);
      this.programs.push(program);

      // Create texture with high quality settings
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Configure texture for high quality
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      this.textures.push(texture);

      // Create geometry
      const geometry = this.createGeometry(gl);

      // Setup mouse events
      wrapper.addEventListener("mouseenter", () => {
        this.isHovering = true;
      });

      wrapper.addEventListener("mouseleave", () => {
        this.isHovering = false;
        this.effectStrength = 0;
        this.flareIntensity = 0;
        this.colorShift = 0;
        this.mouse = { x: 0.5, y: 0.5 };
        this.targetMouse = { x: 0.5, y: 0.5 };
      });

      wrapper.addEventListener("mousemove", (e) => {
        if (this.isHovering) {
          const rect = wrapper.getBoundingClientRect();
          this.targetMouse.x = (e.clientX - rect.left) / rect.width;
          this.targetMouse.y = 1 - (e.clientY - rect.top) / rect.height;
        }
      });

      // Handle resize for high DPI
      const handleResize = () => {
        const rect = wrapper.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
      };

      window.addEventListener("resize", handleResize);
      handleResize();

      // Start render loop
      this.render(gl, program, texture, geometry, video);
    }
  }

  setupVideo(video) {
    return new Promise((resolve, reject) => {
      // Set video attributes
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");

      // Handle video loading
      const handleCanPlay = () => {
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("error", handleError);
        resolve();
      };

      const handleError = (error) => {
        video.removeEventListener("canplay", handleCanPlay);
        video.removeEventListener("error", handleError);
        reject(error);
      };

      video.addEventListener("canplay", handleCanPlay);
      video.addEventListener("error", handleError);

      // Start loading the video
      video.load();
    });
  }

  createProgram(gl) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(
      vertexShader,
      `
            attribute vec2 position;
            attribute vec2 uv;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 0, 1);
            }
        `
    );
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(
      fragmentShader,
      `
            precision highp float;
            uniform sampler2D uTexture;
            uniform vec2 uMouse;
            uniform float uEffectStrength;
            uniform float uTime;
            uniform float uColorShift;
            uniform float uFlareIntensity;
            varying vec2 vUv;

            // Noise function for organic effects
            float noise(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }

            // Smooth noise
            float smoothNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float a = noise(i);
                float b = noise(i + vec2(1.0, 0.0));
                float c = noise(i + vec2(0.0, 1.0));
                float d = noise(i + vec2(1.0, 1.0));
                
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }

            // Chromatic aberration
            vec3 chromaticAberration(sampler2D tex, vec2 uv, float strength) {
                float r = texture2D(tex, uv + vec2(strength * 0.01, 0.0)).r;
                float g = texture2D(tex, uv).g;
                float b = texture2D(tex, uv - vec2(strength * 0.01, 0.0)).b;
                return vec3(r, g, b);
            }

            // Light flare effect
            vec3 addFlare(vec2 uv, vec2 center, float intensity) {
                vec2 delta = uv - center;
                float dist = length(delta);
                float flare = 1.0 / (1.0 + dist * 12.0) * intensity;
                
                vec3 flareColor = vec3(1.0, 0.9, 0.7) * flare * 0.5;
                flareColor += vec3(0.3, 0.5, 1.0) * flare * 0.2 * sin(uTime * 1.0);
                
                return flareColor;
            }

            void main() {
                vec2 center = uMouse;
                vec2 uv = vUv;
                
                // Only apply distortion when effect strength is greater than 0
                if (uEffectStrength > 0.0) {
                    // Calculate distance from center
                    vec2 delta = uv - center;
                    float dist = length(delta);
                    
                    // Apply bulge effect with enhanced parameters
                    const float radius = 0.95;
                    const float strength = 1.2;
                    float distPow = pow(dist / radius, 2.0);
                    float strengthAmount = strength / (1.0 + distPow);
                    
                    // Add some organic movement with noise
                    float noiseOffset = smoothNoise(uv * 10.0 + uTime * 0.5) * 0.02 * uEffectStrength;
                    strengthAmount += noiseOffset;
                    
                    // Apply distortion
                    uv = center + delta * strengthAmount;
                }
                
                // Sample texture with chromatic aberration
                vec3 color = chromaticAberration(uTexture, uv, uColorShift);
                
                // Add light flare effect
                if (uFlareIntensity > 0.0) {
                    vec3 flare = addFlare(vUv, uMouse, uFlareIntensity);
                    color = mix(color, color + flare, 0.3);
                }
                
                // Add subtle color distortion based on mouse position
                if (uEffectStrength > 0.0) {
                    vec2 delta = vUv - uMouse;
                    float dist = length(delta);
                    float colorDistortion = 1.0 / (1.0 + dist * 5.0) * uEffectStrength * 0.3;
                    
                    // Shift colors based on position
                    color.r += colorDistortion * sin(uTime + dist * 10.0) * 0.1;
                    color.g += colorDistortion * cos(uTime + dist * 8.0) * 0.1;
                    color.b += colorDistortion * sin(uTime + dist * 12.0) * 0.1;
                }
                
                // Add subtle vignette effect
                vec2 vignette = vUv - 0.5;
                float vignetteStrength = 1.0 - dot(vignette, vignette) * 0.3;
                color *= vignetteStrength;
                
                gl_FragColor = vec4(color, 1.0);
            }
        `
    );
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    return program;
  }

  createGeometry(gl) {
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

    const uvs = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);

    const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);

    const geometry = {
      vertices: gl.createBuffer(),
      uvs: gl.createBuffer(),
      indices: gl.createBuffer(),
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, geometry.vertices);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, geometry.uvs);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return geometry;
  }

  render(gl, program, texture, geometry, video) {
    const render = () => {
      // Update time for animations
      this.time += 0.016; // Approximately 60fps

      // Update effect strength based on hover state
      if (this.isHovering) {
        this.effectStrength += (1 - this.effectStrength) * 0.15;
        this.flareIntensity += (0.6 - this.flareIntensity) * 0.1;
        this.colorShift += (1 - this.colorShift) * 0.1;
      } else {
        this.effectStrength = 0;
        this.flareIntensity = 0;
        this.colorShift = 0;
      }

      // Smoothly update mouse position only when hovering
      if (this.isHovering) {
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.15;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.15;
      }

      // Update texture if video is playing
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Use high quality texture settings
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          video
        );
      }

      // Clear canvas
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Use program
      gl.useProgram(program);

      // Set uniforms
      const mouseLocation = gl.getUniformLocation(program, "uMouse");
      gl.uniform2f(mouseLocation, this.mouse.x, this.mouse.y);

      const strengthLocation = gl.getUniformLocation(
        program,
        "uEffectStrength"
      );
      gl.uniform1f(strengthLocation, this.effectStrength);

      const timeLocation = gl.getUniformLocation(program, "uTime");
      gl.uniform1f(timeLocation, this.time);

      const colorShiftLocation = gl.getUniformLocation(program, "uColorShift");
      gl.uniform1f(colorShiftLocation, this.colorShift);

      const flareIntensityLocation = gl.getUniformLocation(
        program,
        "uFlareIntensity"
      );
      gl.uniform1f(flareIntensityLocation, this.flareIntensity);

      // Set attributes
      const positionLocation = gl.getAttribLocation(program, "position");
      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.vertices);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      const uvLocation = gl.getAttribLocation(program, "uv");
      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.uvs);
      gl.enableVertexAttribArray(uvLocation);
      gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);

      // Draw
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indices);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

      requestAnimationFrame(render);
    };

    render();
  }
}

// ========================================
// VIDEO INK REVEAL EFFECT
// ========================================

class VideoInkRevealEffect {
  constructor() {
    this.videos = document.querySelectorAll("#test-video");
    this.intensity = 0;
    this.mouse = { x: 0.5, y: 0.5 };
    this.targetMouse = { x: 0.5, y: 0.5 };
    this.lastMouse = { x: 0.5, y: 0.5 };
    this.isHovering = false;
    this.time = 0;

    this.init();
  }

  async init() {
    for (const video of this.videos) {
      await this.setupVideo(video);
      const wrapper = video.parentElement;

      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.zIndex = "2";
      wrapper.appendChild(canvas);

      const gl = canvas.getContext("webgl");
      if (!gl) return;

      const program = this.createProgram(gl);
      const geometry = this.createGeometry(gl);
      const texture = gl.createTexture();

      // Mouse events
      wrapper.addEventListener("mouseenter", () => {
        this.isHovering = true;
      });
      wrapper.addEventListener("mouseleave", () => {
        this.isHovering = false;
      });
      wrapper.addEventListener("mousemove", (e) => {
        const rect = wrapper.getBoundingClientRect();
        this.targetMouse.x = (e.clientX - rect.left) / rect.width;
        this.targetMouse.y = (e.clientY - rect.top) / rect.height;
      });

      const resize = () => {
        const rect = wrapper.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        gl.viewport(0, 0, canvas.width, canvas.height);
      };
      window.addEventListener("resize", resize);
      resize();

      this.render(gl, program, texture, geometry, video);
    }
  }

  setupVideo(video) {
    return new Promise((resolve, reject) => {
      video.crossOrigin = "anonymous";
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");

      const onReady = () => {
        video.removeEventListener("canplay", onReady);
        video.removeEventListener("error", onError);
        resolve();
      };
      const onError = (err) => {
        video.removeEventListener("canplay", onReady);
        video.removeEventListener("error", onError);
        reject(err);
      };
      video.addEventListener("canplay", onReady);
      video.addEventListener("error", onError);
      video.load();
    });
  }

  createProgram(gl) {
    const vs = `
            attribute vec2 position;
            attribute vec2 uv;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

    const fs = `
            precision highp float;
            uniform sampler2D uTexture;
            uniform vec2 uMouse;
            uniform float uTime;
            uniform float uIntensity;
            uniform vec2 uMouseVelocity;
            varying vec2 vUv;
            
            float rand(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f*f*(3.0 - 2.0*f);
                float a = rand(i);
                float b = rand(i + vec2(1.0, 0.0));
                float c = rand(i + vec2(0.0, 1.0));
                float d = rand(i + vec2(1.0, 1.0));
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            
            float abstractMask(vec2 uv, vec2 center, float baseRadius, float t, vec2 velocity) {
                vec2 scale = vec2(0.75, 1.0);
                vec2 delta = (uv - center) / scale;
            
                float angle = atan(delta.y, delta.x);
                float radialNoise = noise(vec2(angle * 4.0, t * 0.6)) * 0.03;
                float angleStretch = sin(angle * 2.5 + t * 0.5) * 0.02;
                float velocityStretch = dot(normalize(delta), normalize(velocity)) * length(velocity) * 0.3;
            
                float radius = baseRadius + radialNoise + angleStretch + velocityStretch;
                return smoothstep(radius + 0.015, radius - 0.015, length(delta));
            }
            
            void main() {
                vec2 uv = vUv;
            
                vec2 center = uMouse + vec2(
                    sin(uTime * 0.8) * 0.025,
                    cos(uTime * 0.6) * 0.03
                );
            
                float radius = 0.17;
                float mask = abstractMask(uv, center, radius, uTime, uMouseVelocity) * uIntensity;
            
                // Deformación tipo "bulge" en zona activa
                vec2 distortedUV = uv;
                if (mask > 0.0) {
                    vec2 delta = uv - center;
                    float dist = length(delta);
                    float bulge = sin(uTime * 3.0 + dist * 20.0) * 0.03;
                    distortedUV += normalize(delta) * bulge * (1.0 - smoothstep(0.0, radius, dist));
                }
            
                // RGB Split para glitch visual
                vec2 shift = vec2(0.003, 0.0) * mask;
            
                vec3 color;
                color.r = texture2D(uTexture, distortedUV + shift).r;
                color.g = texture2D(uTexture, distortedUV).g;
                color.b = texture2D(uTexture, distortedUV - shift).b;
            
                // Blanco y negro base
                vec3 baseColor = texture2D(uTexture, uv).rgb;
                float gray = dot(baseColor, vec3(0.299, 0.587, 0.114));
                vec3 bw = vec3(gray);
            
                // Combinamos color distorsionado con el resto en gris
                vec3 finalColor = mix(bw, color, mask);
            
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

    const compile = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    return program;
  }

  createGeometry(gl) {
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const uvs = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);
    const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);

    const buffer = (data, type) => {
      const b = gl.createBuffer();
      gl.bindBuffer(type, b);
      gl.bufferData(type, data, gl.STATIC_DRAW);
      return b;
    };

    return {
      position: buffer(positions, gl.ARRAY_BUFFER),
      uv: buffer(uvs, gl.ARRAY_BUFFER),
      index: buffer(indices, gl.ELEMENT_ARRAY_BUFFER),
    };
  }

  render(gl, program, texture, geometry, video) {
    const loop = () => {
      this.time += 0.016;

      const velocityX = this.mouse.x - this.lastMouse.x;
      const velocityY = this.mouse.y - this.lastMouse.y;
      this.lastMouse.x = this.mouse.x;
      this.lastMouse.y = this.mouse.y;

      this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.1;
      this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.1;

      if (this.isHovering) {
        this.intensity += (1 - this.intensity) * 0.1;
      } else {
        this.intensity += (0 - this.intensity) * 0.1;
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);

      if (video.readyState >= 2) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          video
        );
      }

      const getLoc = (name) => gl.getUniformLocation(program, name);
      gl.uniform2f(getLoc("uMouse"), this.mouse.x, this.mouse.y);
      gl.uniform1f(getLoc("uTime"), this.time);
      gl.uniform1f(getLoc("uIntensity"), this.intensity);
      gl.uniform2f(getLoc("uMouseVelocity"), velocityX, velocityY);

      const posLoc = gl.getAttribLocation(program, "position");
      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.position);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      const uvLoc = gl.getAttribLocation(program, "uv");
      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.uv);
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.index);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

      requestAnimationFrame(loop);
    };

    loop();
  }
}


document.addEventListener("DOMContentLoaded", () => {
  
    if (!isMobileDevice()) {
      initWebGLEffects();
    }
  });



  class VideoGridLiftEffect {
    constructor() {
      this.videos = document.querySelectorAll("#test-video");
      this.canvases = [];
      this.gl = null;
      this.programs = [];
      this.textures = [];
      this.mouse = { x: 0.5, y: 0.5 };
      this.targetMouse = { x: 0.5, y: 0.5 };
      this.isHovering = false;
      this.effectStrength = 0;
      this.time = 0;
      this.gridSize = 20;
      this.liftHeight = 0;
  
      this.init();
    }
  
    async init() {
      for (let i = 0; i < this.videos.length; i++) {
        const video = this.videos[i];
        video.crossOrigin = "anonymous";
  
        try {
          await this.setupVideo(video);
        } catch (error) {
          console.error("Error setting up video:", error);
          continue;
        }
  
        const wrapper = video.parentElement;
        const canvas = document.createElement("canvas");
        const dpr = window.devicePixelRatio || 1;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.zIndex = "2";
        wrapper.appendChild(canvas);
        this.canvases.push(canvas);
  
        const gl = canvas.getContext("webgl", {
          preserveDrawingBuffer: true,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          depth: false,
          stencil: false,
        });
        if (!gl) {
          console.error("WebGL not supported");
          return;
        }
  
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  
        const program = this.createProgram(gl);
        this.programs.push(program);
  
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        this.textures.push(texture);
  
        const geometry = this.createGeometry(gl);
  
        wrapper.addEventListener("mouseenter", () => {
          this.isHovering = true;
        });
  
        wrapper.addEventListener("mouseleave", () => {
          this.isHovering = false;
          this.effectStrength = 0;
          this.liftHeight = 0;
          this.mouse = { x: 0.5, y: 0.5 };
          this.targetMouse = { x: 0.5, y: 0.5 };
        });
  
        wrapper.addEventListener("mousemove", (e) => {
          if (this.isHovering) {
            const rect = wrapper.getBoundingClientRect();
            this.targetMouse.x = (e.clientX - rect.left) / rect.width;
            this.targetMouse.y = 1 - (e.clientY - rect.top) / rect.height;
          }
        });
  
        const handleResize = () => {
          const rect = wrapper.getBoundingClientRect();
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          gl.viewport(0, 0, canvas.width, canvas.height);
        };
  
        window.addEventListener("resize", handleResize);
        handleResize();
  
        this.render(gl, program, texture, geometry, video);
      }
    }
  
    setupVideo(video) {
      return new Promise((resolve, reject) => {
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
  
        const handleCanPlay = () => {
          video.removeEventListener("canplay", handleCanPlay);
          video.removeEventListener("error", handleError);
          resolve();
        };
  
        const handleError = (error) => {
          video.removeEventListener("canplay", handleCanPlay);
          video.removeEventListener("error", handleError);
          reject(error);
        };
  
        video.addEventListener("canplay", handleCanPlay);
        video.addEventListener("error", handleError);
        video.load();
      });
    }
  
    createProgram(gl) {
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, `
        attribute vec2 position;
        attribute vec2 uv;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 0, 1);
        }
      `);
      gl.compileShader(vertexShader);
  
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, `
        precision highp float;
        uniform sampler2D uTexture;
        uniform vec2 uMouse;
        uniform float uEffectStrength;
        uniform float uTime;
        uniform float uLiftHeight;
        uniform float uGridSize;
        varying vec2 vUv;
  
        // Noise function for organic mountain effect
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
  
        float smoothNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float a = noise(i);
          float b = noise(i + vec2(1.0, 0.0));
          float c = noise(i + vec2(0.0, 1.0));
          float d = noise(i + vec2(1.0, 1.0));
          
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
  
        // Create grid lines with deformation
        float createGrid(vec2 uv, float size) {
          vec2 grid = fract(uv * size);
          float lines = step(0.92, grid.x) + step(0.92, grid.y);
          return lines;
        }
  
        // Create dramatic bulge effect around cursor
        vec2 createBulgeEffect(vec2 uv, vec2 mouse, float strength) {
          vec2 delta = uv - mouse;
          float dist = length(delta);
          float radius = 0.7;
          
          vec2 deformation = vec2(0.0);
          
          if (dist < radius && strength > 0.0) {
            float effect = (1.0 - dist / radius) * strength;
            
            // Create lens-like bulge effect
            vec2 normal = normalize(delta);
            float bulgeStrength = effect * 0.2; // Stronger bulge
            
            // Non-linear bulge for more dramatic effect
            float bulge = pow(effect, 2.5) * bulgeStrength;
            deformation = normal * bulge;
            
            // Add ripple waves from center
            float ripples = sin(dist * 30.0 - uTime * 3.0) * 0.03 * effect;
            deformation += normal * ripples;
            
            // Add spiral distortion
            float angle = atan(delta.y, delta.x);
            float spiral = sin(angle * 4.0 + uTime * 2.0) * 0.02 * effect;
            deformation += vec2(spiral, spiral);
            
            // Add chromatic aberration effect
            float chroma = sin(uTime * 4.0 + dist * 25.0) * 0.01 * effect;
            deformation += vec2(chroma, -chroma);
          }
          
          return deformation;
        }
  
        // Create cursor energy field
        float cursorEnergyField(vec2 uv, vec2 mouse, float strength) {
          vec2 delta = uv - mouse;
          float dist = length(delta);
          float radius = 0.95;
          
          float energy = 1.0 - smoothstep(0.0, radius, dist);
          energy = pow(energy, 2.0);
          
          // Add pulsing effect
          float pulse = sin(uTime * 4.0) * 0.3 + 0.7;
          energy *= pulse;
          
          // Add energy waves
          float waves = sin(dist * 50.0 - uTime * 4.0) * 0.5;
          energy += waves * energy;
          
          return energy * strength;
        }
  
        // Simple distance function for cursor effects
        float getDistanceToCursor(vec2 uv, vec2 mouse) {
          return length(uv - mouse);
        }
  
        void main() {
          vec2 uv = vUv;
          vec2 mouse = uMouse;
          
          // Calculate dramatic bulge effect around cursor
          vec2 deformation = createBulgeEffect(uv, mouse, uEffectStrength);
          vec2 distortedUV = uv - deformation;
          
          // Sample texture with bulge distortion
          vec3 color = texture2D(uTexture, distortedUV).rgb;
          
          // Calculate distance to cursor
          float dist = getDistanceToCursor(uv, mouse);
          float radius = 0.95; // Increased radius for larger deformation area
          
          // Only apply deformation near cursor - no colors or effects
          if (dist < radius && uEffectStrength > 0.0) {
            // No additional effects - just the deformation from createBulgeEffect
          }
          
          gl_FragColor = vec4(color, 1.0);
        }
      `);
      gl.compileShader(fragmentShader);
  
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
  
      return program;
    }
  
    createGeometry(gl) {
      const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
      const uvs = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
      const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);
  
      const geometry = {
        vertices: gl.createBuffer(),
        uvs: gl.createBuffer(),
        indices: gl.createBuffer(),
      };
  
      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.vertices);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.uvs);
      gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indices);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  
      return geometry;
    }
  
    render(gl, program, texture, geometry, video) {
      const render = () => {
        this.time += 0.016;
  
        if (this.isHovering) {
          this.effectStrength += (1 - this.effectStrength) * 0.15;
          this.liftHeight += (1 - this.liftHeight) * 0.1;
        } else {
          this.effectStrength = 0;
          this.liftHeight = 0;
        }
  
        if (this.isHovering) {
          this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.15;
          this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.15;
        }
  
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        }
  
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
  
        const mouseLocation = gl.getUniformLocation(program, "uMouse");
        gl.uniform2f(mouseLocation, this.mouse.x, this.mouse.y);
  
        const strengthLocation = gl.getUniformLocation(program, "uEffectStrength");
        gl.uniform1f(strengthLocation, this.effectStrength);
  
        const timeLocation = gl.getUniformLocation(program, "uTime");
        gl.uniform1f(timeLocation, this.time);
  
        const liftHeightLocation = gl.getUniformLocation(program, "uLiftHeight");
        gl.uniform1f(liftHeightLocation, this.liftHeight);
  
        const gridSizeLocation = gl.getUniformLocation(program, "uGridSize");
        gl.uniform1f(gridSizeLocation, this.gridSize);
  
        const positionLocation = gl.getAttribLocation(program, "position");
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.vertices);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  
        const uvLocation = gl.getAttribLocation(program, "uv");
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.uvs);
        gl.enableVertexAttribArray(uvLocation);
        gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
  
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.indices);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  
        requestAnimationFrame(render);
      };
  
      render();
    }
  }
  
  