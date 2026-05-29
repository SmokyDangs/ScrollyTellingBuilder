# 🫀 Aorta Scrollytelling Project

[![Project Status: Active](https://img.shields.io/badge/Project%20Status-Active-green.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#)
[![Tech: Vanilla JS](https://img.shields.io/badge/Tech-Vanilla%20JS%20%28ES6%29-yellow.svg)](#)
[![3D Engine: Three.js](https://img.shields.io/badge/3D%20Engine-Three.js-black.svg)](#)

Dieses Projekt ist eine interaktive, webbasierte Aufklärungsanwendung. Sie bringt Nutzenden die Anatomie, Pathologie und Behandlung der Aorta (Hauptschlagader) mittels modernem Scrollytelling und immersiven 3D-Visualisierungen näher.

---

## 🛠️ Tech-Stack & Performance

| Komponente | Technologie | Einsatzzweck | Status |
| :--- | :--- | :--- | :--- |
| **Frontend** | HTML5 / CSS3 / ES6 Modules | Semantische Struktur, modulares & build-freies JavaScript | `Bereit` |
| **3D-Engine** | [Three.js](https://threejs.org/) | Browserbasierte, performante 3D-Darstellung & WebGL | `Aktiv` |
| **Assets** | `.glb` (glTF Binary) | Optimierte, komprimierte 3D-Modelle für schnelle Ladezeiten | `Optimiert` |
| **Architektur** | Modular (No-Build) | Strikte Trennung von UI, Rendering und Datenverarbeitung | `Skalierbar` |

---

## ✨ Hauptfunktionen

* **🔄 Dynamisches Scrollytelling:** Der narrative Inhalt passt sich nahtlos und flüssig dem Scroll-Fortschritt des Nutzers an.
* **📦 Interaktive 3D-Visualisierung:** Komplexe, medizinische 3D-Modelle werden ressourcenschonend geladen und direkt im Browser gerendert.
* **🎯 Zustandsbasierte Darstellung:** Intelligentes Ein- und Ausblenden spezifischer 3D-Gruppen basierend auf dem aktiven Lese-Abschnitt.
* **📱 Responsive Layout:** Dedizierte Layout-Anpassungen (inkl. speziellem Mobile-Targeting) garantieren eine saubere Darstellung auf allen Bildschirmgrößen.

---

## 📂 Projektstruktur

```text
├── assets/
│   └── models/          # Medizinische 3D-Modelle (.glb)
├── css/                 # Modulare Stylesheets
│   ├── base.css         # Grund- & Reset-Styles
│   ├── sections.css     # Kapitel-Layouts
│   ├── scrollytelling.css # Scroll-Animationen & Trigger
│   └── icons.css        # UI-Icons
├── js/
│   └── modules/         # JavaScript-Module (ES6)
│       ├── scrollytelling.js # Zentrale App-Steuerung & Scroll-Events
│       ├── core/
│       │   └── Loader.js # Vorverarbeitung & Laden der 3D-Modelle
│       ├── effects/     # Flow- & Pathline-Visualisierungen
│       └── ui/          # Interaktionssteuerung & Chart-Verwaltung
└── vendor/
    └── three/           # Lokale Three.js Bibliothek & Add-ons
