const STORAGE_PREFIX = 'aorta-story-editor';
const DB_NAME = 'aorta-story-editor-assets';
const DB_VERSION = 1;
const MODEL_STORE = 'models';
const WINDOW_STATE_PREFIX = 'aorta-editor-state:';

class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }
    on(event, callback) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push(callback);
    }
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => callback(data));
    }
}

function cloneConfig(config) {
    return JSON.parse(JSON.stringify(config));
}

function getStorageKey(version) {
    return `${STORAGE_PREFIX}:${version}`;
}

function readWindowNameState() {
    if (typeof window === 'undefined' || !window.name?.startsWith(WINDOW_STATE_PREFIX)) return {};
    try {
        return JSON.parse(window.name.slice(WINDOW_STATE_PREFIX.length)) || {};
    } catch (error) {
        console.warn('Editor window state could not be read.', error);
        return {};
    }
}

function writeWindowNameState(state) {
    if (typeof window !== 'undefined') {
        try {
            window.name = `${WINDOW_STATE_PREFIX}${JSON.stringify(state)}`;
        } catch (error) {
            console.warn('Editor window state could not be written.', error);
        }
    }
}

function setDeepValue(target, path, value) {
    let cursor = target;
    const keys = Array.isArray(path) ? path : path.split('.');
    keys.slice(0, -1).forEach((key) => {
        if (cursor[key] === undefined) cursor[key] = /^\d+$/.test(key) ? [] : {};
        cursor = cursor[key];
    });
    cursor[keys[keys.length - 1]] = value;
}

function openEditorDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(MODEL_STORE)) {
                db.createObjectStore(MODEL_STORE, { keyPath: 'key' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

import { chartPresets } from './storyRenderer.js';

export class EditorState extends EventEmitter {
    constructor(version, baseConfig) {
        super();
        this.version = version;
        this.baseConfig = baseConfig;
        this.memoryState = new Map();
        this.state = this.readState();
    }

    getStorageKey() {
        return getStorageKey(this.version);
    }

    readState() {
        const key = this.getStorageKey();
        try {
            if (typeof localStorage === 'undefined') {
                const windowState = readWindowNameState();
                return cloneConfig(this.memoryState.get(key) || windowState[key] || {});
            }
            return JSON.parse(localStorage.getItem(key)) || {};
        } catch (error) {
            console.warn('Editor state could not be read.', error);
            const windowState = readWindowNameState();
            return cloneConfig(this.memoryState.get(key) || windowState[key] || {});
        }
    }

    writeState(state) {
        const key = this.getStorageKey();
        this.state = cloneConfig(state);
        this.memoryState.set(key, this.state);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(this.state));
        } else {
            const windowState = readWindowNameState();
            windowState[key] = this.state;
            writeWindowNameState(windowState);
        }
        this.emit('change', this.state);
    }

    removeState() {
        const key = this.getStorageKey();
        this.memoryState.delete(key);
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(key);
        } else {
            const windowState = readWindowNameState();
            delete windowState[key];
            writeWindowNameState(windowState);
        }
        this.state = {};
        this.emit('change', this.state);
    }

    updatePath(path, value) {
        const nextState = cloneConfig(this.state);
        setDeepValue(nextState, path, value);
        this.writeState(nextState);
    }

    async writeUploadedModel(sectionIndex, file) {
        const db = await openEditorDb();
        const key = `${this.version}:${sectionIndex}`;

        return new Promise((resolve, reject) => {
            const tx = db.transaction(MODEL_STORE, 'readwrite');
            tx.objectStore(MODEL_STORE).put({
                key,
                version: this.version,
                sectionIndex,
                name: file.name,
                size: file.size,
                type: file.type || 'model/gltf-binary',
                updatedAt: new Date().toISOString(),
                file
            });
            tx.oncomplete = () => {
                db.close();
                this.emit('model-upload', { sectionIndex, file });
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error);
            };
        });
    }

    async deleteUploadedModel(sectionIndex) {
        const db = await openEditorDb();
        const key = `${this.version}:${sectionIndex}`;

        return new Promise((resolve, reject) => {
            const tx = db.transaction(MODEL_STORE, 'readwrite');
            tx.objectStore(MODEL_STORE).delete(key);
            tx.oncomplete = () => {
                db.close();
                this.emit('model-delete', { sectionIndex });
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error);
            };
        });
    }

    async getUploadedModelUrl(sectionIndex) {
        const db = await openEditorDb();
        const key = `${this.version}:${sectionIndex}`;

        return new Promise((resolve, reject) => {
            const tx = db.transaction(MODEL_STORE, 'readonly');
            const request = tx.objectStore(MODEL_STORE).get(key);
            request.onsuccess = () => {
                db.close();
                const entry = request.result;
                resolve(entry ? { ...entry, url: URL.createObjectURL(entry.file) } : null);
            };
            request.onerror = () => {
                db.close();
                reject(request.error);
            };
        });
    }

    async getUploadedModelEntries() {
        const db = await openEditorDb();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(MODEL_STORE, 'readonly');
            const request = tx.objectStore(MODEL_STORE).getAll();
            request.onsuccess = () => {
                db.close();
                resolve(request.result.filter((entry) => entry.version === this.version));
            };
            request.onerror = () => {
                db.close();
                reject(request.error);
            };
        });
    }

    async deleteUploadedModelsForVersion() {
        const entries = await this.getUploadedModelEntries();
        await Promise.all(entries.map((entry) => this.deleteUploadedModel(entry.sectionIndex)));
    }

    getEffectiveConfig() {
        const state = this.state;
        const config = cloneConfig(this.baseConfig);

        if (state.title) config.title = state.title;
        if (state.nav) {
            config.nav = config.nav.map((item, index) => ({ ...item, label: state.nav[index]?.label ?? item.label }));
        }

        const convertToUnifiedElements = (section, index) => {
            const elements = [];
            if (section.paragraphs) {
                section.paragraphs.forEach((p) => elements.push({ type: 'text', text: p }));
            }
            if (section.statIcon || section.statLabel || section.statText) {
                elements.push({
                    type: 'stat',
                    icon: section.statIcon,
                    label: section.statLabel,
                    text: section.statText
                });
            }
            const presetChart = chartPresets[this.version]?.[index];
            if (presetChart) {
                elements.push({
                    type: 'chart',
                    ...presetChart
                });
            }
            if (section.elements) {
                elements.push(...section.elements);
            }
            return elements;
        };

        const mergeSectionOverrides = (section, index, providedOverride) => {
            const override = providedOverride || {};
            const baseElements = convertToUnifiedElements(section, index);
            const merged = { ...section, ...override };

            if (override.elements) {
                merged.elements = override.elements;
            } else {
                merged.elements = baseElements;
                if (override.paragraphs) {
                    let pIdx = 0;
                    merged.elements = merged.elements.map(el => {
                        if (el.type === 'text' && override.paragraphs[pIdx] !== undefined) {
                            return { ...el, text: override.paragraphs[pIdx++] };
                        }
                        if (el.type === 'text') pIdx++;
                        return el;
                    });
                }
            }
            
            delete merged.paragraphs;
            delete merged.statIcon;
            delete merged.statLabel;
            delete merged.statText;
            delete merged.chart;
            
            return merged;
        };

        if (state.sections) {
            config.sections = config.sections.map((section, index) => ({
                ...mergeSectionOverrides(section, index, state.sections[index]),
                __sectionId: `base:${index}`,
                __baseIndex: index
            }));
        } else {
            config.sections = config.sections.map((section, index) => ({
                ...section,
                elements: convertToUnifiedElements(section, index),
                __sectionId: `base:${index}`,
                __baseIndex: index
            }));
        }
        if (state.extraSections?.length) {
            config.sections = [
                ...config.sections,
                ...state.extraSections.map((section, index) => ({
                    ...section,
                    __sectionId: `extra:${index}`,
                    __extraIndex: index
                }))
            ];
        }
        if (state.sectionOrder?.length) {
            const orderedIds = new Set(state.sectionOrder);
            const byId = new Map(config.sections.map((section) => [section.__sectionId, section]));
            config.sections = [
                ...state.sectionOrder.map((sectionId) => byId.get(sectionId)).filter(Boolean),
                ...config.sections.filter((section) => !orderedIds.has(section.__sectionId))
            ];
        }

        return config;
    }
}
