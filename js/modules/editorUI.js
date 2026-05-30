import { stripTags, cloneConfig, setDeepValue } from './core/Utils.js';
import { EditorShell } from './ui/editor/EditorShell.js';
import { SectionPanel } from './ui/editor/SectionPanel.js';
import { ContentPanel } from './ui/editor/ContentPanel.js';
import { NavigationPanel } from './ui/editor/NavigationPanel.js';
import { PropertyEditor } from './ui/editor/PropertyEditor.js';
import { DragDropManager } from './ui/editor/DragDropManager.js';

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
    let active = localStorage.getItem('editor-mode-active') === 'true';
    let storyConfig = initialStoryConfig;
    let state = editorState.state;
    let activeElementInfo = null;

    // Components
    let shell, contentPanel, sectionPanel, navigationPanel, propertyEditor, dragDropManager;

    const toggle = document.querySelector('.editor-toggle');
    if (!toggle) console.error('Editor toggle button not found in navbar!');

    const quickToolbar = createQuickToolbar();
    document.body.appendChild(quickToolbar);

    // Initialization
    shell = new EditorShell({
        storyConfig,
        onTabChange: (tabId) => syncPanel(),
        onAction: handleAction
    });
    document.body.appendChild(shell.element);

    contentPanel = new ContentPanel({
        container: shell.element.querySelector('#content-panel-root'),
        modelOptions,
        onAction: handleAction
    });

    sectionPanel = new SectionPanel({
        container: shell.element.querySelector('#section-panel-root'),
        onAction: handleAction
    });

    navigationPanel = new NavigationPanel({
        container: shell.element.querySelector('#navigation-panel-root'),
        onAction: handleAction
    });

    propertyEditor = new PropertyEditor({
        container: shell.element.querySelector('#editor-property-form'),
        editorState,
        onAction: handleAction
    });

    dragDropManager = new DragDropManager({
        shell: shell.element,
        editorState,
        onDrop: handleDrop
    });

    // Hidden input for import
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.id = 'import-json-input';
    importInput.accept = '.json';
    importInput.style.display = 'none';
    shell.element.appendChild(importInput);
    importInput.addEventListener('change', handleImport);

    function handleAction(action, data) {
        const sectionIndex = Number(shell.element.querySelector('#editor-section')?.value || 0);

        switch (action) {
            case 'change-section':
                const newIndex = Number(data.sectionIndex);
                updatePanelForSection(newIndex);
                scrollToSection(newIndex);
                shell.setStatus('Sektion aktiv', 'saved');
                break;
            case 'change-model':
                handleModelChange(sectionIndex, data.modelId);
                break;
            case 'upload-model':
                handleModelFile(data.file);
                break;
            case 'reset-model':
                handleModelReset(sectionIndex);
                break;
            case 'add-section':
                addSection();
                break;
            case 'jump-section':
                const jumpIndex = Number(data.sectionIndex);
                shell.element.querySelector('#editor-section').value = String(jumpIndex);
                updatePanelForSection(jumpIndex);
                scrollToSection(jumpIndex);
                shell.setStatus('Sektion aktiv', 'saved');
                break;
            case 'delete-section':
                deleteSection(Number(data.sectionIndex));
                break;
            case 'add-nav-item':
                addNavItem();
                break;
            case 'delete-nav-item':
                deleteNavItem(Number(data.navIndex));
                break;
            case 'update-nav-item':
                updateNavItem(data.index, data.prop, data.value);
                break;
            case 'edit-properties':
                openProperties(Number(data.elementIndex), sectionIndex);
                break;
            case 'delete-element':
                deleteElement(sectionIndex, Number(data.elementIndex));
                closeProperties();
                break;
            case 'close-properties':
                closeProperties();
                break;
            case 'save-local':
                harvestCurrentEdits();
                editorState.writeState(editorState.state);
                shell.setStatus('Fortschritt gesichert!', 'saved');
                break;
            case 'export':
                handleExport();
                break;
            case 'import-json':
                importInput.click();
                break;
            case 'reset-all':
                if (confirm('Alle lokalen Editor-Aenderungen zuruecksetzen?')) {
                    editorState.removeState();
                    editorState.deleteUploadedModelsForVersion().finally(() => window.location.reload());
                }
                break;
            case 'add-heading': addElementToSection(sectionIndex, 'heading'); break;
            case 'add-text': addElementToSection(sectionIndex, 'text'); break;
            case 'add-quote': addElementToSection(sectionIndex, 'quote'); break;
            case 'add-image': addElementToSection(sectionIndex, 'image'); break;
            case 'add-video': addElementToSection(sectionIndex, 'video'); break;
            case 'add-stat': addElementToSection(sectionIndex, 'stat'); break;
            case 'add-meter': addElementToSection(sectionIndex, 'meter'); break;
            case 'add-bars': addElementToSection(sectionIndex, 'bars'); break;
            case 'add-split': addElementToSection(sectionIndex, 'split'); break;
        }
    }

    function handleDrop(data) {
        if (data.target === 'story') {
            if (data.kind === 'palette') {
                const basePath = document.getElementById(`s${data.toSectionIndex + 1}`)?.dataset.editBasePath;
                if (!basePath) return;
                const path = `${basePath}.elements`;
                const elements = editorState.getValue(path) || [];
                const nextElements = [...elements];
                nextElements.splice(data.toInsertIndex ?? elements.length, 0, createElement(data.type));
                editorState.updatePath(path, nextElements);
                shell.setStatus('Element hinzugefuegt', 'saved');
            } else if (data.kind === 'element') {
                moveElement(data.fromSectionIndex, data.elementIndex, data.toSectionIndex, data.toInsertIndex);
            }
        } else if (data.target === 'panel-elements') {
            if (data.kind === 'palette') {
                addElementToSection(getCurrentSectionIndex(), data.type, data.toInsertIndex);
            } else {
                moveElement(data.fromSectionIndex, data.elementIndex, getCurrentSectionIndex(), data.toInsertIndex);
            }
        } else if (data.target === 'panel-sections') {
            reorderSections(data.fromIndex, data.toIndex ?? storyConfig.sections.length - 1);
        }
    }

    function getCurrentSectionIndex() {
        return Number(shell.element.querySelector('#editor-section')?.value || 0);
    }

    function updatePanelForSection(sectionIndex) {
        contentPanel.update(storyConfig, sectionIndex, editorState);
        sectionPanel.update(storyConfig, sectionIndex);
    }

    function syncPanel() {
        const sectionIndex = getCurrentSection();
        updatePanelForSection(sectionIndex);
        navigationPanel.update(storyConfig);
    }

    function scrollToSection(index) {
        const step = document.getElementById(`s${index + 1}`);
        if (step) step.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function handleModelChange(sectionIndex, modelId) {
        const nextState = cloneConfig(editorState.state);
        if (!nextState.models) nextState.models = {};
        if (!nextState.uploadedModels) nextState.uploadedModels = {};

        if (modelId === '__uploaded') {
            shell.setStatus('GLB ablegen', 'dirty');
            return;
        }

        if (modelId) {
            nextState.models[sectionIndex] = modelId;
            delete nextState.uploadedModels[sectionIndex];
            await editorState.deleteUploadedModel(sectionIndex);
            await setSectionModel(sectionIndex, modelId);
        } else {
            delete nextState.models[sectionIndex];
            delete nextState.uploadedModels[sectionIndex];
            await editorState.deleteUploadedModel(sectionIndex);
            resetSectionModel(sectionIndex);
        }
        updateState(nextState, 'Modell gespeichert');
    }

    async function handleModelFile(file) {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.glb')) {
            shell.setStatus('Falscher Dateityp', 'error');
            return;
        }
        const sectionIndex = getCurrentSectionIndex();
        const nextState = cloneConfig(editorState.state);
        if (!nextState.models) nextState.models = {};
        if (!nextState.uploadedModels) nextState.uploadedModels = {};

        shell.setStatus('Import laeuft', 'dirty');
        await editorState.writeUploadedModel(sectionIndex, file);
        delete nextState.models[sectionIndex];
        nextState.uploadedModels[sectionIndex] = {
            name: file.name,
            size: file.size,
            updatedAt: new Date().toISOString()
        };
        editorState.writeState(nextState);
        await setSectionModelFile(sectionIndex, URL.createObjectURL(file), file.name);
        shell.setStatus('GLB gespeichert', 'saved');
    }

    function handleModelReset(sectionIndex) {
        const nextState = cloneConfig(editorState.state);
        if (nextState.models) delete nextState.models[sectionIndex];
        if (nextState.uploadedModels) delete nextState.uploadedModels[sectionIndex];
        editorState.writeState(nextState);
        editorState.deleteUploadedModel(sectionIndex).finally(() => resetSectionModel(sectionIndex));
        shell.setStatus('Modell entfernt', 'saved');
    }

    function openProperties(elementIndex, sectionIndex) {
        const section = storyConfig.sections[sectionIndex];
        const element = section.elements?.[elementIndex];
        if (!element) return;
        shell.setHasProperties(true);
        propertyEditor.render(element, elementIndex, sectionIndex, storyConfig);
    }

    function closeProperties() {
        shell.setHasProperties(false);
    }

    function updateState(nextState, message = 'Gespeichert') {
        harvestCurrentEdits();
        editorState.writeState(nextState);
        shell.setStatus(message, 'saved');
    }

    function harvestCurrentEdits() {
        document.querySelectorAll('[data-edit-path]').forEach(node => {
            if (active && node.contentEditable === 'true') {
                const path = node.dataset.editPath;
                const value = node.innerHTML.trim();
                const currentVal = editorState.getValue(path);
                if (currentVal !== value) {
                    setDeepValue(editorState.state, path, value);
                }
            }
        });
    }

    function createElement(type) {
        if (type === 'heading') return { type: 'heading', text: 'Neue Zwischenueberschrift' };
        if (type === 'text') return { type: 'text', text: 'Neuer Infotext. Klicken und direkt bearbeiten.' };
        if (type === 'quote') return { type: 'quote', text: 'Zitat oder hervorgehobener Text.', author: 'Quelle' };
        if (type === 'image') return { type: 'image', src: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800', alt: 'Medizinisches Bild', caption: 'Bildunterschrift' };
        if (type === 'video') return { type: 'video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', caption: 'Video Titel' };
        if (type === 'stat') return { type: 'stat', icon: 'A', label: 'Kennzahl:', text: 'Wichtige Information zur aktuellen Sektion.' };
        if (type === 'meter') return { type: 'chart', chartType: 'meter', label: 'Messwert', value: 72, caption: 'Kurze Einordnung' };
        if (type === 'bars') return { type: 'chart', chartType: 'bars', label: 'Vergleich', items: [{ label: 'A', value: 45 }, { label: 'B', value: 68 }, { label: 'C', value: 82 }] };
        return { type: 'chart', chartType: 'split', label: 'Aufteilung', items: [{ label: 'Teil 1', value: 58 }, { label: 'Teil 2', value: 42 }] };
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
                elements: [{ type: 'heading', text: 'Inhalt strukturieren' }, { type: 'stat', icon: 'A', label: 'Info:', text: 'Eigene Infocard fuer diese Sektion.' }],
                statIcon: 'A', statLabel: 'Fokus:', statText: 'Neue Story-Sektion.'
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

    function duplicateElement(sectionIndex, elementIndex) {
        harvestCurrentEdits();
        const nextState = cloneConfig(editorState.state);
        const mutableSection = getMutableSection(nextState, sectionIndex);
        const elements = getCurrentElements(nextState, sectionIndex);
        const elementToCopy = elements[elementIndex];
        if (!elementToCopy) return;
        elements.splice(elementIndex + 1, 0, cloneConfig(elementToCopy));
        mutableSection.elements = elements;
        updateState(nextState, 'Element dupliziert');
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
        if (!nextState.nav) nextState.nav = storyConfig.nav.map(n => ({ ...n }));
        nextState.nav.push({ href: '#s1', label: 'Neues Kapitel' });
        updateState(nextState, 'Kapitel hinzugefuegt');
    }

    function deleteNavItem(index) {
        if (!confirm('Kapitel wirklich loeschen?')) return;
        harvestCurrentEdits();
        const nextState = cloneConfig(editorState.state);
        if (!nextState.nav) nextState.nav = storyConfig.nav.map(n => ({ ...n }));
        nextState.nav.splice(index, 1);
        updateState(nextState, 'Kapitel entfernt');
    }

    function updateNavItem(index, prop, value) {
        const nextState = cloneConfig(editorState.state);
        if (!nextState.nav) nextState.nav = storyConfig.nav.map(n => ({ ...n }));
        if (prop === 'label') nextState.nav[index].label = value;
        if (prop === 'target') nextState.nav[index].href = value;
        updateState(nextState, 'Kapitel aktualisiert');
    }

    // Helper functions for state manipulation
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
                nextState.extraSections[sourceIndex] = cloneConfig(renderedSection || { title: 'Neue Sektion', paragraphs: [] });
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

    function setActive(nextActive) {
        active = nextActive;
        document.body.classList.toggle('editor-mode', active);
        toggle.setAttribute('aria-pressed', String(active));
        setupEditableListeners();
        syncPanel();
        setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
    }

    function setupEditableListeners() {
        document.querySelectorAll('[data-edit-path]').forEach((node) => {
            node.contentEditable = active ? 'true' : 'false';
            node.spellcheck = active;
            const newNode = node.cloneNode(true);
            node.parentNode.replaceChild(newNode, node);
            newNode.addEventListener('click', (event) => {
                if (!active) return;
                event.preventDefault();
                event.stopPropagation();
                document.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
                const elementNode = newNode.closest('[data-editor-element]');
                if (elementNode) elementNode.classList.add('is-selected');
                showQuickToolbar(newNode);
            });
            newNode.addEventListener('blur', () => active && saveEditableValue(newNode));
            newNode.addEventListener('input', () => active && shell.setStatus('Ungespeichert', 'dirty'));
            newNode.addEventListener('keydown', (e) => {
                if (active && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    saveEditableValue(newNode);
                }
            });
        });

        document.querySelectorAll('[data-editor-element]').forEach((node) => {
            if (active) {
                const step = node.closest('.step');
                const sectionIndex = Number(step.dataset.sectionIndex);
                const elementIndex = Number(node.dataset.editorElement);
                dragDropManager.setupStoryElementDraggable(node, sectionIndex, elementIndex);
                node.addEventListener('click', (event) => {
                    event.stopPropagation();
                    document.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
                    node.classList.add('is-selected');
                    shell.setActiveTab('current');
                    updatePanelForSection(sectionIndex);
                    openProperties(elementIndex, sectionIndex);
                    showQuickToolbar(node.querySelector('[data-edit-path]') || node);
                });
            } else {
                node.draggable = false;
            }
        });
    }

    function saveEditableValue(element) {
        const path = element.dataset.editPath;
        const value = element.innerHTML.trim();
        editorState.updatePath(path, value);
        shell.setStatus('Gespeichert', 'saved');
    }

    function createQuickToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'editor-quick-toolbar';
        toolbar.innerHTML = `
            <button type="button" data-quick-action="edit" title="Bearbeiten">✎</button>
            <button type="button" data-quick-action="duplicate" title="Duplizieren">❐</button>
            <button type="button" data-quick-action="move-up" title="Nach oben">↑</button>
            <button type="button" data-quick-action="move-down" title="Nach unten">↓</button>
            <button type="button" data-quick-action="delete" title="Löschen">×</button>
        `;
        toolbar.addEventListener('click', handleQuickAction);
        return toolbar;
    }

    function showQuickToolbar(node) {
        const path = node.dataset.editPath || node.closest('[data-edit-path]')?.dataset.editPath;
        if (!path) return;
        const parts = path.split('.');
        let sectionIndex = -1, elementIndex = -1;
        if (parts[0] === 'sections' || parts[0] === 'extraSections') {
            const rawIndex = Number(parts[1]);
            sectionIndex = parts[0] === 'sections' ? (storyConfig.sections.findIndex(s => s.__baseIndex === rawIndex) === -1 ? rawIndex : storyConfig.sections.findIndex(s => s.__baseIndex === rawIndex)) : storyConfig.sections.findIndex(s => s.__extraIndex === rawIndex);
            if (parts[2] === 'elements') elementIndex = Number(parts[3]);
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

    function handleQuickAction(event) {
        const action = event.target.closest('[data-quick-action]')?.dataset.quickAction;
        if (!action || !activeElementInfo) return;
        const { sectionIndex, elementIndex, node } = activeElementInfo;
        if (action === 'edit') {
            if (elementIndex >= 0) {
                updatePanelForSection(sectionIndex);
                openProperties(elementIndex, sectionIndex);
            } else node.focus();
        }
        if (action === 'duplicate' && elementIndex >= 0) duplicateElement(sectionIndex, elementIndex);
        if (action === 'move-up' && elementIndex > 0) moveElement(sectionIndex, elementIndex, sectionIndex, elementIndex - 1);
        if (action === 'move-down') moveElement(sectionIndex, elementIndex, sectionIndex, elementIndex + 1);
        if (action === 'delete' && elementIndex >= 0 && confirm('Element wirklich loeschen?')) deleteElement(sectionIndex, elementIndex);
        quickToolbar.style.display = 'none';
    }

    function handleExport() {
        const data = JSON.stringify(exportState(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scrollytelling-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        shell.setStatus('Export gestartet', 'saved');
    }

    function handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const newState = JSON.parse(event.target.result);
                if (newState.changes) {
                    editorState.writeState(newState.changes);
                    shell.setStatus('Import erfolgreich', 'saved');
                    setTimeout(() => window.location.reload(), 1000);
                } else alert('Ungültiges Dateiformat');
            } catch (err) { alert('Fehler beim Lesen der Datei'); }
        };
        reader.readAsText(file);
    }

    editorState.on('change', (newState) => {
        state = newState;
        storyConfig = editorState.getEffectiveConfig();
        shell.updateStoryTitle(storyConfig.title);
        syncPanel();
        setupEditableListeners();
    });

    toggle.addEventListener('click', () => setActive(!active));
    window.addEventListener('scroll', () => {
        syncPanel();
        quickToolbar.style.display = 'none';
    }, { passive: true });

    document.addEventListener('click', (event) => {
        if (!quickToolbar.contains(event.target) && !event.target.hasAttribute('data-edit-path')) {
            quickToolbar.style.display = 'none';
        }
    });

    setActive(active);
}
