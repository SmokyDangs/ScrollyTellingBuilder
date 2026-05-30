export function stripTags(value = '') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = value;
    return wrapper.textContent || wrapper.innerText || '';
}

export function cloneConfig(config) {
    return JSON.parse(JSON.stringify(config));
}

export function setDeepValue(target, path, value) {
    let cursor = target;
    const keys = path.split('.');
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        
        if (cursor[key] === undefined || cursor[key] === null || typeof cursor[key] !== 'object') {
            const nextKey = keys[i + 1];
            cursor[key] = /^\d+$/.test(nextKey) ? [] : {};
        }
        cursor = cursor[key];
    }
    
    console.log('Setting path', path, 'to', value);
    cursor[keys[keys.length - 1]] = value;
}
