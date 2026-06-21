(function() {
    "use strict";

    // DOM Elements
    const fileInput = document.getElementById('sourceFileInput');
    const fileStatus = document.getElementById('fileStatus');
    const fromFormat = document.getElementById('fromFormat');
    const toFormat = document.getElementById('toFormat');
    const qualitySelect = document.getElementById('qualitySelect');
    const fpsSelect = document.getElementById('fpsSelect');
    const durationSlider = document.getElementById('durationSlider');
    const durationVal = document.getElementById('durationVal');
    const convertBtn = document.getElementById('convertBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('canvasOverlay');
    const layerInfo = document.getElementById('layerInfo');
    const progressEl = document.getElementById('exportProgress');

    // State
    let currentFile = null;
    let convertedBlob = null;
    let convertedFileName = '';
    let isConverting = false;

    // Update duration label
    durationSlider.addEventListener('input', () => {
        durationVal.textContent = durationSlider.value;
    });

    // File upload
    document.getElementById('fileUploadArea').addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            currentFile = e.target.files[0];
            convertedBlob = null;
            downloadBtn.disabled = true;
            updateFileStatus(currentFile);
            showPreview(currentFile);
            progressEl.className = 'progress-hidden';
            progressEl.textContent = '';
        }
    });

    // Drag and drop
    const dropArea = document.querySelector('.canvas-wrapper');
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.style.border = '2px solid #64c8ff';
    });
    dropArea.addEventListener('dragleave', () => {
        dropArea.style.border = 'none';
    });
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.style.border = 'none';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            currentFile = files[0];
            convertedBlob = null;
            downloadBtn.disabled = true;
            updateFileStatus(currentFile);
            showPreview(currentFile);
            progressEl.className = 'progress-hidden';
            progressEl.textContent = '';
            const dt = new DataTransfer();
            dt.items.add(currentFile);
            fileInput.files = dt.files;
        }
    });

    function updateFileStatus(file) {
        if (file) {
            const size = (file.size / 1024 / 1024).toFixed(2);
            fileStatus.textContent = `📁 ${file.name} (${size} MB)`;
            const ext = file.name.split('.').pop().toLowerCase();
            if (['mp4', 'webm', 'mp3', 'wav', 'ogg'].includes(ext)) {
                fromFormat.value = ext;
            } else {
                fromFormat.value = 'auto';
            }
            layerInfo.textContent = `Файл: ${file.name} | Размер: ${size} MB`;
            overlay.classList.add('hidden');
        } else {
            fileStatus.textContent = 'Файл не выбран';
            layerInfo.textContent = 'Файл: — | Размер: —';
            overlay.classList.remove('hidden');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            convertedBlob = null;
            downloadBtn.disabled = true;
        }
    }

    function showPreview(file) {
        const type = file.type;
        if (type.startsWith('video/')) {
            const url = URL.createObjectURL(file);
            const video = document.createElement('video');
            video.src = url;
            video.muted = true;
            video.onloadeddata = function() {
                canvas.width = Math.min(video.videoWidth, 1280);
                canvas.height = Math.min(video.videoHeight, 720);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
            };
            video.load();
            setTimeout(() => {
                if (canvas.width === 1280 && canvas.height === 720) {
                    ctx.fillStyle = '#141824';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#64c8ff';
                    ctx.font = '22px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('🎬 Видео загружено', canvas.width/2, canvas.height/2);
                }
            }, 1000);
        } else if (type.startsWith('audio/')) {
            ctx.fillStyle = '#0f121b';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#64c8ff';
            ctx.font = '28px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🎵 Аудиофайл загружен', canvas.width/2, canvas.height/2 - 20);
            ctx.font = '16px Inter, sans-serif';
            ctx.fillStyle = '#8a9bb0';
            ctx.fillText('Для конвертации нажмите "Конвертировать"', canvas.width/2, canvas.height/2 + 30);
        }
    }

    // ===== Конвертация видео в GIF через gifshot =====
    async function convertVideoToGif(videoFile, fps, duration, quality) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const url = URL.createObjectURL(videoFile);
            video.src = url;
            video.muted = true;
            video.crossOrigin = 'anonymous';

            video.onloadeddata = function() {
                // Ограничиваем размер для GIF
                const maxWidth = 480;
                const maxHeight = 360;
                let width = video.videoWidth;
                let height = video.videoHeight;
                
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = Math.round(width * (maxHeight / height));
                    height = maxHeight;
                }

                const totalFrames = Math.min(Math.floor(duration * fps), 150);
                const frameDelay = Math.floor(1000 / fps);

                const captureCanvas = document.createElement('canvas');
                captureCanvas.width = width;
                captureCanvas.height = height;
                const captureCtx = captureCanvas.getContext('2d');

                let images = [];
                let currentFrame = 0;

                function captureFrame() {
                    if (currentFrame >= totalFrames || video.ended) {
                        // Создаем GIF через gifshot
                        createGifWithGifshot(images, frameDelay, quality, resolve, reject);
                        return;
                    }

                    const progress = Math.round((currentFrame / totalFrames) * 50);
                    progressEl.textContent = `🎬 Захват кадров: ${progress}%`;

                    captureCtx.drawImage(video, 0, 0, width, height);
                    const img = new Image();
                    img.src = captureCanvas.toDataURL('image/png');
                    images.push(img);

                    currentFrame++;
                    video.currentTime = currentFrame / fps;
                }

                video.onseeked = function() {
                    captureFrame();
                };

                video.play().then(() => {
                    video.pause();
                    captureFrame();
                }).catch(reject);
            };

            video.onerror = reject;
            video.load();
        });
    }

    // ===== Создание GIF через gifshot =====
    function createGifWithGifshot(images, delay, quality, resolve, reject) {
        progressEl.textContent = '🎞️ Сборка GIF...';

        // Проверяем наличие gifshot
        if (typeof gifshot === 'undefined') {
            reject(new Error('Библиотека gifshot не загружена'));
            return;
        }

        const qualityMap = {
            'low': 20,
            'medium': 10,
            'high': 3
        };

        // Подготавливаем изображения для gifshot
        const imageElements = [];
        let loadedCount = 0;

        images.forEach((img, index) => {
            const newImg = new Image();
            newImg.onload = function() {
                loadedCount++;
                const progress = Math.round(50 + (loadedCount / images.length) * 40);
                progressEl.textContent = `🖼️ Загрузка кадров: ${progress}%`;
                
                if (loadedCount === images.length) {
                    // Все изображения загружены, создаем GIF
                    const options = {
                        images: imageElements,
                        gifWidth: images[0].width || 480,
                        gifHeight: images[0].height || 360,
                        frameDuration: delay / 10, // gifshot использует десятые доли секунды
                        sampleInterval: qualityMap[quality] || 10,
                        numWorkers: 2,
                        backgroundColor: '#000000',
                        transparent: null
                    };

                    gifshot.createGIF(options, function(obj) {
                        if (!obj.error) {
                            progressEl.textContent = '✅ GIF готов!';
                            // Конвертируем base64 в Blob
                            fetch(obj.image)
                                .then(res => res.blob())
                                .then(blob => {
                                    resolve(blob);
                                })
                                .catch(reject);
                        } else {
                            reject(new Error('Ошибка создания GIF: ' + obj.error));
                        }
                    });
                }
            };
            newImg.onerror = function() {
                loadedCount++;
                if (loadedCount === images.length) {
                    // Если все загрузить не удалось, все равно пробуем создать GIF
                    const options = {
                        images: imageElements.filter(img => img.complete && img.naturalWidth > 0),
                        gifWidth: 480,
                        gifHeight: 360,
                        frameDuration: delay / 10,
                        sampleInterval: qualityMap[quality] || 10,
                        backgroundColor: '#000000'
                    };

                    if (options.images.length === 0) {
                        reject(new Error('Не удалось загрузить ни одного кадра'));
                        return;
                    }

                    gifshot.createGIF(options, function(obj) {
                        if (!obj.error) {
                            fetch(obj.image)
                                .then(res => res.blob())
                                .then(blob => resolve(blob))
                                .catch(reject);
                        } else {
                            reject(new Error('Ошибка создания GIF: ' + obj.error));
                        }
                    });
                }
            };
            newImg.src = img.src;
            imageElements.push(newImg);
        });

        // Если изображений нет
        if (images.length === 0) {
            reject(new Error('Нет кадров для создания GIF'));
        }
    }

    // ===== Конвертация видео в WebM =====
    async function convertVideoToWebM(videoFile, fps, duration) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const url = URL.createObjectURL(videoFile);
            video.src = url;
            video.muted = true;

            video.onloadeddata = function() {
                const width = Math.min(video.videoWidth, 640);
                const height = Math.min(video.videoHeight, 480);
                const totalFrames = Math.min(Math.floor(duration * fps), 300);

                const captureCanvas = document.createElement('canvas');
                captureCanvas.width = width;
                captureCanvas.height = height;
                const captureCtx = captureCanvas.getContext('2d');

                // Создаем stream для записи
                const stream = captureCanvas.captureStream(fps);
                const recorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm',
                    videoBitsPerSecond: 5000000
                });

                const chunks = [];
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    resolve(blob);
                };

                recorder.start();

                let currentFrame = 0;

                function captureFrame() {
                    if (currentFrame >= totalFrames || video.ended) {
                        recorder.stop();
                        return;
                    }

                    const progress = Math.round((currentFrame / totalFrames) * 100);
                    progressEl.textContent = `🎬 Запись WebM: ${progress}%`;

                    captureCtx.drawImage(video, 0, 0, width, height);
                    currentFrame++;
                    video.currentTime = currentFrame / fps;
                }

                video.onseeked = function() {
                    captureFrame();
                };

                video.play().then(() => {
                    video.pause();
                    captureFrame();
                }).catch(reject);
            };

            video.onerror = reject;
            video.load();
        });
    }

    // ===== Конвертация аудио в WAV =====
    async function convertAudioToWav(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const audioBuffer = await audioContext.decodeAudioData(e.target.result);
                    const wavBlob = createWavBlob(audioBuffer);
                    resolve(wavBlob);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    function createWavBlob(audioBuffer) {
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const length = audioBuffer.length * numChannels * 2;
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * 2, true);
        view.setUint16(32, numChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, length, true);

        const offset = 44;
        let pos = 0;
        for (let i = 0; i < audioBuffer.length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = audioBuffer.getChannelData(channel)[i];
                const int16 = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
                view.setInt16(offset + pos, int16, true);
                pos += 2;
            }
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // ===== Главная функция конвертации =====
    async function performConversion() {
        if (!currentFile) {
            alert('Сначала загрузите файл!');
            return;
        }

        if (isConverting) {
            alert('Конвертация уже выполняется');
            return;
        }

        const to = toFormat.value;
        const quality = qualitySelect.value;
        const fps = parseInt(fpsSelect.value);
        const duration = parseInt(durationSlider.value);

        isConverting = true;
        convertBtn.disabled = true;
        progressEl.className = 'progress-visible';
        progressEl.textContent = '⏳ Подготовка...';

        try {
            let blob = null;
            let ext = to;

            if (to === 'gif' && currentFile.type.startsWith('video/')) {
                blob = await convertVideoToGif(currentFile, fps, duration, quality);
                ext = 'gif';
            } else if (to === 'webm' && currentFile.type.startsWith('video/')) {
                blob = await convertVideoToWebM(currentFile, fps, duration);
                ext = 'webm';
            } else if (to === 'wav' && currentFile.type.startsWith('audio/')) {
                blob = await convertAudioToWav(currentFile);
                ext = 'wav';
            } else {
                // Для остальных форматов возвращаем оригинал
                const reader = new FileReader();
                blob = await new Promise((resolve) => {
                    reader.onload = (e) => {
                        const mimeMap = {
                            'mp4': 'video/mp4',
                            'webm': 'video/webm',
                            'gif': 'image/gif',
                            'mp3': 'audio/mpeg',
                            'wav': 'audio/wav',
                            'ogg': 'audio/ogg'
                        };
                        const mime = mimeMap[to] || 'application/octet-stream';
                        resolve(new Blob([e.target.result], { type: mime }));
                    };
                    reader.readAsArrayBuffer(currentFile);
                });
                ext = to;
            }

            if (blob) {
                convertedBlob = blob;
                convertedFileName = `converted_${Date.now()}.${ext}`;
                downloadBtn.disabled = false;
                progressEl.className = 'progress-hidden';
                progressEl.textContent = '✅ Конвертация завершена!';
                
                // Показываем превью
                if (ext === 'gif' || ext === 'mp4' || ext === 'webm') {
                    const url = URL.createObjectURL(blob);
                    const vid = document.createElement('video');
                    vid.src = url;
                    vid.onloadeddata = function() {
                        canvas.width = vid.videoWidth || 640;
                        canvas.height = vid.videoHeight || 360;
                        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                        URL.revokeObjectURL(url);
                    };
                    vid.load();
                } else {
                    ctx.fillStyle = '#0f121b';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#64c8ff';
                    ctx.font = '24px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(`✅ Конвертировано в ${to.toUpperCase()}`, canvas.width/2, canvas.height/2);
                }
            }
        } catch (err) {
            console.error('Conversion error:', err);
            progressEl.textContent = '❌ Ошибка конвертации';
            progressEl.className = 'progress-hidden';
            alert('Ошибка при конвертации: ' + err.message);
        } finally {
            isConverting = false;
            convertBtn.disabled = false;
        }
    }

    // ===== Event Listeners =====
    convertBtn.addEventListener('click', performConversion);

    resetBtn.addEventListener('click', () => {
        currentFile = null;
        convertedBlob = null;
        downloadBtn.disabled = true;
        fileInput.value = '';
        updateFileStatus(null);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        progressEl.className = 'progress-hidden';
        progressEl.textContent = '';
        overlay.classList.remove('hidden');
    });

    downloadBtn.addEventListener('click', () => {
        if (!convertedBlob) {
            alert('Сначала выполните конвертацию');
            return;
        }
        const link = document.createElement('a');
        link.href = URL.createObjectURL(convertedBlob);
        link.download = convertedFileName || `converted_${Date.now()}.bin`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    });

    toFormat.addEventListener('change', () => {
        convertedBlob = null;
        downloadBtn.disabled = true;
        progressEl.className = 'progress-hidden';
        progressEl.textContent = 'Формат изменён, конвертируйте заново';
    });

    // Initial state
    updateFileStatus(null);
    overlay.classList.remove('hidden');

    console.log('ConvertPro ready!');
})();