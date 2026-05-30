import { stripTags } from '../../core/Utils.js';

export class SectionPanel {
    constructor({ container, onAction }) {
        this.container = container;
        this.onAction = onAction;
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="editor-section-builder">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <strong>Sektionen verwalten</strong>
                    <button type="button" data-editor-action="add-section" style="padding: 4px 10px; font-size: 0.75rem;">+ Sektion</button>
                </div>
                <div class="editor-sections" id="editor-sections"></div>
            </div>
        `;
    }

    update(storyConfig, activeSectionIndex) {
        const sectionList = this.container.querySelector('#editor-sections');
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
}
