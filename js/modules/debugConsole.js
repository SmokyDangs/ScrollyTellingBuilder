(function() {
    const consoleDiv = document.createElement('div');
    consoleDiv.id = 'debug-console';
    consoleDiv.innerHTML = `
        <div id="debug-console-header">
            <strong id="debug-console-title" style="cursor:pointer;">Debug Console (-)</strong>
            <div>
                <button id="debug-console-copy" style="cursor:pointer; font-size: 0.7rem;">Copy</button>
                <button id="debug-console-clear" style="cursor:pointer; font-size: 0.7rem;">Clear</button>
            </div>
        </div>
        <div id="debug-console-logs"></div>
    `;
    document.body.appendChild(consoleDiv);

    const logContainer = document.getElementById('debug-console-logs');
    const header = document.getElementById('debug-console-header');
    const title = document.getElementById('debug-console-title');
    let isMinimized = false;

    header.addEventListener('click', () => {
        isMinimized = !isMinimized;
        consoleDiv.classList.toggle('minimized', isMinimized);
        title.textContent = isMinimized ? 'Debug Console (+)' : 'Debug Console (-)';
    });
// ... rest of file

    function addLog(type, args) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        const logEntry = document.createElement('div');
        logEntry.style.color = type === 'error' ? '#f00' : (type === 'warn' ? '#ff0' : '#0f0');
        logEntry.textContent = `[${type.toUpperCase()}] ${new Date().toLocaleTimeString()} ${message}`;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => { originalLog.apply(console, args); addLog('log', args); };
    console.warn = (...args) => { originalWarn.apply(console, args); addLog('warn', args); };
    console.error = (...args) => { originalError.apply(console, args); addLog('error', args); };

    window.addEventListener('error', (event) => {
        addLog('error', [event.message, 'at', event.filename, ':', event.lineno]);
    });

    document.getElementById('debug-console-copy').addEventListener('click', () => {
        navigator.clipboard.writeText(logContainer.textContent);
        alert('Logs copied to clipboard');
    });

    document.getElementById('debug-console-clear').addEventListener('click', () => {
        logContainer.innerHTML = '';
    });
})();
