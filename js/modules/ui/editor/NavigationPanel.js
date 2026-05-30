import { stripTags } from '../../core/Utils.js';

export class NavigationPanel {
    constructor({ container, onAction }) {
        this.container = container;
        this.onAction = onAction;
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="editor-section-builder">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <strong>Kapitel (Navbar)</strong>
                    <button type="button" data-editor-action="add-nav-item" style="padding: 4px 10px; font-size: 0.75rem;">+ Kapitel</button>
                </div>
                <div class="editor-nav" id="editor-nav"></div>
            </div>
        `;
    }

    update(storyConfig) {
        const navList = this.container.querySelector('#editor-nav');
        if (!navList) return;

        const navItems = storyConfig.nav || [];
        navList.innerHTML = navItems.map((item, index) => {
            const targetSectionMatch = item.href?.match(/#s(\d+)/);
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
                this.onAction('update-nav-item', { 
                    index: navIndex, 
                    prop, 
                    value: input.value 
                });
            });
        });
    }
}
