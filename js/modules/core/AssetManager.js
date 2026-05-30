import * as THREE from 'three';
import { Loader } from './Loader.js';

export class AssetManager {
    constructor(settings) {
        this.loader = new Loader();
        this.settings = settings;
        this.cache = new Map();
    }

    async loadModel(url) {
        if (this.cache.has(url)) return this.cache.get(url);
        const gltf = await this.loader.loadModel(url);
        if (gltf) this.cache.set(url, gltf);
        return gltf;
    }

    async createEditorModelGroup(option) {
        const gltf = await this.loadModel(option.url);
        if (!gltf) return null;

        const group = new THREE.Group();
        const model = option.wall ? this.loader.processWall(gltf.scene, this.settings) : gltf.scene;
        group.add(model.clone()); // Clone to allow multiple instances
        group.visible = false;
        group.userData.editorModelId = option.id;
        
        return group;
    }

    async createEditorModelGroupFromUrl(url, label = 'uploaded-glb') {
        const gltf = await this.loadModel(url);
        if (!gltf) return null;

        const group = new THREE.Group();
        group.add(gltf.scene.clone());
        group.visible = false;
        group.userData.editorModelId = 'uploaded';
        group.userData.editorModelLabel = label;
        
        return group;
    }
}
