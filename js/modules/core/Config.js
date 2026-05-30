import * as THREE from 'three';

export const blickHoehe = 200; 
export const hoehe = 200;      
export const radiusNormal = 600; 
export const radiusZoom = 380;   

export const hotspots = [
    { pos: new THREE.Vector3(0, 200, 1000), target: new THREE.Vector3(0, 200, 0) }, // S1: Start (Stable)
    { pos: new THREE.Vector3(0, 200, 1000), target: new THREE.Vector3(0, 200, 0) }, // S1: End / S2: Start (Far)
    { pos: new THREE.Vector3(0, 200, 700),  target: new THREE.Vector3(0, 200, 0) }, // S2: End / S3: Start (Zoomed)
    { pos: new THREE.Vector3(0, 200, 400),  target: new THREE.Vector3(0, 200, 0) }, // S3: End / S4: Start (Detail)
    { pos: new THREE.Vector3(0, 200, 700),  target: new THREE.Vector3(0, 200, 0) }, // S4: End / S5: Start (Zoom Front)
    { pos: new THREE.Vector3(0, 200, 400),  target: new THREE.Vector3(0, 200, 0) }, // S5: End / S6: Start (Detail Front)
    { pos: new THREE.Vector3(0, hoehe, -radiusZoom), target: new THREE.Vector3(0, blickHoehe, 0) }, // S7
    { pos: new THREE.Vector3(radiusZoom, blickHoehe, radiusZoom), target: new THREE.Vector3(0, blickHoehe, 0) }, // S8
    { pos: new THREE.Vector3(-radiusZoom, blickHoehe, radiusZoom), target: new THREE.Vector3(0, blickHoehe, 0) }, // S9
    { pos: new THREE.Vector3(0, blickHoehe + 100, radiusZoom), target: new THREE.Vector3(0, blickHoehe, 0) }, // S10
    { pos: new THREE.Vector3(radiusZoom * 0.8, blickHoehe, radiusZoom * 0.8), target: new THREE.Vector3(0, blickHoehe, 0) }, // S11
    { pos: new THREE.Vector3(radiusNormal, blickHoehe, 0), target: new THREE.Vector3(0, blickHoehe, 0) }, // S12
    { pos: new THREE.Vector3(0, blickHoehe, radiusNormal), target: new THREE.Vector3(0, blickHoehe, 0) }, // S13
    { pos: new THREE.Vector3(0, blickHoehe, radiusZoom), target: new THREE.Vector3(0, blickHoehe, 0) }, // S14
    { pos: new THREE.Vector3(radiusZoom, blickHoehe, 0), target: new THREE.Vector3(0, blickHoehe, 0) }, // S15
    { pos: new THREE.Vector3(0, 400, 1000), target: new THREE.Vector3(0, 200, 0) }, // S16
    { pos: new THREE.Vector3(300, 300, 800), target: new THREE.Vector3(0, 200, 0) }, // S17
    { pos: new THREE.Vector3(0, 200, radiusNormal), target: new THREE.Vector3(0, 200, 0) }  // S18
];

export const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const settings = {
    count: isMobile ? 300 : 800,
    speedMultiplier: 0.5,
    glyphSize: 1.5,
    turbulence: 0.2,
    spawnSpread: 1.0,
    flowVariation: 0.4,
    dynamicScaling: true,
    moveMode: 'Spline',
    colorSlow: "#ff4444",
    colorFast: "#ff4444",
    colorMode: 'Solid',
    aortaOpacity: 0.26,
    aortaColor: "#ffffff",
    wireframe: false,
    ambientIntensity: 1.0,
    directIntensity: 2.5,
    fadeRange: 0.02,
    bgColor: "#000000"
};

export const editorModelOptions = [
    { id: 'healthy-aorta', label: 'Gesunde Aorta', url: 'assets/models/healthy_aorta_mesh.glb', color: 0xffffff, wall: true },
    { id: 'sick-aorta', label: 'Pathologische Aorta', url: 'assets/models/sick_aorta_mesh.glb', color: 0xff7777, wall: true },
    { id: 'rainer', label: 'Patient Rainer', url: 'assets/models/rainer.glb', color: 0xffb07a },
    { id: 'rainer-anatomy', label: 'Rainer Anatomie', url: 'assets/models/rainer_anatomy.glb', color: 0xff7777 },
    { id: 'aorta-hole', label: 'Aorta Defekt', url: 'assets/models/aorta_hole.glb', color: 0xff4f4f },
    { id: 'dna', label: 'DNA / Biologie', url: 'assets/models/dna.glb', color: 0x6ee7ff },
    { id: 'heart', label: 'Herz', url: 'assets/models/anatomy/VH_M_Heart.glb', color: 0xff7777 },
    { id: 'vasculature', label: 'Blutgefaesse', url: 'assets/models/anatomy/VH_M_Blood_Vasculature.glb', color: 0xff7777 },
    { id: 'kidney-left', label: 'Niere links', url: 'assets/models/anatomy/VH_M_Kidney_L.glb', color: 0x6ee7ff },
    { id: 'kidney-right', label: 'Niere rechts', url: 'assets/models/anatomy/VH_M_Kidney_R.glb', color: 0x6ee7ff },
    { id: 'liver', label: 'Leber', url: 'assets/models/anatomy/VH_M_Liver.glb', color: 0xffb07a },
    { id: 'lung', label: 'Lunge', url: 'assets/models/anatomy/3d-vh-f-lung.glb', color: 0x6ee7ff },
    { id: 'skin', label: 'Koerperhuelle', url: 'assets/models/anatomy/3d-vh-m-skin.glb', color: 0xffffff }
];

export const sectionVisualLabels = [
    'Gesunde Aorta mit Blutfluss',
    'Patientenmodell',
    'Anatomische Uebersicht',
    'Gesunde Anatomie',
    'Pathologische Veraenderung',
    'Biologische Ursache',
    'Risikoprofil und Aorta',
    'Symptome und Warnzeichen',
    'Diagnostische Ansicht',
    'Bildgebung und Planung',
    'Dynamischer Blutfluss',
    'Krankheitsstadium',
    'Therapieplanung',
    'Intervention',
    'Risiko-Nutzen-Abwaegung',
    'Stabilisierte Aorta',
    'Nachsorge und Kontrolle',
    'Zusammenfassung'
];
