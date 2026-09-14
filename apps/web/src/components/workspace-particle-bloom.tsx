"use client";

import { useEffect, useRef } from "react";

const vertexShaderSource = `
  attribute vec4 a_particle;

  uniform float u_aspect;
  uniform float u_pixel_ratio;
  uniform float u_time;
  uniform vec2 u_pointer;

  varying float v_alpha;
  varying float v_reactive;
  varying float v_tint;

  void main() {
    float x = a_particle.x * 3.4;
    float depth = a_particle.y;
    float seed = a_particle.z;

    float distance = mix(0.55, 5.4, depth);
    float perspective = 1.0 / (0.72 + (distance * 0.42));
    float primaryWave = sin((x * 1.45) + (distance * 0.95) + (u_time * 0.34)) * 0.38;
    float secondaryWave = sin((x * 3.15) - (distance * 0.72) - (u_time * 0.22)) * 0.16;
    float ridgeWave = sin((x * 0.55) + (u_time * 0.11) + (distance * 0.16)) * 0.12;
    float pointerX = ((u_pointer.x * 2.0) - 1.0) * 3.4;
    float pointerDepth = 1.0 - u_pointer.y;
    float beam = exp(-pow((x - pointerX) * 0.72, 2.0));
    float beamPulse = 0.94 + (sin((u_time * 0.55) + (depth * 7.0) + (seed * 0.35)) * 0.06);
    float focus = exp(-pow((x - pointerX) * 0.9, 2.0) - pow((depth - pointerDepth) * 4.0, 2.0));
    float reactiveRipple = sin((distance * 4.0) + (u_time * 0.55)) * focus * 0.035;
    float waveHeight = primaryWave + secondaryWave + ridgeWave + reactiveRipple + (focus * 0.05);
    float edgeFade = 1.0 - smoothstep(2.7, 3.4, abs(x));
    float horizonGlow = smoothstep(0.82, 0.98, depth);

    float screenX = (x * (0.24 + (perspective * 0.48))) / max(u_aspect, 1.0);
    float screenY = 0.34 - ((1.0 - depth) * 1.05) + (waveHeight * perspective * 0.42);
    vec2 position = vec2(screenX, screenY);
    gl_Position = vec4(position, 0.0, 1.0);
    gl_PointSize = (1.7 + (perspective * 4.5) + (a_particle.w * 1.8) + (beam * 0.35) + (focus * 0.45)) * u_pixel_ratio;

    v_alpha = (0.24 + (a_particle.w * 0.54) + (horizonGlow * 0.25)) * edgeFade;
    v_alpha += (beam * 0.045 * beamPulse) + (focus * 0.12);
    v_reactive = clamp((beam * 0.18) + (focus * 0.24), 0.0, 1.0);
    v_tint = clamp((0.08 + (depth * 0.7) + (seed * 0.04)), 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;

  varying float v_alpha;
  varying float v_reactive;
  varying float v_tint;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float distanceFromCenter = length(centered);
    float halo = 1.0 - smoothstep(0.0, 0.5, distanceFromCenter);
    float core = 1.0 - smoothstep(0.0, 0.17, distanceFromCenter);

    vec3 electricBlue = vec3(0.36, 0.62, 1.0);
    vec3 ultraviolet = vec3(0.68, 0.46, 1.0);
    vec3 color = mix(electricBlue, ultraviolet, v_tint);
    color = mix(color, vec3(0.9, 0.84, 1.0), (core * 0.48) + (v_reactive * 0.22));
    float alpha = ((halo * 0.52) + (core * 0.48)) * v_alpha;

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

function createParticleData(columns: number, rows: number) {
  const particles = new Float32Array(columns * rows * 4);
  let randomState = 0x9e3779b9;
  const random = () => {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 4294967296;
  };

  for (let row = 0; row < rows; row += 1) {
    const depth = row / (rows - 1);
    for (let column = 0; column < columns; column += 1) {
      const index = (row * columns) + column;
      const x = column / (columns - 1);
      const jitter = (random() - 0.5) * 0.002;
      const brightness = 0.38 + (random() * 0.62);
      const offset = index * 4;
      particles[offset] = ((x * 2.0) - 1.0) + jitter;
      particles[offset + 1] = depth;
      particles[offset + 2] = random() * 6.28318;
      particles[offset + 3] = brightness;
    }
  }

  return particles;
}

export function WorkspaceParticleBloom() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
    });
    if (!gl) {
      canvas.dataset.renderer = "unavailable";
      return;
    }

    const program = createProgram(gl);
    const buffer = gl.createBuffer();
    if (!program || !buffer) {
      canvas.dataset.renderer = "initialization-failed";
      return;
    }

    const particleLocation = gl.getAttribLocation(program, "a_particle");
    const aspectLocation = gl.getUniformLocation(program, "u_aspect");
    const pixelRatioLocation = gl.getUniformLocation(program, "u_pixel_ratio");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const pointerLocation = gl.getUniformLocation(program, "u_pointer");
    const particleColumns = 140;
    const particleRows = 42;
    const maxParticleCount = particleColumns * particleRows;
    let animationFrame = 0;
    let startTime = performance.now();
    let contextLost = false;
    let pointerX = 0.5;
    let pointerY = 0.58;
    let pointerTargetX = pointerX;
    let pointerTargetY = pointerY;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, createParticleData(particleColumns, particleRows), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(particleLocation);
    gl.vertexAttribPointer(particleLocation, 4, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
    canvas.dataset.renderer = "webgl";

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(aspectLocation, width / height);
      gl.uniform1f(pixelRatioLocation, pixelRatio);
    };

    const draw = (now: number) => {
      if (contextLost) return;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeLocation, (now - startTime) / 1000);
      pointerX += (pointerTargetX - pointerX) * 0.035;
      pointerY += (pointerTargetY - pointerY) * 0.035;
      gl.uniform2f(pointerLocation, pointerX, pointerY);
      gl.drawArrays(gl.POINTS, 0, maxParticleCount);

      if (!reducedMotion.matches && !document.hidden) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    const restart = () => {
      window.cancelAnimationFrame(animationFrame);
      startTime = performance.now();
      animationFrame = window.requestAnimationFrame(draw);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) restart();
      else window.cancelAnimationFrame(animationFrame);
    };

    const handleMotionChange = () => restart();
    const handlePointerMove = (event: PointerEvent) => {
      const normalizedX = event.clientX / Math.max(window.innerWidth, 1);
      const normalizedY = event.clientY / Math.max(window.innerHeight, 1);
      pointerTargetX = 0.5 + ((normalizedX - 0.5) * 0.32);
      pointerTargetY = 0.56 + ((normalizedY - 0.56) * 0.28);
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      window.cancelAnimationFrame(animationFrame);
    };

    resize();
    restart();
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    reducedMotion.addEventListener("change", handleMotionChange);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    canvas.addEventListener("webglcontextlost", handleContextLost);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reducedMotion.removeEventListener("change", handleMotionChange);
      window.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} className="workspace-particle-bloom" aria-hidden="true" />;
}
