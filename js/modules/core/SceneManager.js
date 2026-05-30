import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
    constructor(container, settings) {
        this.container = container;
        this.settings = settings;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.autoClear = false;
        this.renderer.setScissorTest(true);
        this.renderer.setClearColor(settings.bgColor);
        container.appendChild(this.renderer.domElement);

        this.scene1 = new THREE.Scene();
        this.scene2 = new THREE.Scene();
        this.scene1.background = new THREE.Color(0x020203);
        this.scene2.background = new THREE.Color(0x020203);
        this.scene1.fog = new THREE.FogExp2(0x050507, 0.00085);
        this.scene2.fog = new THREE.FogExp2(0x050507, 0.00085);

        this.camera1 = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 10000);
        this.camera2 = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 10000);
        this.controls = new OrbitControls(this.camera1, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.enableZoom = false; 
        this.controls.enablePan = false;

        this.setupLights();
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, this.settings.ambientIntensity);
        const direct = new THREE.DirectionalLight(0xffffff, this.settings.directIntensity);
        direct.position.set(2, 2, 5);
        const fillLight = new THREE.DirectionalLight(0xff7777, 0.9);
        fillLight.position.set(-4, 1, -3);
        const rimLight = new THREE.DirectionalLight(0x66dfff, 1.25);
        rimLight.position.set(4, 5, -6);
        this.scene1.add(ambient, direct, fillLight, rimLight);
    }

    render(currentSection, width, height) {
        if (window.innerWidth <= 820) {
            const topH = Math.floor(height * 0.5), botH = height - topH;
            this.camera1.aspect = width / topH; this.camera1.updateProjectionMatrix();
            this.renderer.setViewport(0, botH, width, topH); this.renderer.setScissor(0, botH, width, topH);
            this.renderer.render(this.scene1, this.camera1);
            this.camera2.position.copy(this.camera1.position); this.camera2.quaternion.copy(this.camera1.quaternion);
            this.camera2.aspect = width / botH; this.camera2.updateProjectionMatrix();
            this.renderer.setViewport(0, 0, width, botH); this.renderer.setScissor(0, 0, width, botH);
            this.renderer.render(this.scene2, this.camera2);
            return;
        }

        this.camera1.aspect = width / height; this.camera1.updateProjectionMatrix();
        this.renderer.setViewport(0, 0, width, height); this.renderer.setScissor(0, 0, width, height);
        this.renderer.render(this.scene1, this.camera1);
    }

    resize(width, height) {
        this.renderer.setSize(width, height);
        this.camera1.aspect = width / height;
        this.camera1.updateProjectionMatrix();
        this.camera2.aspect = width / height;
        this.camera2.updateProjectionMatrix();
    }
}
