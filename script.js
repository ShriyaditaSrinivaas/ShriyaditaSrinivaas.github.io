import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- SYSTEM INITIALIZATION & LOADER ---
const loaderScreen = document.getElementById('loader');
const progressBar = document.getElementById('progress-bar');
const loadingText = document.getElementById('loading-text');
const uiLayer = document.getElementById('ui-layer');

let loadProgress = 0;
const fakeLoader = setInterval(() => {
    loadProgress += Math.random() * 10;
    if (loadProgress >= 100) {
        loadProgress = 100;
        clearInterval(fakeLoader);
        loadingText.innerText = "SYSTEM READY";
        progressBar.style.width = "100%";

        setTimeout(() => {
            loaderScreen.style.opacity = '0';
            setTimeout(() => {
                loaderScreen.style.display = 'none';
                // FIX: Remove hidden class AND set opacity so UI is visible
                uiLayer.classList.remove('hidden');
                uiLayer.style.opacity = '1';
                uiLayer.style.pointerEvents = 'auto';
            }, 1000);
        }, 500);
    } else {
        progressBar.style.width = loadProgress + "%";
        loadingText.innerText = `Loading 3D Assets... ${Math.floor(loadProgress)}%`;
    }
}, 100);

// --- THREE.JS SETUP ---
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.0015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false;
controls.enablePan = false;

// --- POST-PROCESSING ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.1;
bloomPass.strength = 1.2;
bloomPass.radius = 0.5;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- BUILD THE 3D WORLD ---

// 1. Ambient Particles
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 2000;
const posArray = new Float32Array(particlesCount * 3);
for (let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 1000;
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMaterial = new THREE.PointsMaterial({
    size: 1.5,
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
});
const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// Helper to create glowing nodes
function createNode(color, position, scale = 1) {
    const group = new THREE.Group();
    group.position.copy(position);

    const coreGeo = new THREE.IcosahedronGeometry(2 * scale, 1);
    const coreMat = new THREE.MeshBasicMaterial({ color: color });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const ringGeo = new THREE.TorusGeometry(4 * scale, 0.1, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2;
    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.y = Math.PI / 2;

    group.add(ring1);
    group.add(ring2);

    scene.add(group);
    return group;
}

// 2. Define Nodes — store BASE Y positions to fix the infinite drift bug
const nodes = {
    home: {
        obj: createNode(0x00f0ff, new THREE.Vector3(0, 0, 0), 2),
        baseY: 0,
        camPos: new THREE.Vector3(0, 5, 30),
        target: new THREE.Vector3(0, 0, 0)
    },
    about: {
        obj: createNode(0xb800ff, new THREE.Vector3(150, 50, -100)),
        baseY: 50,
        camPos: new THREE.Vector3(150, 55, -70),
        target: new THREE.Vector3(150, 50, -100)
    },
    projects: {
        obj: createNode(0xff0055, new THREE.Vector3(-150, -20, -150), 1.5),
        baseY: -20,
        camPos: new THREE.Vector3(-150, -15, -120),
        target: new THREE.Vector3(-150, -20, -150)
    },
    contact: {
        obj: createNode(0x00ff88, new THREE.Vector3(0, -100, -200)),
        baseY: -100,
        camPos: new THREE.Vector3(0, -95, -170),
        target: new THREE.Vector3(0, -100, -200)
    }
};

// Initial Camera Setup
camera.position.copy(nodes.home.camPos);
controls.target.copy(nodes.home.target);

// --- NAVIGATION ---
const navBtns = document.querySelectorAll('.nav-btn');
const actionBtns = document.querySelectorAll('.action-btn[data-target]');
const panels = document.querySelectorAll('.panel');

function flyToNode(targetNodeKey) {
    const node = nodes[targetNodeKey];
    if (!node) return;

    // Update nav active states
    navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === targetNodeKey);
    });

    // FIX: Toggle panels using only the 'active' class — no 'hidden' interference
    panels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${targetNodeKey}`);
    });

    // Fly camera
    gsap.to(camera.position, {
        x: node.camPos.x,
        y: node.camPos.y,
        z: node.camPos.z,
        duration: 2.5,
        ease: "power3.inOut"
    });

    gsap.to(controls.target, {
        x: node.target.x,
        y: node.target.y,
        z: node.target.z,
        duration: 2.5,
        ease: "power3.inOut"
    });
}

navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => flyToNode(e.target.dataset.target));
});

actionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (e.target.dataset.target) flyToNode(e.target.dataset.target);
    });
});

// --- RENDER LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    particlesMesh.rotation.y = elapsedTime * 0.02;

    // FIX: Use baseY so nodes float in place instead of drifting to infinity
    Object.values(nodes).forEach((node, index) => {
        node.obj.rotation.y = elapsedTime * 0.5;
        node.obj.rotation.x = elapsedTime * 0.3;
        node.obj.position.y = node.baseY + Math.sin(elapsedTime * 2 + index) * 0.8;
    });

    controls.update();
    composer.render();
}

animate();

// --- RESIZE HANDLER ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});