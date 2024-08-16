// ==UserScript==
// @name         Web Page Scribbler with Drawing, Eraser, and Color Picker
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Add and save scribbles and drawings with color selection, brush size adjustment via slider, and manual eraser on web pages. Includes a clickable author signature, language switcher, minimize/expand button, automatic tool switching, and autosave functionality. Tool state indication added.
// @author       Your Name
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Define language texts
    const languages = {
        en: {
            placeholder: 'Write your notes here...',
            clearNotes: 'Clear Notes',
            brushSize: 'Brush Size:',
            toggleDrawing: 'Toggle Drawing',
            toggleEraser: 'Toggle Eraser',
            clearDrawing: 'Clear Drawing',
            notesCleared: 'Notes cleared!',
            drawingEnabled: 'Drawing mode enabled. Click and drag to draw.',
            drawingDisabled: 'Drawing mode disabled.',
            eraserEnabled: 'Eraser mode enabled. Click and drag to erase.',
            eraserDisabled: 'Eraser mode disabled.',
            drawingCleared: 'Drawing cleared!',
            language: 'Language',
            author: 'Author',
            minimize: 'Minimize',
            maximize: 'Maximize'
        },
        ru: {
            placeholder: 'Напишите свою заметку здесь...',
            clearNotes: 'Очистить заметки',
            brushSize: 'Размер кисти:',
            toggleDrawing: 'Переключить рисование',
            toggleEraser: 'Переключить ластик',
            clearDrawing: 'Очистить рисунок',
            notesCleared: 'Заметки очищены!',
            drawingEnabled: 'Режим рисования включен. Кликайте и тяните для рисования.',
            drawingDisabled: 'Режим рисования отключен.',
            eraserEnabled: 'Режим ластика включен. Кликайте и тяните для стирания.',
            eraserDisabled: 'Режим ластика отключен.',
            drawingCleared: 'Рисунок очищен!',
            language: 'Язык',
            author: 'Автор',
            minimize: 'Свернуть',
            maximize: 'Развернуть'
        }
    };

    // Retrieve and set the current language
    const currentLanguage = localStorage.getItem('scribbler-language') || 'en';

    // Create and style the scribbling tool
    const style = document.createElement('style');
    style.textContent = `
        #scribbler-tool {
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 10px;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
            z-index: 9999;
            transition: transform 0.3s ease;
        }
        #scribbler-tool.minimized {
            transform: translateY(calc(100% + 10px));
        }
        #scribbler-tool textarea {
            width: 200px;
            height: 100px;
            margin-bottom: 10px;
        }
        #scribbler-tool button,
        #scribbler-tool input[type="color"],
        #scribbler-tool input[type="range"],
        #scribbler-tool select {
            padding: 5px 10px;
            margin: 2px;
            background: #007bff;
            color: #fff;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s ease;
        }
        #scribbler-tool button.active,
        #scribbler-tool input[type="color"]:active,
        #scribbler-tool input[type="range"]:active,
        #scribbler-tool select:active {
            background: #0056b3;
        }
        #brush-size-container {
            display: flex;
            align-items: center;
        }
        #brush-size-container input[type="range"] {
            width: 100px;
            margin-left: 10px;
        }
        #drawing-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9998;
        }
        #author-signature {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 5px 10px;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            cursor: pointer;
            font-size: 14px;
        }
        #author-signature:hover {
            background: #f0f0f0;
        }
        #language-switcher {
            margin-top: 10px;
        }
        #minimize-toggle {
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: #007bff;
            color: #fff;
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 16px;
            z-index: 10001;
        }
        #minimize-toggle:hover {
            background: #0056b3;
        }
    `;
    document.head.appendChild(style);

    // Create the scribbling tool interface
    const toolDiv = document.createElement('div');
    toolDiv.id = 'scribbler-tool';
    toolDiv.innerHTML = `
        <textarea placeholder="${languages[currentLanguage].placeholder}"></textarea>
        <button id="clear-scribbles">${languages[currentLanguage].clearNotes}</button>
        <input type="color" id="color-picker" value="#000000">
        <div id="brush-size-container">
            <label for="brush-size">${languages[currentLanguage].brushSize}</label>
            <input type="range" id="brush-size" min="1" max="50" value="5">
            <span id="brush-size-value">5</span>
        </div>
        <button id="draw-toggle">${languages[currentLanguage].toggleDrawing}</button>
        <button id="erase-toggle">${languages[currentLanguage].toggleEraser}</button>
        <button id="clear-drawing">${languages[currentLanguage].clearDrawing}</button>
        <div id="language-switcher">
            <label for="language-select">${languages[currentLanguage].language}:</label>
            <select id="language-select">
                <option value="en" ${currentLanguage === 'en' ? 'selected' : ''}>English</option>
                <option value="ru" ${currentLanguage === 'ru' ? 'selected' : ''}>Русский</option>
            </select>
        </div>
        <div id="author-signature">${languages[currentLanguage].author}</div>
    `;
    document.body.appendChild(toolDiv);

    // Add minimize/expand button
    const minimizeToggle = document.createElement('button');
    minimizeToggle.id = 'minimize-toggle';
    minimizeToggle.textContent = '→';  // Arrow indicating minimize
    document.body.appendChild(minimizeToggle);

    const textarea = document.querySelector('#scribbler-tool textarea');
    const clearNotesButton = document.querySelector('#clear-scribbles');
    const colorPicker = document.querySelector('#color-picker');
    const brushSizeInput = document.querySelector('#brush-size');
    const brushSizeValue = document.querySelector('#brush-size-value');
    const drawToggleButton = document.querySelector('#draw-toggle');
    const eraseToggleButton = document.querySelector('#erase-toggle');
    const clearDrawingButton = document.querySelector('#clear-drawing');
    const languageSelect = document.querySelector('#language-select');
    const authorSignature = document.querySelector('#author-signature');
    const scribblerTool = document.querySelector('#scribbler-tool');

    // Create and style the drawing canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'drawing-canvas';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let drawing = false;
    let currentColor = '#000000';
    let brushSize = parseInt(brushSizeInput.value);
    let eraserMode = false;
    let drawingMode = false;

    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Load saved scribbles
    const loadScribbles = () => {
        const savedScribbles = localStorage.getItem('scribbles-' + location.href);
        if (savedScribbles) {
            textarea.value = savedScribbles;
        }
    };

    // Load saved drawing
    const loadDrawing = () => {
        const savedDrawing = localStorage.getItem('drawing-' + location.href);
        if (savedDrawing) {
            const img = new Image();
            img.src = savedDrawing;
            img.onload = () => ctx.drawImage(img, 0, 0);
        }
    };

    loadScribbles();
    loadDrawing();

    // Auto-save function
    const autosave = () => {
        localStorage.setItem('scribbles-' + location.href, textarea.value);
        const dataURL = canvas.toDataURL();
        localStorage.setItem('drawing-' + location.href, dataURL);
    };

    // Clear scribbles
    clearNotesButton.addEventListener('click', () => {
        textarea.value = '';
        localStorage.removeItem('scribbles-' + location.href);
    });

    // Toggle drawing mode
    const toggleDrawing = () => {
        drawingMode = !drawingMode;
        canvas.style.pointerEvents = drawingMode ? 'auto' : 'none';
        drawToggleButton.classList.toggle('active', drawingMode);
        eraseToggleButton.classList.remove('active');
        if (eraserMode) toggleEraser(); // Ensure eraser is turned off
        alert(drawingMode ? languages[currentLanguage].drawingEnabled : languages[currentLanguage].drawingDisabled);
    };
    drawToggleButton.addEventListener('click', toggleDrawing);

    // Toggle eraser mode
    const toggleEraser = () => {
        eraserMode = !eraserMode;
        ctx.globalCompositeOperation = eraserMode ? 'destination-out' : 'source-over';
        canvas.style.pointerEvents = eraserMode ? 'auto' : 'none';
        eraseToggleButton.classList.toggle('active', eraserMode);
        drawToggleButton.classList.remove('active');
        if (drawingMode) toggleDrawing(); // Ensure drawing is turned off
        alert(eraserMode ? languages[currentLanguage].eraserEnabled : languages[currentLanguage].eraserDisabled);
    };
    eraseToggleButton.addEventListener('click', toggleEraser);

    // Clear drawing
    clearDrawingButton.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        localStorage.removeItem('drawing-' + location.href);
        alert(languages[currentLanguage].drawingCleared);
    });

    // Update brush size
    brushSizeInput.addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
        brushSizeValue.textContent = brushSize;
    });

    // Drawing and erasing functionality
    canvas.addEventListener('mousedown', (e) => {
        if (drawingMode || eraserMode) {
            drawing = true;
            ctx.moveTo(e.clientX, e.clientY);
            ctx.beginPath();
            ctx.strokeStyle = eraserMode ? 'rgba(0, 0, 0, 1)' : currentColor;
            ctx.lineWidth = brushSize;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (drawing) {
            ctx.lineTo(e.clientX, e.clientY);
            ctx.stroke();
            autosave();  // Autosave on every draw/erase
        }
    });

    canvas.addEventListener('mouseup', () => {
        drawing = false;
    });

    // Color picker functionality
    colorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
    });

    // Language switcher functionality
    languageSelect.addEventListener('change', (e) => {
        const newLanguage = e.target.value;
        localStorage.setItem('scribbler-language', newLanguage);
        location.reload();  // Reload the page to apply new language
    });

    // Author signature click event
    authorSignature.addEventListener('click', () => {
        window.open('https://vk.com/sergey_bessmertniy', '_blank');
    });

    // Minimize/Expand button functionality
    minimizeToggle.addEventListener('click', () => {
        const isMinimized = scribblerTool.classList.toggle('minimized');
        minimizeToggle.textContent = isMinimized ? '←' : '→';  // Arrow indicating expand/collapse
    });
})();
