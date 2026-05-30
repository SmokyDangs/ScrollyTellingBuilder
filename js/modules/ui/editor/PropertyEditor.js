import { iconLibrary } from '../../storyRenderer.js';

export class PropertyEditor {
    constructor({ container, editorState, onAction }) {
        this.container = container;
        this.editorState = editorState;
        this.onAction = onAction;
    }

    render(element, elementIndex, sectionIndex, storyConfig) {
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

        this.container.innerHTML = html;
        this.setupEventListeners(element, elementIndex, sectionIndex, storyConfig);
    }

    setupEventListeners(element, elementIndex, sectionIndex, storyConfig) {
        this.container.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('change', () => {
                const path = input.dataset.propPath;
                let value;
                if (input.type === 'number') value = Number(input.value);
                else if (input.type === 'checkbox') value = input.checked;
                else value = input.value;
                this.editorState.updatePath(path, value);
            });
        });

        this.container.querySelector('.add-chart-item')?.addEventListener('click', (e) => {
            const path = e.target.dataset.path;
            const currentItems = this.editorState.getValue(path) || [];
            this.editorState.updatePath(path, [...currentItems, { label: 'Neu', value: 50, color: '#ff4444' }]);
            this.render(element, elementIndex, sectionIndex, storyConfig); // Refresh form
        });

        this.container.querySelectorAll('.delete-chart-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const path = btn.dataset.path;
                const index = parseInt(btn.dataset.index, 10);
                const currentItems = this.editorState.getValue(path) || [];
                this.editorState.updatePath(path, currentItems.filter((_, i) => i !== index));
                this.render(element, elementIndex, sectionIndex, storyConfig); // Refresh form
            });
        });

        this.container.querySelectorAll('.icon-picker-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const path = btn.dataset.propPath;
                const value = btn.dataset.value;
                this.editorState.updatePath(path, value);
                
                // Update active state visually immediately
                this.container.querySelectorAll('.icon-picker-btn').forEach(b => b.classList.remove('is-active'));
                btn.classList.add('is-active');
            });
        });
    }
}
