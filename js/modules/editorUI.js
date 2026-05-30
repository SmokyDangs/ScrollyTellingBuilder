function stripTags(value = '') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = value;
    return wrapper.textContent || wrapper.innerText || '';
}

function cloneConfig(config) {
    return JSON.parse(JSON.stringify(config));
}

import { iconLibrary } from './storyRenderer.js';

export function initEditorUI({
    version,
    storyConfig: initialStoryConfig,
    editorState,
    modelOptions,
    getCurrentSection,
    setSectionModel,
    setSectionModelFile,
    resetSectionModel,
    exportState
}) {
    let active = false;
    let statusTimer = null;
    let currentDragData = null;
    let storyConfig = initialStoryConfig;
    let state = editorState.state;

    const shell = document.createElement('aside');
    shell.className = 'editor-panel';
    shell.innerHTML = `
        <div class="editor-panel-head">
            <div>
                <strong>Editor</strong>
                <span id="editor-story-title">${storyConfig.title}</span>
            </div>
            <span class="editor-save-state" id="editor-save-state">Bereit</span>
        </div>
        
        <div class="editor-tabs">
            <button type="button" class="editor-tab-btn is-active" data-tab="current">Inhalt</button>
            <button type="button" class="editor-tab-btn" data-tab="structure">Sektionen</button>
            <button type="button" class="editor-tab-btn" data-tab="navigation">Kapitel</button>
        </div>

        <div class="editor-tab-content is-active" data-tab-id="current">
            <div class="editor-current" id="editor-current"></div>
            <div class="editor-row">
                <label for="editor-section">Sektion auswählen</label>
                <select id="editor-section"></select>
            </div>
            <div class="editor-row">
                <label for="editor-model">3D-Modell</label>
                <select id="editor-model"></select>
            </div>
            
            <div class="editor-builder">
                <div class="editor-builder-head">
                    <strong>Elemente</strong>
                </div>
                <div class="editor-palette" aria-label="Elemente hinzufuegen">
                    <div role="button" tabindex="0" draggable="true" data-editor-action="add-heading" data-editor-drag-type="heading" title="Ueberschrift">H</div>
                    <div role="button" tabindex="0" draggable="true" data-editor-action="add-text" data-editor-drag-type="text" title="Text">P</div>
                    <div role="button" tabindex="0" draggable="true" data-editor-action="add-quote" data-editor-drag-type="quote" title="Zitat">"</div>
                    <div role="button" tabindex="0" draggable="true" data-editor-action="add-image" data-editor-drag-type="image" title="Bild">Img</div>
                    <div role="button" tabindex="0" draggable="true" data-editor-action="add-video" data-editor-drag-type="video" title="Video">Vid</div>
                    <div role="button" tabindex="0" draggable="true" data-editor-action="add-stat" data-editor-drag-type="stat" title="Statistik">Stat</div>
                    <div role="button" tabindex="0" draggable="true" data-editor-action="add-meter" data-editor-drag-type="meter" title="Meter">Meter</div>
                    <div role="button" tabindex="0" draggable="true" data-editor-action="add-bars" data-editor-drag-type="bars" title="Balken">Bars</div>
                    <div role="button" tabindex="0" draggable="true" data-editor-action="add-split" data-editor-drag-type="split" title="Split">Split</div>
                </div>
                <div class="editor-elements" id="editor-elements"></div>
            </div>

            <div class="editor-upload" id="editor-upload" tabindex="0" role="button">
                <input id="editor-model-file" type="file" accept=".glb,model/gltf-binary">
                <span>GLB-Datei ablegen</span>
                <small>ersetzt das Modell der gewaehlten Sektion</small>
            </div>
            <p class="editor-file-status" id="editor-file-status"></p>
            
            <div class="editor-actions">
                <button type="button" data-editor-action="reset-model">Modell reset</button>
            </div>
        </div>

        <div class="editor-tab-content" data-tab-id="structure">
            <div class="editor-section-builder">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <strong>Sektionen verwalten</strong>
                    <button type="button" data-editor-action="add-section" style="padding: 4px 10px; font-size: 0.75rem;">+ Sektion</button>
                </div>
                <div class="editor-sections" id="editor-sections"></div>
            </div>
        </div>

        <div class="editor-tab-content" data-tab-id="navigation">
            <div class="editor-section-builder">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <strong>Kapitel (Navbar)</strong>
                    <button type="button" data-editor-action="add-nav-item" style="padding: 4px 10px; font-size: 0.75rem;">+ Kapitel</button>
                </div>
                <div class="editor-nav" id="editor-nav"></div>
            </div>
        </div>

        <div class="editor-properties" id="editor-properties">
            <div class="editor-properties-head">
                <strong>Eigenschaften</strong>
                <button type="button" data-editor-action="close-properties">&times;</button>
            </div>
            <div id="editor-property-form"></div>
        </div>

        <div class="editor-panel-footer">
            <div class="editor-actions" style="margin-top: 0;">
                <button type="button" data-editor-action="save-local" style="background: var(--accent-red); color: #fff;">Speichern</button>
                <button type="button" data-editor-action="export">Export JSON</button>
                <button type="button" data-editor-action="reset-all">Reset All</button>
            </div>
            <textarea id="editor-export" readonly aria-label="Editor Export"></textarea>
        </div>
    `;
    document.body.appendChild(shell);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'editor-toggle';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.textContent = 'Editor';
    document.body.appendChild(toggle);

    const quickToolbar = document.createElement('div');
    quickToolbar.className = 'editor-quick-toolbar';
    quickToolbar.innerHTML = `
        <button type="button" data-quick-action="edit" title="Bearbeiten">✎</button>
        <button type="button" data-quick-action="duplicate" title="Duplizieren">❐</button>
        <button type="button" data-quick-action="move-up" title="Nach oben">↑</button>
        <button type="button" data-quick-action="move-down" title="Nach unten">↓</button>
        <button type="button" data-quick-action="delete" title="Löschen">×</button>
    `;
    document.body.appendChild(quickToolbar);

    const sectionSelect = shell.querySelector('#editor-section');
    const modelSelect = shell.querySelector('#editor-model');
    const currentInfo = shell.querySelector('#editor-current');
    const saveState = shell.querySelector('#editor-save-state');
    const uploadZone = shell.querySelector('#editor-upload');
    const fileInput = shell.querySelector('#editor-model-file');
    const fileStatus = shell.querySelector('#editor-file-status');
    const exportBox = shell.querySelector('#editor-export');
    const elementList = shell.querySelector('#editor-elements');
    const sectionList = shell.querySelector('#editor-sections');
    const storyTitleDisplay = shell.querySelector('#editor-story-title');

    // Tab switching logic
    shell.querySelectorAll('.editor-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            shell.querySelectorAll('.editor-tab-btn').forEach(b => b.classList.remove('is-active'));
            shell.querySelectorAll('.editor-tab-content').forEach(c => c.classList.remove('is-active'));
            btn.classList.add('is-active');
            shell.querySelector(`[data-tab-id="${tabId}"]`).classList.add('is-active');
        });
    });

    function populateSectionSelect() {
        sectionSelect.innerHTML = '';
        storyConfig.sections.forEach((section, index) => {
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = stripTags(section.title);
            sectionSelect.appendChild(option);
        });
    }

    function populateModelSelect() {
        modelSelect.innerHTML = '';
        [{ id: '', label: 'Standardmodell' }, ...modelOptions].forEach((model) => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.label;
            modelSelect.appendChild(option);
        });
        const uploadedOption = document.createElement('option');
        uploadedOption.value = '__uploaded';
        uploadedOption.textContent = 'Hochgeladene GLB';
        modelSelect.appendChild(uploadedOption);
    }

    populateSectionSelect();
    populateModelSelect();

    function setStatus(message, tone = 'neutral') {
        saveState.textContent = message;
        saveState.dataset.tone = tone;
        if (statusTimer) clearTimeout(statusTimer);
        if (tone !== 'neutral') {
            statusTimer = setTimeout(() => {
                saveState.textContent = 'Bereit';
                saveState.dataset.tone = 'neutral';
            }, 2200);
        }
    }

    function syncPanel() {
        const sectionIndex = getCurrentSection();
        updatePanelForSection(sectionIndex);
        renderNavList();
    }

    function updatePanelForSection(sectionIndex) {
        const section = storyConfig.sections[sectionIndex];
        const title = stripTags(section?.title) || `Sektion ${sectionIndex + 1}`;
        sectionSelect.value = String(sectionIndex);
        modelSelect.value = state.uploadedModels?.[sectionIndex] ? '__uploaded' : state.models?.[sectionIndex] || '';
        currentInfo.innerHTML = `
            <span>Aktive Sektion</span>
            <strong>${sectionIndex + 1}. ${title.replace(/^\d+\.\s*/, '')}</strong>
        `;
        fileStatus.textContent = state.uploadedModels?.[sectionIndex]?.name
            ? `Aktiv: ${state.uploadedModels[sectionIndex].name}`
            : '';
        renderElementList(sectionIndex);
        renderSectionList(sectionIndex);
    }

    function getSectionId(sectionIndex) {
        return storyConfig.sections[sectionIndex]?.__sectionId || `base:${sectionIndex}`;
    }

    function getSectionOrder() {
        return storyConfig.sections.map((section, index) => section.__sectionId || `base:${index}`);
    }

    function getMutableSectionById(nextState, sectionId) {
        const [kind, rawIndex] = sectionId.split(':');
        const sourceIndex = Number(rawIndex);

        if (kind === 'extra') {
            if (!nextState.extraSections) nextState.extraSections = [];
            if (!nextState.extraSections[sourceIndex]) {
                const renderedSection = storyConfig.sections.find((section) => section.__sectionId === sectionId);
                nextState.extraSections[sourceIndex] = cloneConfig(renderedSection || {
                    title: 'Neue Sektion',
                    paragraphs: []
                });
            }
            return nextState.extraSections[sourceIndex];
        }

        if (!nextState.sections) nextState.sections = [];
        if (!nextState.sections[sourceIndex]) nextState.sections[sourceIndex] = {};
        return nextState.sections[sourceIndex];
    }

    function getMutableSection(nextState, sectionIndex) {
        return getMutableSectionById(nextState, getSectionId(sectionIndex));
    }

    function getCurrentElements(nextState, sectionIndex) {
        const mutableSection = getMutableSection(nextState, sectionIndex);
        const renderedSection = storyConfig.sections[sectionIndex] || {};
        return [...(mutableSection.elements || renderedSection.elements || [])];
    }

    function getElementLabel(element) {
        if (!element) return 'Element';
        if (element.type === 'heading') return `H: ${stripTags(element.text).slice(0, 28) || 'Neu'}`;
        if (element.type === 'text') return `P: ${stripTags(element.text).slice(0, 28) || 'Neu'}`;
        if (element.type === 'quote') return `Q: ${stripTags(element.text).slice(0, 28) || 'Zitat'}`;
        if (element.type === 'image') return `I: ${element.caption || 'Bild'}`;
        if (element.type === 'video') return `V: ${element.caption || 'Video'}`;
        if (element.type === 'stat') return `S: ${stripTags(element.label).slice(0, 24) || 'Info'}`;
        if (element.type === 'chart') return `C: ${stripTags(element.label).slice(0, 24) || element.chartType || 'Chart'}`;
        if (element.type === 'iconGrid') return 'Icon Grid';
        if (element.type === 'iconImages') return 'Bilder Liste';
        return element.type;
    }

    function renderElementList(sectionIndex) {
        const section = storyConfig.sections[sectionIndex];
        const elements = section?.elements || [];
        if (!elementList) return;

        if (!elements.length) {
            elementList.innerHTML = '<p>Keine Elemente in dieser Sektion.</p>';
            return;
        }

        elementList.innerHTML = elements.map((element, index) => `
            <div class="editor-element-item" draggable="true" data-element-index="${index}">
                <span class="editor-drag-handle" aria-hidden="true">::</span>
                <span>${index + 1}. ${getElementLabel(element)}</span>
                <div class="editor-element-actions" style="display: flex; gap: 4px;">
                    <button type="button" data-editor-action="edit-properties" data-element-index="${index}" style="min-width: 42px;">Edit</button>
                    <button type="button" data-editor-action="delete-element" data-element-index="${index}" style="min-width: 42px;">Del</button>
                </div>
            </div>
        `).join('');
    }

    function openProperties(elementIndex, sectionIndex = null) {
        if (sectionIndex === null) sectionIndex = Number(sectionSelect.value);
        const section = storyConfig.sections[sectionIndex];
        const element = section.elements?.[elementIndex];
        if (!element) return;

        shell.classList.add('has-properties');
        renderPropertyForm(element, elementIndex, sectionIndex);
    }

    function closeProperties() {
        shell.classList.remove('has-properties');
    }

    function renderPropertyForm(element, elementIndex, sectionIndex) {
        const form = shell.querySelector('#editor-property-form');
        const basePath = Number.isInteger(storyConfig.sections[sectionIndex].__extraIndex)
            ? `extraSections.${storyConfig.sections[sectionIndex].__extraIndex}.elements.${elementIndex}`
            : `sections.${storyConfig.sections[sectionIndex].__baseIndex ?? sectionIndex}.elements.${elementIndex}`;

        let html = `<p style="margin: 0 0 10px; font-size: 0.8rem; color: #aaa;">Typ: <strong>${element.type}</strong></p>`;

        if (element.type === 'text' || element.type === 'heading' || element.type === 'quote') {
            html += `
                <div class="editor-row">
                    <label>Inhalt</label>
                    <textarea data-prop-path="${basePath}.text" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px; min-height: 80px;">${element.text || ''}</textarea>
                </div>
            `;
            if (element.type === 'quote') {
                html += `
                    <div class="editor-row">
                        <label>Quelle / Autor</label>
                        <input type="text" data-prop-path="${basePath}.author" value="${element.author || ''}" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                    </div>
                `;
            }
        } else if (element.type === 'image') {
            html += `
                <div class="editor-row">
                    <label>Bild URL</label>
                    <input type="text" data-prop-path="${basePath}.src" value="${element.src || ''}" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                </div>
                <div class="editor-row">
                    <label>Alt-Text</label>
                    <input type="text" data-prop-path="${basePath}.alt" value="${element.alt || ''}" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                </div>
                <div class="editor-row">
                    <label>Bildunterschrift</label>
                    <input type="text" data-prop-path="${basePath}.caption" value="${element.caption || ''}" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                </div>
            `;
        } else if (element.type === 'video') {
            html += `
                <div class="editor-row">
                    <label>Video URL (Embed)</label>
                    <input type="text" data-prop-path="${basePath}.url" value="${element.url || ''}" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                </div>
                <div class="editor-row">
                    <label>Unterschrift</label>
                    <input type="text" data-prop-path="${basePath}.caption" value="${element.caption || ''}" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                </div>
            `;
        } else if (element.type === 'stat') {
            html += `
                <div class="editor-row">
                    <label>Icon waehlen</label>
                    <div class="editor-icon-picker">
                        ${Object.keys(iconLibrary).map(iconName => `
                            <button type="button" class="icon-picker-btn${element.icon === iconName ? ' is-active' : ''}" 
                                    data-prop-path="${basePath}.icon" data-value="${iconName}" title="${iconName}">
                                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2;">
                                    ${iconLibrary[iconName]}
                                </svg>
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="editor-row">
                    <label>Label</label>
                    <input type="text" data-prop-path="${basePath}.label" value="${element.label || ''}" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                </div>
                <div class="editor-row">
                    <label>Text</label>
                    <textarea data-prop-path="${basePath}.text" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px; min-height: 60px;">${element.text || ''}</textarea>
                </div>
            `;
        } else if (element.type === 'chart') {
            html += `
                <div class="editor-row">
                    <label>Label</label>
                    <input type="text" data-prop-path="${basePath}.label" value="${element.label || ''}" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                </div>
                <div class="property-group">
                    <strong style="font-size: 0.75rem; color: #888; display: block; margin-bottom: 8px;">Gestaltung</strong>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" data-prop-path="${basePath}.rounded" id="rounded-${elementIndex}" ${element.rounded ? 'checked' : ''}>
                        <label for="rounded-${elementIndex}" style="margin: 0; text-transform: none; font-weight: normal;">Abgerundete Ecken</label>
                    </div>
                </div>
            `;
            if (element.chartType === 'meter') {
                html += `
                    <div class="editor-row">
                        <label>Wert (%)</label>
                        <input type="number" data-prop-path="${basePath}.value" value="${element.value || 0}" min="0" max="100" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                    </div>
                    <div class="editor-row">
                        <label>Farbe</label>
                        <input type="color" data-prop-path="${basePath}.color" value="${element.color || '#ff4444'}" style="width: 100%; height: 32px; background: none; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; padding: 2px;">
                    </div>
                    <div class="editor-row">
                        <label>Unterschrift</label>
                        <input type="text" data-prop-path="${basePath}.caption" value="${element.caption || ''}" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                    </div>
                `;
            } else if (element.chartType === 'bars' || element.chartType === 'split' || element.chartType === 'flow') {
                html += `
                    <div style="margin-top: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong style="font-size: 0.75rem; color: #888;">Datenpunkte</strong>
                            <button type="button" class="add-chart-item" data-path="${basePath}.items" style="padding: 2px 8px; font-size: 0.7rem;">+ Hinzufuegen</button>
                        </div>
                `;
                (element.items || []).forEach((item, idx) => {
                    html += `
                        <div style="margin-top: 10px; padding: 10px; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; background: rgba(255,255,255,0.05); position: relative;">
                            <button type="button" class="delete-chart-item" data-path="${basePath}.items" data-index="${idx}" style="position: absolute; top: 4px; right: 4px; background: none; border: 0; color: #ff4444; cursor: pointer;">&times;</button>
                            <div class="editor-row">
                                <label>Label</label>
                                <input type="text" data-prop-path="${basePath}.items.${idx}.label" value="${item.label || ''}" style="width: 100%; padding: 6px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                            </div>
                            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px;">
                                <div class="editor-row">
                                    <label>Wert</label>
                                    <input type="number" data-prop-path="${basePath}.items.${idx}.value" value="${item.value || 0}" style="width: 100%; padding: 6px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                                </div>
                                <div class="editor-row">
                                    <label>Farbe</label>
                                    <input type="color" data-prop-path="${basePath}.items.${idx}.color" value="${item.color || '#ff4444'}" style="width: 100%; height: 28px; background: none; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; padding: 1px;">
                                </div>
                            </div>
                        </div>
                    `;
                });
                html += `</div>`;
            }
        }

        form.innerHTML = html;
        form.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('change', () => {
                const path = input.dataset.propPath;
                let value;
                if (input.type === 'number') value = Number(input.value);
                else if (input.type === 'checkbox') value = input.checked;
                else value = input.value;
                editorState.updatePath(path, value);
            });
        });

        form.querySelector('.add-chart-item')?.addEventListener('click', (e) => {
            const path = e.target.dataset.path;
            const currentItems = editorState.getValue(path) || [];
            editorState.updatePath(path, [...currentItems, { label: 'Neu', value: 50, color: '#ff4444' }]);
            renderPropertyForm(element, elementIndex, sectionIndex); // Refresh form
        });

        form.querySelectorAll('.delete-chart-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const path = btn.dataset.path;
                const index = parseInt(btn.dataset.index, 10);
                const currentItems = editorState.getValue(path) || [];
                editorState.updatePath(path, currentItems.filter((_, i) => i !== index));
                renderPropertyForm(element, elementIndex, sectionIndex); // Refresh form
            });
        });

        form.querySelectorAll('.icon-picker-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const path = btn.dataset.propPath;
                const value = btn.dataset.value;
                editorState.updatePath(path, value);
                
                // Update active state visually immediately
                form.querySelectorAll('.icon-picker-btn').forEach(b => b.classList.remove('is-active'));
                btn.classList.add('is-active');
            });
        });
    }

    function renderSectionList(activeSectionIndex = Number(sectionSelect.value)) {
        if (!sectionList) return;
        sectionList.innerHTML = storyConfig.sections.map((section, index) => `
            <div class="editor-section-item${index === activeSectionIndex ? ' is-active' : ''}" draggable="true" data-section-index="${index}">
                <span class="editor-drag-handle" aria-hidden="true">::</span>
                <button type="button" data-editor-action="jump-section" data-section-index="${index}">
                    ${index + 1}. ${stripTags(section.title).replace(/^\d+\.\s*/, '') || 'Sektion'}
                </button>
                <button type="button" data-editor-action="delete-section" data-section-index="${index}" style="margin-left: auto; padding: 2px 6px;">&times;</button>
            </div>
        `).join('');
    }

    function renderNavList() {
        const navList = shell.querySelector('#editor-nav');
        if (!navList) return;

        const navItems = storyConfig.nav || [];
        navList.innerHTML = navItems.map((item, index) => {
            const targetSectionMatch = item.href.match(/#s(\d+)/);
            const targetIndex = targetSectionMatch ? parseInt(targetSectionMatch[1], 10) - 1 : 0;
            
            return `
                <div class="editor-nav-item" data-nav-index="${index}" style="display: flex; flex-direction: column; gap: 4px; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <input type="text" value="${item.label}" data-nav-prop="label" style="flex: 1; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 4px; border-radius: 4px;">
                        <button type="button" data-editor-action="delete-nav-item" data-nav-index="${index}">&times;</button>
                    </div>
                    <div style="display: flex; gap: 4px; align-items: center; font-size: 0.8rem;">
                        <label>Ziel:</label>
                        <select data-nav-prop="target" style="flex: 1; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 2px;">
                            ${storyConfig.sections.map((s, i) => `
                                <option value="#s${i + 1}" ${targetIndex === i ? 'selected' : ''}>Sektion ${i + 1}: ${stripTags(s.title).slice(0, 20)}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            `;
        }).join('');

        navList.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', () => {
                const navIndex = parseInt(input.closest('.editor-nav-item').dataset.navIndex, 10);
                const prop = input.dataset.navProp;
                const nextState = cloneConfig(editorState.state);
                if (!nextState.nav) {
                    nextState.nav = storyConfig.nav.map(n => ({ ...n }));
                }
                if (prop === 'label') nextState.nav[navIndex].label = input.value;
                if (prop === 'target') nextState.nav[navIndex].href = input.value;
                updateState(nextState, 'Kapitel aktualisiert');
            });
        });
    }

    function harvestCurrentEdits() {
        document.querySelectorAll('[data-edit-path]').forEach(node => {
            if (active && node.contentEditable === 'true') {
                const path = node.dataset.editPath;
                const value = node.innerHTML.trim();
                
                const currentVal = editorState.getValue(path);
                if (currentVal !== value) {
                    console.log('Harvesting edit:', path, value);
                    setDeepValue(editorState.state, path, value);
                }
            }
        });
    }

    function setDeepValue(target, path, value) {
        let cursor = target;
        const keys = path.split('.');
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            
            // Fix: Check if key exists and is object. If not, initialize.
            if (cursor[key] === undefined || cursor[key] === null || typeof cursor[key] !== 'object') {
                const nextKey = keys[i + 1];
                cursor[key] = /^\d+$/.test(nextKey) ? [] : {};
            }
            cursor = cursor[key];
        }
        
        console.log('Setting path', path, 'to', value);
        cursor[keys[keys.length - 1]] = value;
    }

    function updateState(nextState, message = 'Gespeichert') {
        harvestCurrentEdits();
        editorState.writeState(nextState);
        setStatus(message, 'saved');
    }

    editorState.on('change', (newState) => {
        console.log('Editor state change detected, re-rendering UI...');
        state = newState;
        storyConfig = editorState.getEffectiveConfig();
        storyTitleDisplay.textContent = storyConfig.title;
        populateSectionSelect();
        syncPanel();
        setupEditableListeners();
        renderNavList();
    });

    function createElement(type) {
        if (type === 'heading') return { type: 'heading', text: 'Neue Zwischenueberschrift' };
        if (type === 'text') return { type: 'text', text: 'Neuer Infotext. Klicken und direkt bearbeiten.' };
        if (type === 'quote') return { type: 'quote', text: 'Zitat oder hervorgehobener Text.', author: 'Quelle' };
        if (type === 'image') return { type: 'image', src: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800', alt: 'Medizinisches Bild', caption: 'Bildunterschrift' };
        if (type === 'video') return { type: 'video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', caption: 'Video Titel' };
        if (type === 'stat') return { type: 'stat', icon: 'A', label: 'Kennzahl:', text: 'Wichtige Information zur aktuellen Sektion.' };
        if (type === 'meter') return { type: 'chart', chartType: 'meter', label: 'Messwert', value: 72, caption: 'Kurze Einordnung' };
        if (type === 'bars') {
            return {
                type: 'chart',
                chartType: 'bars',
                label: 'Vergleich',
                items: [{ label: 'A', value: 45 }, { label: 'B', value: 68 }, { label: 'C', value: 82 }]
            };
        }
        return {
            type: 'chart',
            chartType: 'split',
            label: 'Aufteilung',
            items: [{ label: 'Teil 1', value: 58 }, { label: 'Teil 2', value: 42 }]
        };
    }

    function addElementToSection(sectionIndex, type, insertIndex = null) {
        harvestCurrentEdits();
        const nextState = cloneConfig(editorState.state);
        const mutableSection = getMutableSection(nextState, sectionIndex);
        const elements = getCurrentElements(nextState, sectionIndex);
        const nextIndex = insertIndex === null ? elements.length : Math.max(0, Math.min(insertIndex, elements.length));
        elements.splice(nextIndex, 0, createElement(type));
        mutableSection.elements = elements;
        updateState(nextState, 'Element hinzugefuegt');
    }

    function addSection() {
        harvestCurrentEdits();
        const nextState = cloneConfig(editorState.state);
        const nextNumber = storyConfig.sections.length + 1;
        nextState.extraSections = [
            ...(nextState.extraSections || []),
            {
                title: `${nextNumber}. Neue Sektion`,
                paragraphs: ['Neue Sektion. Klicken und direkt bearbeiten.'],
                elements: [
                    { type: 'heading', text: 'Inhalt strukturieren' },
                    { type: 'stat', icon: 'A', label: 'Info:', text: 'Eigene Infocard fuer diese Sektion.' }
                ],
                statIcon: 'A',
                statLabel: 'Fokus:',
                statText: 'Neue Story-Sektion.'
            }
        ];
        nextState.sectionOrder = [...getSectionOrder(), `extra:${nextState.extraSections.length - 1}`];
        updateState(nextState, 'Sektion erstellt');
    }

    function deleteElement(sectionIndex, elementIndex) {
        harvestCurrentEdits();
        const nextState = cloneConfig(editorState.state);
        const mutableSection = getMutableSection(nextState, sectionIndex);
        const currentElements = getCurrentElements(nextState, sectionIndex);
        mutableSection.elements = currentElements.filter((_, index) => index !== elementIndex);
        updateState(nextState, 'Element entfernt');
    }

    function duplicateElement(sectionIndex, elementIndex) {
        harvestCurrentEdits();
        const nextState = cloneConfig(editorState.state);
        const mutableSection = getMutableSection(nextState, sectionIndex);
        const elements = getCurrentElements(nextState, sectionIndex);
        const elementToCopy = elements[elementIndex];
        if (!elementToCopy) return;

        const newElement = cloneConfig(elementToCopy);
        elements.splice(elementIndex + 1, 0, newElement);
        mutableSection.elements = elements;
        updateState(nextState, 'Element dupliziert');
    }

    function moveElement(fromSectionIndex, elementIndex, toSectionIndex, insertIndex = null) {
        harvestCurrentEdits();
        const nextState = cloneConfig(editorState.state);
        const fromMutable = getMutableSection(nextState, fromSectionIndex);
        const toMutable = getMutableSection(nextState, toSectionIndex);
        const fromElements = getCurrentElements(nextState, fromSectionIndex);
        const [element] = fromElements.splice(elementIndex, 1);
        if (!element) return;

        const sameSection = fromSectionIndex === toSectionIndex;
        const toElements = sameSection ? fromElements : getCurrentElements(nextState, toSectionIndex);
        let nextIndex = insertIndex === null ? toElements.length : Math.max(0, Math.min(insertIndex, toElements.length));
        if (sameSection && insertIndex !== null && elementIndex < nextIndex) nextIndex -= 1;
        toElements.splice(nextIndex, 0, element);
        fromMutable.elements = fromElements;
        toMutable.elements = toElements;
        updateState(nextState, 'Element verschoben');
    }

    function reorderSections(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        harvestCurrentEdits();
        const nextState = cloneConfig(editorState.state);
        const order = getSectionOrder();
        const [sectionId] = order.splice(fromIndex, 1);
        order.splice(Math.max(0, Math.min(toIndex, order.length)), 0, sectionId);
        nextState.sectionOrder = order;
        updateState(nextState, 'Sektionen sortiert');
    }

    function deleteSection(index) {
        if (!confirm('Sektion wirklich loeschen?')) return;
        harvestCurrentEdits();
        const nextState = cloneConfig(editorState.state);
        const order = getSectionOrder();
        order.splice(index, 1);
        nextState.sectionOrder = order;
        updateState(nextState, 'Sektion entfernt');
    }

    function addNavItem() {
        harvestCurrentEdits();
        const nextState = cloneConfig(editorState.state);
        if (!nextState.nav) {
            nextState.nav = storyConfig.nav.map(n => ({ ...n }));
        }
        nextState.nav.push({ href: '#s1', label: 'Neues Kapitel' });
        updateState(nextState, 'Kapitel hinzugefuegt');
    }

    function deleteNavItem(index) {
        if (!confirm('Kapitel wirklich loeschen?')) return;
        harvestCurrentEdits();
        const nextState = cloneConfig(editorState.state);
        if (!nextState.nav) {
            nextState.nav = storyConfig.nav.map(n => ({ ...n }));
        }
        nextState.nav.splice(index, 1);
        updateState(nextState, 'Kapitel entfernt');
    }

    function setActive(nextActive) {
        active = nextActive;
        document.body.classList.toggle('editor-mode', active);
        toggle.setAttribute('aria-pressed', String(active));
        setupEditableListeners();
        syncPanel();
        
        // Trigger resize to adapt 3D view
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300); // Wait for CSS transition
    }

    let activeElementInfo = null;

    function setupEditableListeners() {
        document.querySelectorAll('[data-edit-path]').forEach((node) => {
            node.contentEditable = active ? 'true' : 'false';
            node.spellcheck = active;
            
            const newNode = node.cloneNode(true);
            node.parentNode.replaceChild(newNode, node);
            
            newNode.addEventListener('click', (event) => {
                if (active) {
                    event.preventDefault();
                    event.stopPropagation();
                    
                    // Highlight
                    document.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
                    const elementNode = newNode.closest('[data-editor-element]');
                    if (elementNode) elementNode.classList.add('is-selected');

                    showQuickToolbar(newNode);
                }
            });
            newNode.addEventListener('blur', () => {
                if (active) saveEditableValue(newNode);
            });
            newNode.addEventListener('input', () => {
                if (active) setStatus('Ungespeichert', 'dirty');
            });
            newNode.addEventListener('keydown', (event) => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                    event.preventDefault();
                    saveEditableValue(newNode);
                }
            });
        });

        // Add drag and click support for story elements
        document.querySelectorAll('[data-editor-element]').forEach((node) => {
            node.draggable = active;
            
            if (active) {
                node.addEventListener('click', (event) => {
                    event.stopPropagation();
                    
                    // Highlight
                    document.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
                    node.classList.add('is-selected');
                    
                    // Open Properties
                    const step = node.closest('.step');
                    const sectionIndex = Number(step.dataset.sectionIndex);
                    const elementIndex = Number(node.dataset.editorElement);
                    
                    // Switch Tab to 'Inhalt'
                    shell.querySelectorAll('.editor-tab-btn').forEach(b => b.classList.remove('is-active'));
                    shell.querySelectorAll('.editor-tab-content').forEach(c => c.classList.remove('is-active'));
                    shell.querySelector('[data-tab="current"]').classList.add('is-active');
                    shell.querySelector('[data-tab-id="current"]').classList.add('is-active');

                    updatePanelForSection(sectionIndex);
                    openProperties(elementIndex, sectionIndex);
                    
                    // Also show toolbar
                    const editNode = node.querySelector('[data-edit-path]') || node;
                    showQuickToolbar(editNode);
                });

                node.addEventListener('dragstart', (event) => {
                    const step = node.closest('.step');
                    const sectionIndex = Number(step.dataset.sectionIndex);
                    const elementIndex = Number(node.dataset.editorElement);
                    
                    writeDragData(event, {
                        kind: 'element',
                        fromSectionIndex: sectionIndex,
                        elementIndex: elementIndex
                    });
                    
                    node.classList.add('is-dragging-story');
                    event.stopPropagation();
                });

                node.addEventListener('dragend', () => {
                    node.classList.remove('is-dragging-story');
                    currentDragData = null;
                });
            }
        });
    }

    function showQuickToolbar(node) {
        const path = node.dataset.editPath || node.closest('[data-edit-path]')?.dataset.editPath;
        if (!path) return;

        const parts = path.split('.');
        let sectionIndex = -1;
        let elementIndex = -1;

        if (parts[0] === 'sections' || parts[0] === 'extraSections') {
            const rawIndex = Number(parts[1]);
            if (parts[0] === 'sections') {
                sectionIndex = storyConfig.sections.findIndex(s => s.__baseIndex === rawIndex);
                if (sectionIndex === -1) sectionIndex = rawIndex;
            } else {
                sectionIndex = storyConfig.sections.findIndex(s => s.__extraIndex === rawIndex);
            }
            
            if (parts[2] === 'elements') {
                elementIndex = Number(parts[3]);
            }
        }

        activeElementInfo = { node, path, sectionIndex, elementIndex };
        
        const rect = node.getBoundingClientRect();
        quickToolbar.style.display = 'flex';
        quickToolbar.style.top = `${window.scrollY + rect.top - 40}px`;
        quickToolbar.style.left = `${rect.left}px`;
        
        const elements = storyConfig.sections[sectionIndex]?.elements || [];
        quickToolbar.querySelector('[data-quick-action="move-up"]').style.display = elementIndex > 0 ? 'block' : 'none';
        quickToolbar.querySelector('[data-quick-action="move-down"]').style.display = (elementIndex >= 0 && elementIndex < elements.length - 1) ? 'block' : 'none';
        quickToolbar.querySelector('[data-quick-action="delete"]').style.display = elementIndex >= 0 ? 'block' : 'none';
        quickToolbar.querySelector('[data-quick-action="duplicate"]').style.display = elementIndex >= 0 ? 'block' : 'none';
    }

    quickToolbar.addEventListener('click', (event) => {
        const action = event.target.closest('[data-quick-action]')?.dataset.quickAction;
        if (!action || !activeElementInfo) return;

        const { sectionIndex, elementIndex } = activeElementInfo;

        if (action === 'edit') {
            if (elementIndex >= 0) {
                updatePanelForSection(sectionIndex);
                openProperties(elementIndex, sectionIndex);
            } else {
                // Section title editing is handled by contentEditable
                activeElementInfo.node.focus();
            }
        }

        if (action === 'duplicate' && elementIndex >= 0) {
            duplicateElement(sectionIndex, elementIndex);
        }

        if (action === 'move-up' && elementIndex > 0) {
            moveElement(sectionIndex, elementIndex, sectionIndex, elementIndex - 1);
        }

        if (action === 'move-down') {
            moveElement(sectionIndex, elementIndex, sectionIndex, elementIndex + 1);
        }

        if (action === 'delete' && elementIndex >= 0) {
            if (confirm('Element wirklich loeschen?')) {
                deleteElement(sectionIndex, elementIndex);
            }
        }

        quickToolbar.style.display = 'none';
    });

    document.addEventListener('click', (event) => {
        if (!quickToolbar.contains(event.target) && !event.target.hasAttribute('data-edit-path')) {
            quickToolbar.style.display = 'none';
        }

        // Handle per-element toolbar buttons
        if (!active) return;
        const btn = event.target.closest('.element-toolbar-btn');
        if (btn) {
            event.preventDefault();
            event.stopPropagation();
            
            const action = btn.dataset.editorAction;
            const elementNode = btn.closest('[data-editor-element]');
            if (!elementNode) return;
            
            const step = elementNode.closest('.step');
            const sectionIndex = Number(step.dataset.sectionIndex);
            const elementIndex = Number(elementNode.dataset.editorElement);
            
            if (action === 'edit-properties') {
                updatePanelForSection(sectionIndex);
                openProperties(elementIndex, sectionIndex);
                
                document.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
                elementNode.classList.add('is-selected');
            }
            
            if (action === 'delete-element') {
                if (confirm('Element wirklich loeschen?')) {
                    deleteElement(sectionIndex, elementIndex);
                }
            }
        }
    });

    function saveEditableValue(element) {
        const path = element.dataset.editPath;
        const value = element.innerHTML.trim();
        editorState.updatePath(path, value);
        setStatus('Gespeichert', 'saved');
    }

    toggle.addEventListener('click', () => setActive(!active));
    window.addEventListener('scroll', () => {
        syncPanel();
        if (quickToolbar.style.display === 'flex') quickToolbar.style.display = 'none';
    }, { passive: true });

    sectionSelect.addEventListener('change', () => {
        const sectionIndex = Number(sectionSelect.value);
        updatePanelForSection(sectionIndex);
        setStatus('Sektion aktiv', 'saved');
        const step = document.getElementById(`s${Number(sectionSelect.value) + 1}`);
        if (step) step.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    function writeDragData(event, data) {
        currentDragData = data;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/json', JSON.stringify(data));
        event.dataTransfer.setData('text/plain', JSON.stringify(data));
    }

    function readDragData(event) {
        if (currentDragData) return currentDragData;
        const raw = event.dataTransfer.getData('application/json') || event.dataTransfer.getData('text/plain');
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (error) {
            return null;
        }
    }

    function getDropElementIndex(event) {
        const item = event.target.closest('.editor-element-item');
        if (!item) return null;
        const rect = item.getBoundingClientRect();
        const itemIndex = Number(item.dataset.elementIndex);
        return event.clientY > rect.top + rect.height / 2 ? itemIndex + 1 : itemIndex;
    }

    function getDropSectionIndex(event) {
        const item = event.target.closest('.editor-section-item');
        if (!item) return null;
        const rect = item.getBoundingClientRect();
        const itemIndex = Number(item.dataset.sectionIndex);
        return event.clientY > rect.top + rect.height / 2 ? itemIndex + 1 : itemIndex;
    }

    shell.addEventListener('dragstart', (event) => {
        const paletteItem = event.target.closest('[data-editor-drag-type]');
        if (paletteItem) {
            writeDragData(event, { kind: 'palette', type: paletteItem.dataset.editorDragType });
            return;
        }

        const elementItem = event.target.closest('.editor-element-item');
        if (elementItem) {
            writeDragData(event, {
                kind: 'element',
                fromSectionIndex: Number(sectionSelect.value),
                elementIndex: Number(elementItem.dataset.elementIndex)
            });
            elementItem.classList.add('is-dragging');
            return;
        }

        const sectionItem = event.target.closest('.editor-section-item');
        if (sectionItem) {
            writeDragData(event, {
                kind: 'section',
                fromIndex: Number(sectionItem.dataset.sectionIndex)
            });
            sectionItem.classList.add('is-dragging');
        }
    });

    shell.addEventListener('dragend', () => {
        shell.querySelectorAll('.is-dragging, .is-drop-target').forEach((node) => {
            node.classList.remove('is-dragging', 'is-drop-target');
        });
        currentDragData = null;
    });

    elementList.addEventListener('dragover', (event) => {
        const data = readDragData(event);
        if (!data || (data.kind !== 'palette' && data.kind !== 'element')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        elementList.querySelectorAll('.editor-drop-indicator').forEach(i => i.remove());
        const insertIndex = getDropElementIndex(event);
        const items = elementList.querySelectorAll('.editor-element-item');
        
        const indicator = document.createElement('div');
        indicator.className = 'editor-drop-indicator';
        indicator.style.margin = '4px 0';
        
        if (insertIndex !== null && insertIndex < items.length) {
            items[insertIndex].before(indicator);
        } else {
            elementList.appendChild(indicator);
        }
    });

    elementList.addEventListener('dragleave', (event) => {
        if (!elementList.contains(event.relatedTarget)) {
            elementList.querySelectorAll('.editor-drop-indicator').forEach(i => i.remove());
        }
    });

    elementList.addEventListener('drop', (event) => {
        const data = readDragData(event);
        if (!data || (data.kind !== 'palette' && data.kind !== 'element')) return;
        event.preventDefault();
        elementList.querySelectorAll('.editor-drop-indicator').forEach(i => i.remove());
        const sectionIndex = Number(sectionSelect.value);
        const insertIndex = getDropElementIndex(event);

        if (data.kind === 'palette') {
            addElementToSection(sectionIndex, data.type, insertIndex);
        } else {
            moveElement(data.fromSectionIndex, data.elementIndex, sectionIndex, insertIndex);
        }
    });

    sectionList.addEventListener('dragover', (event) => {
        const data = readDragData(event);
        if (!data || data.kind !== 'section') return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        sectionList.classList.add('is-drop-target');
    });

    sectionList.addEventListener('dragleave', (event) => {
        if (!sectionList.contains(event.relatedTarget)) sectionList.classList.remove('is-drop-target');
    });

    sectionList.addEventListener('drop', (event) => {
        const data = readDragData(event);
        if (!data || data.kind !== 'section') return;
        event.preventDefault();
        sectionList.classList.remove('is-drop-target');
        const toIndex = getDropSectionIndex(event);
        reorderSections(data.fromIndex, toIndex === null ? storyConfig.sections.length - 1 : toIndex);
    });

    const storyContainer = document.getElementById('story');

    function getDropElementIndexInStory(event, step) {
        const textBox = step.querySelector('.text-box');
        if (!textBox) return null;
        const elements = Array.from(textBox.querySelectorAll('[data-editor-element]'));
        if (!elements.length) return null;

        for (let i = 0; i < elements.length; i++) {
            const rect = elements[i].getBoundingClientRect();
            if (event.clientY < rect.top + rect.height / 2) {
                return i;
            }
        }
        return elements.length;
    }

    document.addEventListener('dragenter', (event) => {
        if (!active || !currentDragData) return;
        if (currentDragData.kind === 'palette' || currentDragData.kind === 'element') {
            const step = event.target.closest('.step');
            if (step) {
                event.preventDefault();
            }
        }
    });

    document.addEventListener('dragover', (event) => {
        if (!active || !currentDragData) return;
        
        if (currentDragData.kind === 'palette' || currentDragData.kind === 'element') {
            // Aggressively prevent default to enable drop
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';

            const step = event.target.closest('.step');
            if (step) {
                // Visual feedback
                document.querySelectorAll('.step.editor-drop-target').forEach(s => s.classList.remove('editor-drop-target'));
                step.classList.add('editor-drop-target');
                
                // Indicator
                document.querySelectorAll('.editor-drop-indicator').forEach(i => i.remove());
                const insertIndex = getDropElementIndexInStory(event, step);
                const textBox = step.querySelector('.text-box');
                if (textBox) {
                    const indicator = document.createElement('div');
                    indicator.className = 'editor-drop-indicator';
                    const elements = textBox.querySelectorAll('[data-editor-element]');
                    if (insertIndex !== null && insertIndex < elements.length) {
                        elements[insertIndex].before(indicator);
                    } else {
                        textBox.appendChild(indicator);
                    }
                }
            } else {
                document.querySelectorAll('.step.editor-drop-target').forEach(s => s.classList.remove('editor-drop-target'));
                document.querySelectorAll('.editor-drop-indicator').forEach(i => i.remove());
            }
        }
    });

    document.addEventListener('drop', (event) => {
        if (!active || !currentDragData) return;
        
        console.log('Drop event triggered', currentDragData);

        if (currentDragData.kind === 'palette' || currentDragData.kind === 'element') {
            const step = event.target.closest('.step');
            console.log('Target step found:', !!step);

            if (step) {
                event.preventDefault();

                const basePath = step.dataset.editBasePath;
                console.log('Base Path:', basePath);

                const insertIndex = getDropElementIndexInStory(event, step);
                console.log('Insert Index:', insertIndex);

                if (currentDragData.kind === 'palette' && currentDragData.type) {
                    console.log('Adding element from palette:', currentDragData.type);

                    // Use base path to update config directly
                    const path = `${basePath}.elements`;
                    const elements = editorState.getValue(path) || [];
                    const nextIndex = insertIndex === null ? elements.length : Math.max(0, Math.min(insertIndex, elements.length));

                    const newElements = [...elements];
                    newElements.splice(nextIndex, 0, createElement(currentDragData.type));

                    editorState.updatePath(path, newElements);
                    setStatus('Element hinzugefuegt', 'saved');
                } else if (currentDragData.kind === 'element') {
                    // Keep moveElement for now, needs similar path-based fix
                    const sectionIndex = Number(step.dataset.sectionIndex);
                    console.log('Moving element:', currentDragData.fromSectionIndex, 'to', sectionIndex);
                    moveElement(currentDragData.fromSectionIndex, currentDragData.elementIndex, sectionIndex, insertIndex);
                }
            }

        }
        
        // Clean up
        document.querySelectorAll('.step.editor-drop-target').forEach(s => s.classList.remove('editor-drop-target'));
        document.querySelectorAll('.editor-drop-indicator').forEach(i => i.remove());
        currentDragData = null; // Clear immediately after drop
    });

    modelSelect.addEventListener('change', async () => {
        const sectionIndex = Number(sectionSelect.value);
        const nextState = cloneConfig(editorState.state);
        if (!nextState.models) nextState.models = {};
        if (!nextState.uploadedModels) nextState.uploadedModels = {};

        if (modelSelect.value === '__uploaded') {
            setStatus('GLB ablegen', 'dirty');
            syncPanel();
            return;
        }

        if (modelSelect.value) {
            nextState.models[sectionIndex] = modelSelect.value;
            delete nextState.uploadedModels[sectionIndex];
            await editorState.deleteUploadedModel(sectionIndex);
            await setSectionModel(sectionIndex, modelSelect.value);
        } else {
            delete nextState.models[sectionIndex];
            delete nextState.uploadedModels[sectionIndex];
            await editorState.deleteUploadedModel(sectionIndex);
            resetSectionModel(sectionIndex);
        }

        updateState(nextState, 'Modell gespeichert');
    });

    async function handleModelFile(file) {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.glb')) {
            fileStatus.textContent = 'Bitte eine .glb-Datei waehlen.';
            setStatus('Falscher Dateityp', 'error');
            return;
        }

        const sectionIndex = Number(sectionSelect.value);
        const nextState = cloneConfig(editorState.state);
        if (!nextState.models) nextState.models = {};
        if (!nextState.uploadedModels) nextState.uploadedModels = {};

        fileStatus.textContent = `Lade ${file.name} ...`;
        setStatus('Import laeuft', 'dirty');
        await editorState.writeUploadedModel(sectionIndex, file);
        delete nextState.models[sectionIndex];
        nextState.uploadedModels[sectionIndex] = {
            name: file.name,
            size: file.size,
            updatedAt: new Date().toISOString()
        };

        editorState.writeState(nextState);
        await setSectionModelFile(sectionIndex, URL.createObjectURL(file), file.name);
        setStatus('GLB gespeichert', 'saved');
    }

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileInput.click();
        }
    });
    fileInput.addEventListener('change', () => handleModelFile(fileInput.files?.[0]));

    ['dragenter', 'dragover'].forEach((eventName) => {
        uploadZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            uploadZone.classList.add('is-dragging');
        });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
        uploadZone.addEventListener(eventName, (event) => {
            event.preventDefault();
            uploadZone.classList.remove('is-dragging');
        });
    });
    uploadZone.addEventListener('drop', (event) => {
        handleModelFile(event.dataTransfer?.files?.[0]);
    });

    shell.addEventListener('click', (event) => {
        const action = event.target.closest('[data-editor-action]')?.dataset.editorAction;
        if (!action) return;

        if (action === 'reset-model') {
            const sectionIndex = Number(sectionSelect.value);
            const nextState = cloneConfig(editorState.state);
            if (nextState.models) delete nextState.models[sectionIndex];
            if (nextState.uploadedModels) delete nextState.uploadedModels[sectionIndex];
            editorState.writeState(nextState);
            editorState.deleteUploadedModel(sectionIndex).finally(() => resetSectionModel(sectionIndex));
            setStatus('Modell entfernt', 'saved');
        }

        if (action === 'jump-section') {
            const sectionIndex = Number(event.target.dataset.sectionIndex);
            sectionSelect.value = String(sectionIndex);
            updatePanelForSection(sectionIndex);
            const step = document.getElementById(`s${sectionIndex + 1}`);
            if (step) step.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setStatus('Sektion aktiv', 'saved');
        }

        if (action === 'add-section') {
            addSection();
        }

        if (action === 'add-heading') addElementToSection(Number(sectionSelect.value), 'heading');
        if (action === 'add-text') addElementToSection(Number(sectionSelect.value), 'text');
        if (action === 'add-quote') addElementToSection(Number(sectionSelect.value), 'quote');
        if (action === 'add-image') addElementToSection(Number(sectionSelect.value), 'image');
        if (action === 'add-video') addElementToSection(Number(sectionSelect.value), 'video');
        if (action === 'add-stat') addElementToSection(Number(sectionSelect.value), 'stat');
        if (action === 'add-meter') addElementToSection(Number(sectionSelect.value), 'meter');
        if (action === 'add-bars') addElementToSection(Number(sectionSelect.value), 'bars');
        if (action === 'add-split') addElementToSection(Number(sectionSelect.value), 'split');

        if (action === 'delete-section') {
            deleteSection(Number(event.target.dataset.sectionIndex));
        }

        if (action === 'add-nav-item') {
            addNavItem();
        }

        if (action === 'delete-nav-item') {
            deleteNavItem(Number(event.target.dataset.navIndex));
        }

        if (action === 'delete-element') {
            deleteElement(Number(sectionSelect.value), Number(event.target.dataset.elementIndex));
            closeProperties();
        }

        if (action === 'edit-properties') {
            openProperties(Number(event.target.dataset.elementIndex));
        }

        if (action === 'close-properties') {
            closeProperties();
        }

        if (action === 'save-local') {
            harvestCurrentEdits();
            editorState.writeState(editorState.state);
            setStatus('Fortschritt gesichert!', 'saved');
        }

        if (action === 'export') {
            exportBox.value = JSON.stringify(exportState(), null, 2);
            exportBox.classList.add('is-visible');
            exportBox.select();
            setStatus('Export bereit', 'saved');
        }

        if (action === 'reset-all' && confirm('Alle lokalen Editor-Aenderungen fuer diese Story zuruecksetzen?')) {
            editorState.removeState();
            editorState.deleteUploadedModelsForVersion().finally(() => window.location.reload());
        }
    });

    syncPanel();
}
