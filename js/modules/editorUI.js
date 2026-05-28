function stripTags(value = '') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = value;
    return wrapper.textContent || wrapper.innerText || '';
}

function cloneConfig(config) {
    return JSON.parse(JSON.stringify(config));
}

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
        <div class="editor-current" id="editor-current"></div>
        <div class="editor-row">
            <label for="editor-section">Sektion</label>
            <select id="editor-section"></select>
        </div>
        <div class="editor-row">
            <label for="editor-model">3D-Modell</label>
            <select id="editor-model"></select>
        </div>
        <div class="editor-builder">
            <div class="editor-builder-head">
                <strong>Elemente</strong>
                <button type="button" data-editor-action="add-section">+ Sektion</button>
            </div>
            <div class="editor-palette" aria-label="Elemente hinzufuegen">
                <button type="button" draggable="true" data-editor-action="add-heading" data-editor-drag-type="heading">Ueberschrift</button>
                <button type="button" draggable="true" data-editor-action="add-text" data-editor-drag-type="text">Text</button>
                <button type="button" draggable="true" data-editor-action="add-stat" data-editor-drag-type="stat">Statbox</button>
                <button type="button" draggable="true" data-editor-action="add-meter" data-editor-drag-type="meter">Meter</button>
                <button type="button" draggable="true" data-editor-action="add-bars" data-editor-drag-type="bars">Balken</button>
                <button type="button" draggable="true" data-editor-action="add-split" data-editor-drag-type="split">Split</button>
            </div>
            <div class="editor-elements" id="editor-elements"></div>
            <div class="editor-section-builder">
                <strong>Sektionen</strong>
                <div class="editor-sections" id="editor-sections"></div>
            </div>
        </div>
        <div class="editor-properties" id="editor-properties">
            <div class="editor-properties-head">
                <strong>Eigenschaften</strong>
                <button type="button" data-editor-action="close-properties">&times;</button>
            </div>
            <div id="editor-property-form"></div>
        </div>
        <div class="editor-upload" id="editor-upload" tabindex="0" role="button">
            <input id="editor-model-file" type="file" accept=".glb,model/gltf-binary">
            <span>GLB-Datei ablegen</span>
            <small>ersetzt das Modell der gewaehlten Sektion</small>
        </div>
        <p class="editor-file-status" id="editor-file-status"></p>
        <div class="editor-actions">
            <button type="button" data-editor-action="reset-model">Modell reset</button>
            <button type="button" data-editor-action="export">Export</button>
            <button type="button" data-editor-action="reset-all">Alle Aenderungen zuruecksetzen</button>
        </div>
        <textarea id="editor-export" readonly aria-label="Editor Export"></textarea>
    `;
    document.body.appendChild(shell);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'editor-toggle';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.textContent = 'Editor';
    document.body.appendChild(toggle);

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
        if (element.type === 'stat') return `S: ${stripTags(element.label).slice(0, 24) || 'Info'}`;
        if (element.type === 'chart') return `C: ${stripTags(element.label).slice(0, 24) || element.chartType || 'Chart'}`;
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

    function openProperties(elementIndex) {
        const sectionIndex = Number(sectionSelect.value);
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

        if (element.type === 'text' || element.type === 'heading') {
            html += `
                <div class="editor-row">
                    <label>Inhalt</label>
                    <textarea data-prop-path="${basePath}.text" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px; min-height: 80px;">${element.text || ''}</textarea>
                </div>
            `;
        } else if (element.type === 'stat') {
            html += `
                <div class="editor-row">
                    <label>Icon (A, R, !, 3D, DNA...)</label>
                    <input type="text" data-prop-path="${basePath}.icon" value="${element.icon || ''}" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
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
            `;
            if (element.chartType === 'meter') {
                html += `
                    <div class="editor-row">
                        <label>Wert (%)</label>
                        <input type="number" data-prop-path="${basePath}.value" value="${element.value || 0}" min="0" max="100" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                    </div>
                    <div class="editor-row">
                        <label>Unterschrift</label>
                        <input type="text" data-prop-path="${basePath}.caption" value="${element.caption || ''}" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                    </div>
                `;
            } else if (element.chartType === 'bars' || element.chartType === 'split' || element.chartType === 'flow') {
                (element.items || []).forEach((item, idx) => {
                    html += `
                        <div style="margin-top: 10px; padding: 8px; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; background: rgba(255,255,255,0.05);">
                            <strong style="font-size: 0.75rem; color: #888;">Item ${idx + 1}</strong>
                            <div class="editor-row">
                                <label>Label</label>
                                <input type="text" data-prop-path="${basePath}.items.${idx}.label" value="${item.label || ''}" style="width: 100%; padding: 6px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                            </div>
                            <div class="editor-row">
                                <label>Wert</label>
                                <input type="number" data-prop-path="${basePath}.items.${idx}.value" value="${item.value || 0}" style="width: 100%; padding: 6px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
                            </div>
                        </div>
                    `;
                });
            }
        }

        form.innerHTML = html;
        form.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('change', () => {
                const path = input.dataset.propPath;
                const value = input.type === 'number' ? Number(input.value) : input.value;
                editorState.updatePath(path, value);
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
            </div>
        `).join('');
    }

    function updateState(nextState, message = 'Gespeichert') {
        editorState.writeState(nextState);
        setStatus(message, 'saved');
    }

    // Reactive listener for state changes
    editorState.on('change', (newState) => {
        state = newState;
        storyConfig = editorState.getEffectiveConfig();
        storyTitleDisplay.textContent = storyConfig.title;
        populateSectionSelect();
        syncPanel();
        setupEditableListeners();
    });

    function createElement(type) {
        if (type === 'heading') return { type: 'heading', text: 'Neue Zwischenueberschrift' };
        if (type === 'text') return { type: 'text', text: 'Neuer Infotext. Klicken und direkt bearbeiten.' };
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
        const nextState = cloneConfig(editorState.state);
        const mutableSection = getMutableSection(nextState, sectionIndex);
        const elements = getCurrentElements(nextState, sectionIndex);
        const nextIndex = insertIndex === null ? elements.length : Math.max(0, Math.min(insertIndex, elements.length));
        elements.splice(nextIndex, 0, createElement(type));
        mutableSection.elements = elements;
        updateState(nextState, 'Element hinzugefuegt');
    }

    function addSection() {
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
        const nextState = cloneConfig(editorState.state);
        const mutableSection = getMutableSection(nextState, sectionIndex);
        const currentElements = getCurrentElements(nextState, sectionIndex);
        mutableSection.elements = currentElements.filter((_, index) => index !== elementIndex);
        updateState(nextState, 'Element entfernt');
    }

    function moveElement(fromSectionIndex, elementIndex, toSectionIndex, insertIndex = null) {
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
        const nextState = cloneConfig(editorState.state);
        const order = getSectionOrder();
        const [sectionId] = order.splice(fromIndex, 1);
        order.splice(Math.max(0, Math.min(toIndex, order.length)), 0, sectionId);
        nextState.sectionOrder = order;
        updateState(nextState, 'Sektionen sortiert');
    }

    function setActive(nextActive) {
        active = nextActive;
        document.body.classList.toggle('editor-mode', active);
        toggle.setAttribute('aria-pressed', String(active));
        setupEditableListeners();
        syncPanel();
    }

    function setupEditableListeners() {
        document.querySelectorAll('[data-edit-path]').forEach((node) => {
            node.contentEditable = active ? 'true' : 'false';
            node.spellcheck = active;
            
            // Re-setup listeners without cloning to preserve event state if needed, 
            // but for simple reactive UI, cloning and replacing is safer to avoid multiple listeners.
            const newNode = node.cloneNode(true);
            node.parentNode.replaceChild(newNode, node);
            
            newNode.addEventListener('click', (event) => {
                if (active && newNode.closest('a')) event.preventDefault();
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
    }

    function saveEditableValue(element) {
        const path = element.dataset.editPath;
        const value = element.innerHTML.trim();
        editorState.updatePath(path, value);
        setStatus('Gespeichert', 'saved');
    }

    toggle.addEventListener('click', () => setActive(!active));
    window.addEventListener('scroll', syncPanel, { passive: true });

    sectionSelect.addEventListener('change', () => {
        const sectionIndex = Number(sectionSelect.value);
        updatePanelForSection(sectionIndex);
        setStatus('Sektion aktiv', 'saved');
        const step = document.getElementById(`s${Number(sectionSelect.value) + 1}`);
        if (step) step.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    function writeDragData(event, data) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/json', JSON.stringify(data));
        event.dataTransfer.setData('text/plain', JSON.stringify(data));
    }

    function readDragData(event) {
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
    });

    elementList.addEventListener('dragover', (event) => {
        const data = readDragData(event);
        if (!data || (data.kind !== 'palette' && data.kind !== 'element')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        elementList.classList.add('is-drop-target');
    });

    elementList.addEventListener('dragleave', (event) => {
        if (!elementList.contains(event.relatedTarget)) elementList.classList.remove('is-drop-target');
    });

    elementList.addEventListener('drop', (event) => {
        const data = readDragData(event);
        if (!data || (data.kind !== 'palette' && data.kind !== 'element')) return;
        event.preventDefault();
        elementList.classList.remove('is-drop-target');
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

    document.addEventListener('dragover', (event) => {
        if (!active) return;
        const data = readDragData(event);
        const step = event.target.closest?.('#story .step');
        if (!step || !data || (data.kind !== 'palette' && data.kind !== 'element')) return;
        event.preventDefault();
        step.classList.add('editor-drop-target');
    });

    document.addEventListener('dragleave', (event) => {
        const step = event.target.closest?.('#story .step');
        if (step && !step.contains(event.relatedTarget)) step.classList.remove('editor-drop-target');
    });

    document.addEventListener('drop', (event) => {
        if (!active) return;
        const data = readDragData(event);
        const step = event.target.closest?.('#story .step');
        if (!step || !data || (data.kind !== 'palette' && data.kind !== 'element')) return;
        event.preventDefault();
        step.classList.remove('editor-drop-target');
        const sectionIndex = Number(step.dataset.sectionIndex);

        if (data.kind === 'palette') {
            addElementToSection(sectionIndex, data.type);
        } else {
            moveElement(data.fromSectionIndex, data.elementIndex, sectionIndex);
        }
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
        if (action === 'add-stat') addElementToSection(Number(sectionSelect.value), 'stat');
        if (action === 'add-meter') addElementToSection(Number(sectionSelect.value), 'meter');
        if (action === 'add-bars') addElementToSection(Number(sectionSelect.value), 'bars');
        if (action === 'add-split') addElementToSection(Number(sectionSelect.value), 'split');

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
