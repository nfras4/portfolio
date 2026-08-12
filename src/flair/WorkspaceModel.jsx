import { useEffect, useRef } from "react";
import * as THREE from "three";
import { cssVarToRGB, usePrefersReducedMotion, useThemeChange } from "./hooks.js";
import "./flair.css";

const FPS_INTERVAL = 1000 / 30;

function rgbToHexColor([r, g, b]) {
  return new THREE.Color(r, g, b);
}

/**
 * Wireframe workspace diagram (desk, dual monitors, headset, sensor volume)
 * ported from the spatial-configuration design. Transparent background,
 * palette-driven colors, 30fps, paused off-screen; static under
 * prefers-reduced-motion. Loaded lazily — this module pulls in three.js.
 */
export default function WorkspaceModel() {
  const hostRef = useRef(null);
  const themeRef = useRef(null);
  const reduced = usePrefersReducedMotion();

  useThemeChange(() => themeRef.current?.());

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const W = host.clientWidth || 300;
    const H = host.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(27, W / H, 0.1, 1000);
    camera.position.set(16, 12, 20);
    camera.lookAt(0, 1.8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearAlpha(0);
    host.appendChild(renderer.domElement);

    const lineMaterial = new THREE.LineBasicMaterial();
    const dashedMaterial = new THREE.LineDashedMaterial({
      dashSize: 0.2,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.5,
    });
    const solidMaterial = new THREE.MeshBasicMaterial({
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    const applyPalette = () => {
      lineMaterial.color = rgbToHexColor(cssVarToRGB("--text"));
      dashedMaterial.color = rgbToHexColor(cssVarToRGB("--faint"));
      solidMaterial.color = rgbToHexColor(cssVarToRGB("--bg"));
    };
    applyPalette();

    const disposables = [lineMaterial, dashedMaterial, solidMaterial];
    const track = (g) => (disposables.push(g), g);

    function wired(geometry, material = lineMaterial) {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(track(geometry), solidMaterial));
      group.add(new THREE.LineSegments(track(new THREE.EdgesGeometry(geometry)), material));
      return group;
    }

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Desk + legs
    const deskGroup = new THREE.Group();
    const deskTop = wired(new THREE.BoxGeometry(5, 0.15, 2.5));
    deskTop.position.y = 2.5;
    deskGroup.add(deskTop);
    [[-2.3, 1.25, -1.1], [2.3, 1.25, -1.1], [-2.3, 1.25, 1.1], [2.3, 1.25, 1.1]].forEach((pos) => {
      const leg = wired(new THREE.BoxGeometry(0.15, 2.5, 0.15));
      leg.position.set(...pos);
      deskGroup.add(leg);
    });

    // Dual monitors
    const monitorGeo = track(new THREE.PlaneGeometry(2.4, 1.4));
    const monitorEdges = track(new THREE.EdgesGeometry(monitorGeo));
    const mon1 = new THREE.LineSegments(monitorEdges, lineMaterial);
    mon1.position.set(-1.3, 4.0, -0.8);
    mon1.rotation.y = 0.4;
    deskGroup.add(mon1);
    const mon2 = new THREE.LineSegments(monitorEdges, lineMaterial);
    mon2.position.set(1.3, 4.0, -0.8);
    mon2.rotation.y = -0.4;
    deskGroup.add(mon2);

    // Headset
    const hmd = wired(new THREE.BoxGeometry(0.6, 0.4, 0.45));
    hmd.position.set(0, 3.2, 1.5);
    deskGroup.add(hmd);
    worldGroup.add(deskGroup);

    // Boundary blob (dashed)
    const points = [];
    const radius = 5.5;
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = radius + Math.sin(a * 4) * 0.4 + Math.cos(a * 7) * 0.2;
      points.push(new THREE.Vector3(Math.cos(a) * r, 0.05, Math.sin(a) * r));
    }
    const boundaryLine = new THREE.Line(
      track(new THREE.BufferGeometry().setFromPoints(points)),
      dashedMaterial
    );
    boundaryLine.computeLineDistances();
    worldGroup.add(boundaryLine);

    // Sensor volume (dashed box)
    const volumeBox = new THREE.LineSegments(
      track(new THREE.EdgesGeometry(track(new THREE.BoxGeometry(7, 5.5, 6)))),
      dashedMaterial
    );
    volumeBox.position.y = 2.75;
    volumeBox.computeLineDistances();
    worldGroup.add(volumeBox);

    // Corner sensors + drop lines
    [[-3.5, 5.5, -3], [3.5, 5.5, -3], [-3.5, 5.5, 3], [3.5, 5.5, 3]].forEach((pos) => {
      const sensor = wired(new THREE.BoxGeometry(0.15, 0.15, 0.15));
      sensor.position.set(...pos);
      worldGroup.add(sensor);
      const drop = new THREE.Line(
        track(new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(pos[0], pos[1], pos[2]),
          new THREE.Vector3(pos[0], 0, pos[2]),
        ])),
        dashedMaterial
      );
      drop.computeLineDistances();
      worldGroup.add(drop);
    });

    const render = (time) => {
      mon1.position.y = 4.0 + Math.sin(time * 0.8) * 0.03;
      mon2.position.y = 4.0 + Math.sin(time * 0.8 + 0.5) * 0.03;
      hmd.position.y = 3.2 + Math.sin(time * 1.2) * 0.05;
      worldGroup.rotation.y = Math.sin(time * 0.1) * 0.05;
      renderer.render(scene, camera);
    };

    themeRef.current = () => {
      applyPalette();
      render(0);
    };

    let raf = 0;
    let running = false;
    let visible = true;
    let lastFrame = 0;

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (now - lastFrame < FPS_INTERVAL) return;
      lastFrame = now;
      render(now * 0.001);
    };
    const start = () => {
      if (running || reduced || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      visible ? start() : stop();
    });
    io.observe(host);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    if (reduced) render(0);
    else start();

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      themeRef.current = null;
      disposables.forEach((d) => d.dispose?.());
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [reduced]);

  return <div ref={hostRef} className="workspace-model" aria-hidden="true" />;
}
