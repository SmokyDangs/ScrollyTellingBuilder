import { stripTags } from '../../core/Utils.js';

export class ContentPanel {
    constructor({ container, modelOptions, onAction }) {
        this.container = container;
        this.modelOptions = modelOptions;
        this.onAction = onAction;
        this.render();
    }

    render() {
        this.container.innerHTML = `
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
                <input id="editor-model-file" type="file" accept=".glb,model/gltf-binary" style="display:none">
                <span>GLB-Datei ablegen</span>
                <small>ersetzt das Modell der gewaehlten Sektion</small>
            </div>
            <p class="editor-file-status" id="editor-file-status"></p>
            
            <div class="editor-actions">
                <button type="button" data-editor-action="reset-model">Modell reset</button>
            </div>
        `;

        this.setupEventListeners();
        this.populateModelSelect();
    }

    setupEventListeners() {
        const sectionSelect = this.container.querySelector('#editor-section');
        sectionSelect.addEventListener('change', () => {
            this.onAction('change-section', { sectionIndex: sectionSelect.value });
        });

        const modelSelect = this.container.querySelector('#editor-model');
        modelSelect.addEventListener('change', () => {
            this.onAction('change-model', { modelId: modelSelect.value });
        });

        const uploadZone = this.container.querySelector('#editor-upload');
        const fileInput = this.container.querySelector('#editor-model-file');
        uploadZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files?.length) {
                this.onAction('upload-model', { file: fileInput.files[0] });
            }
        });

        // Drag and drop for upload zone
        ['dragenter', 'dragover'].forEach(name => {
            uploadZone.addEventListener(name, (e) => {
                e.preventDefault();
                uploadZone.classList.add('is-dragging');
            });
        });
        ['dragleave', 'drop'].forEach(name => {
            uploadZone.addEventListener(name, (e) => {
                e.preventDefault();
                uploadZone.classList.remove('is-dragging');
            });
        });
        uploadZone.addEventListener('drop', (e) => {
            if (e.dataTransfer?.files?.length) {
                this.onAction('upload-model', { file: e.dataTransfer.files[0] });
            }
        });
    }

    populateModelSelect() {
        const modelSelect = this.container.querySelector('#editor-model');
        modelSelect.innerHTML = '';
        [{ id: '', label: 'Standardmodell' }, ...this.modelOptions].forEach((model) => {
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

    update(storyConfig, activeSectionIndex, editorState) {
        const sectionSelect = this.container.querySelector('#editor-section');
        const modelSelect = this.container.querySelector('#editor-model');
        const currentInfo = this.container.querySelector('#editor-current');
        const fileStatus = this.container.querySelector('#editor-file-status');
        const elementList = this.container.querySelector('#editor-elements');

        // Update Section Select
        sectionSelect.innerHTML = storyConfig.sections.map((section, index) => `
            <option value="${index}" ${index === activeSectionIndex ? 'selected' : ''}>
                ${stripTags(section.title)}
            </option>
        `).join('');

        // Update Info
        const section = storyConfig.sections[activeSectionIndex];
        const title = stripTags(section?.title) || `Sektion ${activeSectionIndex + 1}`;
        currentInfo.innerHTML = `
            <span>Aktive Sektion</span>
            <strong>${activeSectionIndex + 1}. ${title.replace(/^\d+\.\s*/, '')}</strong>
        `;

        // Update Model Select
        const state = editorState.state;
        modelSelect.value = state.uploadedModels?.[activeSectionIndex] ? '__uploaded' : state.models?.[activeSectionIndex] || '';
        
        fileStatus.textContent = state.uploadedModels?.[activeSectionIndex]?.name
            ? `Aktiv: ${state.uploadedModels[activeSectionIndex].name}`
            : '';

        // Update Element List
        this.renderElementList(elementList, section?.elements || []);
    }

    renderElementList(container, elements) {
        if (!elements.length) {
            container.innerHTML = '<p>Keine Elemente in dieser Sektion.</p>';
            return;
        }

        container.innerHTML = elements.map((element, index) => `
            <div class="editor-element-item" draggable="true" data-element-index="${index}">
                <span class="editor-drag-handle" aria-hidden="true">::</span>
                <span>${index + 1}. ${this.getElementLabel(element)}</span>
                <div class="editor-element-actions" style="display: flex; gap: 4px;">
                    <button type="button" data-editor-action="edit-properties" data-element-index="${index}" style="min-width: 42px;">Edit</button>
                    <button type="button" data-editor-action="delete-element" data-element-index="${index}" style="min-width: 42px;">Del</button>
                </div>
            </div>
        `).join('');
    }

    getElementLabel(element) {
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
}
