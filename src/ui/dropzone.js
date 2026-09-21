// src/ui/dropzone.js
export function setupDropzone({ overlayEl, inputDrop, inputReplace, onFile }) {

    async function handleFile(file) {
        if (!file) return;
        onFile(file);
    }

    // Drag-over anywhere on the window
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('dragleave', () => {});
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        const f = e.dataTransfer?.files?.[0];
        if (f) handleFile(f);
    });

    // Click on overlay input
    inputDrop.addEventListener('change', (e) => {
        const f = e.target.files?.[0];
        if (f) handleFile(f);
        e.target.value = '';
    });

    // Replace button
    inputReplace.addEventListener('change', (e) => {
        const f = e.target.files?.[0];
        if (f) handleFile(f);
        e.target.value = '';
    });
}
