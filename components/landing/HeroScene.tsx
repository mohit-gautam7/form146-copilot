"use client";

// The product's story as one loop: three source documents float, converge into a Form 146
// certificate, and a CA seal stamps it. Paper textures are drawn on a 2D canvas, so no
// fonts or models are fetched at runtime.
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { PHASES, HERO_PERIOD as PERIOD } from "./phases";

const W = 1.5, H = 1.95; // sheet size in world units
const STILL = 0.72;      // reduced motion: the stamped moment, held

type Kind = "contract" | "invoice" | "treaty" | "certificate" | "ink";

function paper(kind: Kind) {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 1000;
  const g = c.getContext("2d")!;
  const ink = "#1b2430", muted = "#8a94a0", line = "#d6dbe1";
  if (kind === "ink") {
    g.clearRect(0, 0, 768, 1000);
    g.strokeStyle = "rgba(180,35,24,0.85)";
    g.lineWidth = 14;
    g.beginPath(); g.arc(384, 500, 190, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 5;
    g.beginPath(); g.arc(384, 500, 160, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "rgba(180,35,24,0.85)";
    g.font = "bold 46px Arial"; g.textAlign = "center";
    g.fillText("CERTIFIED", 384, 485);
    g.font = "30px Arial";
    g.fillText("CHARTERED ACCOUNTANT", 384, 535);
    return new THREE.CanvasTexture(c);
  }
  g.fillStyle = kind === "certificate" ? "#fffdf7" : "#ffffff";
  g.fillRect(0, 0, 768, 1000);
  const bars = (y0: number, n: number, gap = 34, w = [600, 640, 560, 620, 520]) => {
    g.fillStyle = line;
    for (let i = 0; i < n; i++) g.fillRect(84, y0 + i * gap, w[i % w.length] - 20, 12);
  };
  g.textAlign = "left";
  if (kind === "contract") {
    g.fillStyle = "#5a49c8"; g.fillRect(0, 0, 768, 18);
    g.fillStyle = ink; g.font = "bold 44px Georgia"; g.fillText("Statement of Work", 84, 120);
    g.fillStyle = muted; g.font = "26px Arial"; g.fillText("Northgate Data Ltd  /  Sahyadri Finance Ltd", 84, 168);
    bars(230, 6);
    g.fillStyle = "rgba(90,73,200,0.18)"; g.fillRect(78, 456, 560, 40);
    g.fillStyle = ink; g.font = "italic 28px Georgia"; g.fillText("engineers can operate the pipeline independently", 90, 486);
    bars(540, 7);
    g.strokeStyle = ink; g.lineWidth = 3; g.beginPath();
    g.moveTo(90, 900); g.bezierCurveTo(140, 840, 180, 950, 230, 880); g.bezierCurveTo(260, 850, 300, 920, 340, 890); g.stroke();
  } else if (kind === "invoice") {
    g.fillStyle = "#5a49c8"; g.fillRect(0, 0, 768, 18);
    g.fillStyle = ink; g.font = "bold 48px Arial"; g.fillText("INVOICE", 84, 120);
    g.fillStyle = muted; g.font = "26px Arial"; g.fillText("NG-2026-118   12 Aug 2026", 84, 166);
    g.strokeStyle = line; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(84, 250 + i * 70); g.lineTo(684, 250 + i * 70); g.stroke(); }
    g.fillStyle = ink; g.font = "28px Arial";
    g.fillText("Pipeline build and knowledge transfer", 90, 300);
    g.fillText("GBP 40,000", 90, 370);
    g.font = "bold 40px Arial"; g.fillText("INR 44,80,000", 84, 760);
    g.fillStyle = muted; g.font = "24px Arial"; g.fillText("Payable to a non-resident", 84, 800);
  } else if (kind === "treaty") {
    g.fillStyle = "#0d6e5f"; g.fillRect(0, 0, 768, 18);
    g.fillStyle = muted; g.font = "24px Georgia"; g.fillText("India - United Kingdom DTAA", 84, 100);
    g.fillStyle = ink; g.font = "bold 38px Georgia"; g.fillText("Article 13", 84, 156);
    g.font = "italic 28px Georgia"; g.fillText("Royalties and fees for technical services", 84, 200);
    bars(260, 5, 34, [600, 620, 580, 610, 400]);
    g.fillStyle = "rgba(13,110,95,0.16)"; g.fillRect(78, 446, 600, 84);
    g.fillStyle = ink; g.font = "28px Georgia";
    g.fillText("(c) make available technical knowledge,", 90, 478);
    g.fillText("experience, skill, know-how or processes", 90, 516);
    bars(580, 8, 34, [600, 620, 580, 610, 560]);
  } else {
    g.strokeStyle = "#b08d3c"; g.lineWidth = 10; g.strokeRect(34, 34, 700, 932);
    g.lineWidth = 2; g.strokeRect(54, 54, 660, 892);
    g.fillStyle = ink; g.textAlign = "center";
    g.font = "bold 64px Georgia"; g.fillText("Form 146", 384, 170);
    g.font = "italic 30px Georgia"; g.fillText("Certificate of an accountant", 384, 216);
    g.fillStyle = muted; g.font = "24px Arial"; g.fillText("Income-tax Act, 2025  /  section 393(2)", 384, 260);
    g.textAlign = "left"; g.font = "26px Arial";
    const rows: [string, string][] = [["Nature", "Fees for technical services"], ["DTAA", "India-UK, Art. 13(2)(a)(ii)"], ["Rate", "15%"], ["Tax", "Rs 6,72,000"]];
    rows.forEach(([k, v], i) => {
      g.fillStyle = muted; g.fillText(k, 100, 360 + i * 70);
      g.fillStyle = ink; g.fillText(v, 290, 360 + i * 70);
      g.fillStyle = line; g.fillRect(100, 378 + i * 70, 568, 2);
    });
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (t: number, a: number, b: number) => ease(clamp01((t - a) / (b - a)));

// Where each document floats, and where it tucks in behind the certificate.
const DOCS: { kind: Kind; spread: [number, number, number]; rot: [number, number, number]; tuck: [number, number, number] }[] = [
  { kind: "contract", spread: [-1.75, 0.35, 0], rot: [0.08, 0.45, 0.1], tuck: [-0.35, 0.18, -0.5] },
  { kind: "invoice", spread: [0.05, 0.75, -0.6], rot: [-0.05, -0.05, -0.06], tuck: [0.05, 0.28, -0.6] },
  { kind: "treaty", spread: [1.8, 0.25, 0.1], rot: [0.06, -0.5, -0.08], tuck: [0.4, 0.14, -0.45] },
];

function Sheet({ kind, index, reduced }: { kind: Kind; index: number; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const tex = useMemo(() => paper(kind), [kind]);
  const d = DOCS[index];
  useFrame(({ clock }) => {
    const g = ref.current!;
    const t = reduced ? STILL : (clock.elapsedTime / PERIOD) % 1;
    const k = seg(t, 0.3, 0.5) * (1 - seg(t, 0.9, 1)); // 0 = spread, 1 = tucked
    const bob = reduced ? 0 : Math.sin(clock.elapsedTime * 0.9 + index * 2) * 0.06 * (1 - k);
    g.position.set(
      THREE.MathUtils.lerp(d.spread[0], d.tuck[0], k),
      THREE.MathUtils.lerp(d.spread[1], d.tuck[1], k) + bob,
      THREE.MathUtils.lerp(d.spread[2], d.tuck[2], k),
    );
    g.rotation.set(d.rot[0] * (1 - k), d.rot[1] * (1 - k), d.rot[2] * (1 - k) + (index - 1) * 0.06 * k);
    const s = THREE.MathUtils.lerp(1, 0.86, k);
    g.scale.set(s, s, s);
  });
  return (
    <group ref={ref}>
      <mesh castShadow>
        <boxGeometry args={[W, H, 0.012]} />
        <meshStandardMaterial attach="material-0" color="#f4f4f2" />
        <meshStandardMaterial attach="material-1" color="#f4f4f2" />
        <meshStandardMaterial attach="material-2" color="#f4f4f2" />
        <meshStandardMaterial attach="material-3" color="#f4f4f2" />
        <meshStandardMaterial attach="material-4" map={tex} roughness={0.85} /> {/* box face 4 = front (+z) */}
        <meshStandardMaterial attach="material-5" color="#ececea" />
      </mesh>
    </group>
  );
}

function Certificate({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const seal = useRef<THREE.Group>(null);
  const inkMat = useRef<THREE.MeshBasicMaterial>(null);
  const tex = useMemo(() => paper("certificate"), []);
  const inkTex = useMemo(() => paper("ink"), []);
  useFrame(({ clock }) => {
    const t = reduced ? STILL : (clock.elapsedTime / PERIOD) % 1;
    const rise = seg(t, 0.38, 0.55) * (1 - seg(t, 0.9, 0.98));
    const g = group.current!;
    g.position.set(0, THREE.MathUtils.lerp(-1.4, 0.15, rise), THREE.MathUtils.lerp(-0.2, 0.25, rise));
    g.rotation.set(-0.08, 0, 0);
    g.scale.setScalar(THREE.MathUtils.lerp(0.6, 1.04, rise));
    g.visible = rise > 0.01;
    // Seal: drop 0.56-0.64, press, lift 0.74-0.84.
    const drop = seg(t, 0.56, 0.64);
    const lift = seg(t, 0.74, 0.84);
    const squash = t > 0.64 && t < 0.68 ? 1 - Math.sin(((t - 0.64) / 0.04) * Math.PI) * 0.12 : 1;
    const s = seal.current!;
    s.position.set(0.32, THREE.MathUtils.lerp(2.2, -0.42, drop) + lift * 2.4, 0.42);
    s.scale.set(1, squash, 1);
    s.visible = t > 0.54 && t < 0.86;
    inkMat.current!.opacity = seg(t, 0.64, 0.66) * (1 - seg(t, 0.9, 0.97));
  });
  return (
    <>
      <group ref={group}>
        <mesh castShadow>
          <boxGeometry args={[W * 1.12, H * 1.12, 0.016]} />
          <meshStandardMaterial attach="material-0" color="#efe9da" />
          <meshStandardMaterial attach="material-1" color="#efe9da" />
          <meshStandardMaterial attach="material-2" color="#efe9da" />
          <meshStandardMaterial attach="material-3" color="#efe9da" />
          <meshStandardMaterial attach="material-4" map={tex} roughness={0.8} />
          <meshStandardMaterial attach="material-5" color="#e8e2d2" />
        </mesh>
        <mesh position={[0.32, -0.56, 0.012]}>
          <planeGeometry args={[0.75, 0.98]} />
          <meshBasicMaterial ref={inkMat} map={inkTex} transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <group ref={seal}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.24, 0.12, 48]} />
          <meshStandardMaterial color="#9b1f15" roughness={0.45} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.1, 0.46, 32]} />
          <meshStandardMaterial color="#5a3a22" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.78, 0]} castShadow>
          <sphereGeometry args={[0.14, 32, 16]} />
          <meshStandardMaterial color="#6b4529" roughness={0.55} />
        </mesh>
      </group>
    </>
  );
}

function Rig({ children, reduced, onPhase }: { children: React.ReactNode; reduced: boolean; onPhase?: (i: number) => void }) {
  const ref = useRef<THREE.Group>(null);
  const last = useRef(-1);
  useFrame(({ pointer, clock }) => {
    const t = reduced ? STILL : (clock.elapsedTime / PERIOD) % 1;
    const i = t >= 0.9 ? 0 : PHASES.findLastIndex((p) => t >= p.at); // 0.9-1: papers fan back out, so step 1 again
    if (i !== last.current) { last.current = i; onPhase?.(i); }
    if (reduced) return;
    // Tilt toward the cursor, like turning a page in the light.
    ref.current!.rotation.y = THREE.MathUtils.lerp(ref.current!.rotation.y, pointer.x * 0.25, 0.05);
    ref.current!.rotation.x = THREE.MathUtils.lerp(ref.current!.rotation.x, -pointer.y * 0.12, 0.05);
  });
  return <group ref={ref}>{children}</group>;
}

export default function HeroScene({ reduced = false, onPhase }: { reduced?: boolean; onPhase?: (i: number) => void }) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.2, 6], fov: 40 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={1.05} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-4, 2, 2]} intensity={0.4} color="#c9d4ff" />
      <Rig reduced={reduced} onPhase={onPhase}>
        {DOCS.map((d, i) => <Sheet key={d.kind} kind={d.kind} index={i} reduced={reduced} />)}
        <Certificate reduced={reduced} />
      </Rig>
      <ContactShadows position={[0, -1.45, 0]} opacity={0.35} scale={9} blur={2.6} far={3} />
    </Canvas>
  );
}
