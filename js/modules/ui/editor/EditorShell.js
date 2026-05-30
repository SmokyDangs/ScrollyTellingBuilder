import { stripTags } from '../../core/Utils.js';

export class EditorShell {
    constructor({ storyConfig, onTabChange, onAction }) {
        this.storyConfig = storyConfig;
        this.onTabChange = onTabChange;
        this.onAction = onAction;
        this.element = this.createShell();
        this.statusTimer = null;
    }

    createShell() {
        const shell = document.createElement('aside');
        shell.className = 'editor-panel';
        shell.innerHTML = `
            <div class="editor-panel-head">
                <div>
                    <strong>Editor</strong>
                    <span id="editor-story-title">${this.storyConfig.title}</span>
                </div>
                <span class="editor-save-state" id="editor-save-state">Bereit</span>
            </div>
            
            <div class="editor-tabs">
                <button type="button" class="editor-tab-btn is-active" data-tab="current">Inhalt</button>
                <button type="button" class="editor-tab-btn" data-tab="structure">Sektionen</button>
                <button type="button" class="editor-tab-btn" data-tab="navigation">Kapitel</button>
            </div>

            <div class="editor-tab-content is-active" data-tab-id="current">
                <div id="content-panel-root"></div>
            </div>

            <div class="editor-tab-content" data-tab-id="structure">
                <div id="section-panel-root"></div>
            </div>

            <div class="editor-tab-content" data-tab-id="navigation">
                <div id="navigation-panel-root"></div>
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
                    <button type="button" data-editor-action="import-json">Import JSON</button>
                    <button type="button" data-editor-action="reset-all">Reset All</button>
                </div>
                <textarea id="editor-export" readonly aria-label="Editor Export"></textarea>
            </div>
        `;

        this.setupEventListeners(shell);
        return shell;
    }

    setupEventListeners(shell) {
        shell.querySelectorAll('.editor-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                this.setActiveTab(tabId);
                if (this.onTabChange) this.onTabChange(tabId);
            });
        });

        shell.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-editor-action]');
            if (actionBtn) {
                const action = actionBtn.dataset.editorAction;
                this.onAction(action, actionBtn.dataset);
            }
        });
    }

    setActiveTab(tabId) {
        this.element.querySelectorAll('.editor-tab-btn').forEach(b => {
            b.classList.toggle('is-active', b.dataset.tab === tabId);
        });
        this.element.querySelectorAll('.editor-tab-content').forEach(c => {
            c.classList.toggle('is-active', c.dataset.tabId === tabId);
        });
    }

    setStatus(message, tone = 'neutral') {
        const saveState = this.element.querySelector('#editor-save-state');
        saveState.textContent = message;
        saveState.dataset.tone = tone;
        if (this.statusTimer) clearTimeout(this.statusTimer);
        if (tone !== 'neutral') {
            this.statusTimer = setTimeout(() => {
                saveState.textContent = 'Bereit';
                saveState.dataset.tone = 'neutral';
            }, 2200);
        }
    }

    updateStoryTitle(title) {
        this.element.querySelector('#editor-story-title').textContent = title;
    }

    setHasProperties(hasProps) {
        this.element.classList.toggle('has-properties', hasProps);
    }
}
