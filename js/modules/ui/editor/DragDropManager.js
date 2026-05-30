export class DragDropManager {
    constructor({ shell, editorState, onDrop }) {
        this.shell = shell;
        this.editorState = editorState;
        this.onDrop = onDrop;
        this.currentDragData = null;
        this.setupListeners();
    }

    setupListeners() {
        this.shell.addEventListener('dragstart', (event) => this.handleDragStart(event));
        this.shell.addEventListener('dragend', () => this.handleDragEnd());

        // Panels
        const elementList = this.shell.querySelector('#editor-elements');
        const sectionList = this.shell.querySelector('#editor-sections');

        if (elementList) {
            elementList.addEventListener('dragover', (e) => this.handlePanelDragOver(e, elementList, 'element'));
            elementList.addEventListener('dragleave', (e) => this.handlePanelDragLeave(e, elementList));
            elementList.addEventListener('drop', (e) => this.handlePanelDrop(e, elementList, 'element'));
        }

        if (sectionList) {
            sectionList.addEventListener('dragover', (e) => this.handlePanelDragOver(e, sectionList, 'section'));
            sectionList.addEventListener('dragleave', (e) => this.handlePanelDragLeave(e, sectionList));
            sectionList.addEventListener('drop', (e) => this.handlePanelDrop(e, sectionList, 'section'));
        }

        // Story interactions
        document.addEventListener('dragenter', (e) => this.handleStoryDragEnter(e));
        document.addEventListener('dragover', (e) => this.handleStoryDragOver(e));
        document.addEventListener('drop', (e) => this.handleStoryDrop(e));
    }

    handleDragStart(event) {
        const paletteItem = event.target.closest('[data-editor-drag-type]');
        if (paletteItem) {
            this.writeDragData(event, { kind: 'palette', type: paletteItem.dataset.editorDragType });
            return;
        }

        const elementItem = event.target.closest('.editor-element-item');
        if (elementItem) {
            const sectionSelect = this.shell.querySelector('#editor-section');
            this.writeDragData(event, {
                kind: 'element',
                fromSectionIndex: Number(sectionSelect.value),
                elementIndex: Number(elementItem.dataset.elementIndex)
            });
            elementItem.classList.add('is-dragging');
            return;
        }

        const sectionItem = event.target.closest('.editor-section-item');
        if (sectionItem) {
            this.writeDragData(event, {
                kind: 'section',
                fromIndex: Number(sectionItem.dataset.sectionIndex)
            });
            sectionItem.classList.add('is-dragging');
        }
    }

    handleDragEnd() {
        this.shell.querySelectorAll('.is-dragging, .is-drop-target').forEach((node) => {
            node.classList.remove('is-dragging', 'is-drop-target');
        });
        document.querySelectorAll('.step.editor-drop-target').forEach(s => s.classList.remove('editor-drop-target'));
        document.querySelectorAll('.editor-drop-indicator').forEach(i => i.remove());
        this.currentDragData = null;
    }

    writeDragData(event, data) {
        this.currentDragData = data;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/json', JSON.stringify(data));
        event.dataTransfer.setData('text/plain', JSON.stringify(data));
    }

    readDragData(event) {
        if (this.currentDragData) return this.currentDragData;
        const raw = event.dataTransfer.getData('application/json') || event.dataTransfer.getData('text/plain');
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (error) {
            return null;
        }
    }

    handlePanelDragOver(event, container, kind) {
        const data = this.readDragData(event);
        if (!data) return;
        if (kind === 'element' && (data.kind !== 'palette' && data.kind !== 'element')) return;
        if (kind === 'section' && data.kind !== 'section') return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        container.querySelectorAll('.editor-drop-indicator').forEach(i => i.remove());
        
        if (kind === 'element') {
            const insertIndex = this.getDropElementIndex(event, container);
            const items = container.querySelectorAll('.editor-element-item');
            const indicator = this.createIndicator();
            if (insertIndex !== null && insertIndex < items.length) {
                items[insertIndex].before(indicator);
            } else {
                container.appendChild(indicator);
            }
        } else {
            container.classList.add('is-drop-target');
        }
    }

    handlePanelDragLeave(event, container) {
        if (!container.contains(event.relatedTarget)) {
            container.querySelectorAll('.editor-drop-indicator').forEach(i => i.remove());
            container.classList.remove('is-drop-target');
        }
    }

    handlePanelDrop(event, container, kind) {
        const data = this.readDragData(event);
        if (!data) return;
        event.preventDefault();
        container.querySelectorAll('.editor-drop-indicator').forEach(i => i.remove());
        container.classList.remove('is-drop-target');

        if (kind === 'element') {
            const insertIndex = this.getDropElementIndex(event, container);
            this.onDrop({ ...data, toInsertIndex: insertIndex, target: 'panel-elements' });
        } else {
            const insertIndex = this.getDropSectionIndex(event, container);
            this.onDrop({ ...data, toIndex: insertIndex, target: 'panel-sections' });
        }
    }

    handleStoryDragEnter(event) {
        if (!this.currentDragData) return;
        if (this.currentDragData.kind === 'palette' || this.currentDragData.kind === 'element') {
            const step = event.target.closest('.step');
            if (step) event.preventDefault();
        }
    }

    handleStoryDragOver(event) {
        if (!this.currentDragData) return;
        if (this.currentDragData.kind !== 'palette' && this.currentDragData.kind !== 'element') return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        const step = event.target.closest('.step');
        if (step) {
            document.querySelectorAll('.step.editor-drop-target').forEach(s => s.classList.remove('editor-drop-target'));
            step.classList.add('editor-drop-target');
            
            document.querySelectorAll('.editor-drop-indicator').forEach(i => i.remove());
            const insertIndex = this.getDropElementIndexInStory(event, step);
            const textBox = step.querySelector('.text-box');
            if (textBox) {
                const indicator = this.createIndicator();
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

    handleStoryDrop(event) {
        if (!this.currentDragData) return;
        const step = event.target.closest('.step');
        if (step) {
            event.preventDefault();
            const insertIndex = this.getDropElementIndexInStory(event, step);
            this.onDrop({ 
                ...this.currentDragData, 
                toSectionIndex: Number(step.dataset.sectionIndex), 
                toInsertIndex: insertIndex,
                target: 'story' 
            });
        }
        this.handleDragEnd();
    }

    getDropElementIndex(event, container) {
        const item = event.target.closest('.editor-element-item');
        if (!item) return null;
        const rect = item.getBoundingClientRect();
        const itemIndex = Number(item.dataset.elementIndex);
        return event.clientY > rect.top + rect.height / 2 ? itemIndex + 1 : itemIndex;
    }

    getDropSectionIndex(event, container) {
        const item = event.target.closest('.editor-section-item');
        if (!item) return null;
        const rect = item.getBoundingClientRect();
        const itemIndex = Number(item.dataset.sectionIndex);
        return event.clientY > rect.top + rect.height / 2 ? itemIndex + 1 : itemIndex;
    }

    getDropElementIndexInStory(event, step) {
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

    createIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'editor-drop-indicator';
        indicator.style.margin = '4px 0';
        return indicator;
    }

    setupStoryElementDraggable(node, sectionIndex, elementIndex) {
        node.draggable = true;
        node.addEventListener('dragstart', (event) => {
            this.writeDragData(event, {
                kind: 'element',
                fromSectionIndex: sectionIndex,
                elementIndex: elementIndex
            });
            node.classList.add('is-dragging-story');
            event.stopPropagation();
        });
        node.addEventListener('dragend', () => {
            node.classList.remove('is-dragging-story');
            this.handleDragEnd();
        });
    }
}
