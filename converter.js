(function() {
    "use strict";

    // DOM Elements
    const fileInput = document.getElementById('sourceFileInput');
    const fileStatus = document.getElementById('fileStatus');
    const fromFormat = document.getElementById('fromFormat');
    const toFormat = document.getElementById('toFormat');
    const qualitySelect = document.getElementById('qualitySelect');
    const fpsSelect = document.getElementById('fpsSelect');
    const sizeSelect = document.getElementById('sizeSelect');
    const startTimeSlider = document.getElementById('startTimeSlider');
    const startTimeVal = document.getElementById('startTimeVal');
    const durationSlider = document.getElementById('durationSlider');
    const durationVal = document.getElementById('durationVal');
    const convertBtn = document.getElementById('convertBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const previewSelectionBtn = document.getElementById('previewSelectionBtn');
    const stopPreviewBtn = document.getElementById('stopPreviewBtn');
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
    let previewVideo = null;
    let previewInterval = null;
    let isPreviewing = false;

    // Size presets
    const sizePresets = {
        'small': { width: 320, height: 240 },
        'medium': { width: 480, height: 360 },
        'large': { width: 640, height: 480 }
    };

    // Update labels
    startTimeSlider.addEventListener('input', () => {
        startTimeVal.textContent = startTimeSlider.value;
    });

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
            // Обновляем максимальные значения слайдеров
            updateSliderLimits(currentFile);
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
            updateSliderLimits(currentFile);
            const dt = new DataTransfer();
            dt.items.add(currentFile);
            fileInput.files = dt.files;
        }
    });

    function updateSliderLimits(file) {
        if (file && file.type.startsWith('video/')) {
            const video = document.createElement('video');
            const url = URL.createObjectURL(file);
            video.src = url;
            video.onloadedmetadata = function() {
                const maxDuration = Math.floor(video.duration);
                startTimeSlider.max = Math.max(0, maxDuration - 0.5);
                durationSlider.max = Math.min(10, maxDuration);
                if (parseFloat(startTimeSlider.value) + parseFloat(durationSlider.value) > maxDuration) {
                    startTimeSlider.value = Math.max(0, maxDuration - parseFloat(durationSlider.value));
                    startTimeVal.textContent = startTimeSlider.value;
                }
                URL.revokeObjectURL(url);
            };
            video.load();
        }
    }

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

    // ===== Предпросмотр выбранной области =====
    function previewSelection() {
        if (!currentFile || !currentFile.type.startsWith('video/')) {
            alert('Загрузите видеофайл для предпросмотра');
            return;
        }

        stopPreview();

        const startTime = parseFloat(startTimeSlider.value);
        const duration = parseFloat(durationSlider.value);
        
        const video = document.createElement('video');
        const url = URL.createObjectURL(currentFile);
        video.src = url;
        video.muted = true;
        video.currentTime = startTime;

        video.onloadedmetadata = function() {
            canvas.width = Math.min(video.videoWidth, 1280);
            canvas.height = Math.min(video.videoHeight, 720);
            video.play();
            isPreviewing = true;
            previewVideo = video;

            let startTime2 = performance.now();
            let elapsed = 0;

            previewInterval = setInterval(() => {
                if (video.ended || elapsed >= duration) {
                    stopPreview();
                    return;
                }
                
                elapsed = (performance.now() - startTime2) / 1000;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Показываем прогресс
                const progress = Math.round((elapsed / duration) * 100);
                progressEl.textContent = `🎬 Предпросмотр: ${progress}%`;
                progressEl.className = 'progress-visible';

                // Отрисовываем рамку области захвата
                const size = sizePresets[sizeSelect.value] || sizePresets.medium;
                const scaleX = canvas.width / video.videoWidth;
                const scaleY = canvas.height / video.videoHeight;
                const boxWidth = size.width * scaleX;
                const boxHeight = size.height * scaleY;
                const boxX = (canvas.width - boxWidth) / 2;
                const boxY = (canvas.height - boxHeight) / 2;
                
                ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 8]);
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
                ctx.setLineDash([]);
                
                ctx.fillStyle = 'rgba(100, 200, 255, 0.1)';
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
                
                // Подпись размера
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = '12px Inter, sans-serif';
                ctx.fillText(`${size.width}x${size.height}`, boxX + 8, boxY + 20);

                if (elapsed >= duration) {
                    stopPreview();
                }
            }, 1000 / 30);
        };

        video.onerror = function() {
            alert('Ошибка загрузки видео для предпросмотра');
            stopPreview();
        };
        video.load();
    }

    function stopPreview() {
        isPreviewing = false;
        if (previewInterval) {
            clearInterval(previewInterval);
            previewInterval = null;
        }
        if (previewVideo) {
            previewVideo.pause();
            previewVideo.src = '';
            previewVideo = null;
        }
        progressEl.className = 'progress-hidden';
        progressEl.textContent = '';
        // Восстанавливаем первый кадр
        if (currentFile && currentFile.type.startsWith('video/')) {
            showPreview(currentFile);
        }
    }

    previewSelectionBtn.addEventListener('click', previewSelection);
    stopPreviewBtn.addEventListener('click', stopPreview);

    // ===== Конвертация видео в GIF через gifshot =====
    async function convertVideoToGif(videoFile, fps, duration, quality, startTime, size) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const url = URL.createObjectURL(videoFile);
            video.src = url;
            video.muted = true;
            video.currentTime = startTime;

            video.onloadeddata = function() {
                const sizePreset = sizePresets[size] || sizePresets.medium;
                const width = Math.min(sizePreset.width, video.videoWidth);
                const height = Math.min(sizePreset.height, video.videoHeight);
                
                // Сохраняем соотношение сторон
                const aspectRatio = video.videoWidth / video.videoHeight;
                let finalWidth = width;
                let finalHeight = height;
                if (width / height > aspectRatio) {
                    finalHeight = Math.round(width / aspectRatio);
                } else {
                    finalWidth = Math.round(height * aspectRatio);
                }

                const totalFrames = Math.min(Math.floor(duration * fps), 100);
                const frameDelay = Math.floor(1000 / fps);

                const captureCanvas = document.createElement('canvas');
                captureCanvas.width = finalWidth;
                captureCanvas.height = finalHeight;
                const captureCtx = captureCanvas.getContext('2d');

                let frameDataUrls = [];
                let currentFrame = 0;
                let videoStartTime = startTime;

                function captureFrame() {
                    if (currentFrame >= totalFrames || video.ended) {
                        createGifFromDataUrls(frameDataUrls, frameDelay, quality, resolve, reject);
                        return;
                    }

                    const progress = Math.round((currentFrame / totalFrames) * 50);
                    progressEl.textContent = `🎬 Захват кадров: ${progress}%`;

                    captureCtx.clearRect(0, 0, finalWidth, finalHeight);
                    // Центрируем видео в кадре
                    const sx = (video.videoWidth - finalWidth) / 2;
                    const sy = (video.videoHeight - finalHeight) / 2;
                    captureCtx.drawImage(video, sx, sy, finalWidth, finalHeight, 0, 0, finalWidth, finalHeight);
                    frameDataUrls.push(captureCanvas.toDataURL('image/png'));

                    currentFrame++;
                    video.currentTime = videoStartTime + (currentFrame / fps);
                }

                video.onseeked = function() {
                    captureFrame();
                };

                video.play().then(() => {
                    video.pause();
                    captureFrame();
                }).catch(reject);
            };

            video.onerror = function() {
                reject(new Error('Ошибка загрузки видео'));
            };
            video.load();
        });
    }

    // ===== Создание GIF из DataURL =====
    function createGifFromDataUrls(dataUrls, delay, quality, resolve, reject) {
        progressEl.textContent = '🎞️ Загрузка кадров...';

        if (typeof gifshot === 'undefined') {
            reject(new Error('Библиотека gifshot не загружена'));
            return;
        }

        if (dataUrls.length === 0) {
            reject(new Error('Нет кадров для создания GIF'));
            return;
        }

        const qualityMap = {
            'low': 20,
            'medium': 10,
            'high': 3
        };

        const imagePromises = dataUrls.map((dataUrl) => {
            return new Promise((resolveImg) => {
                const img = new Image();
                img.onload = function() {
                    resolveImg(img);
                };
                img.onerror = function() {
                    const fallbackImg = new Image();
                    fallbackImg.onload = function() {
                        resolveImg(fallbackImg);
                    };
                    fallbackImg.src = dataUrl;
                };
                img.src = dataUrl;
            });
        });

        Promise.all(imagePromises).then((images) => {
            const validImages = images.filter(img => img && img.complete && img.naturalWidth > 0);
            
            if (validImages.length === 0) {
                reject(new Error('Не удалось загрузить ни одного кадра'));
                return;
            }

            progressEl.textContent = `🖼️ Создание GIF из ${validImages.length} кадров...`;

            const gifWidth = Math.min(validImages[0].naturalWidth || 480, 480);
            const gifHeight = Math.min(validImages[0].naturalHeight || 360, 360);

            const options = {
                images: validImages,
                gifWidth: gifWidth,
                gifHeight: gifHeight,
                frameDuration: delay / 10,
                sampleInterval: qualityMap[quality] || 10,
                numWorkers: 1,
                backgroundColor: '#000000',
                transparent: null,
                progressCallback: function(progress) {
                    const pct = Math.round(50 + (progress / 100) * 40);
                    progressEl.textContent = `🎞️ Создание GIF: ${pct}%`;
                }
            };

            gifshot.createGIF(options, function(obj) {
                if (!obj.error && obj.image) {
                    progressEl.textContent = '✅ GIF готов!';
                    
                    try {
                        fetch(obj.image)
                            .then(res => res.blob())
                            .then(blob => {
                                resolve(blob);
                            })
                            .catch(() => {
                                try {
                                    const byteString = atob(obj.image.split(',')[1]);
                                    const ab = new ArrayBuffer(byteString.length);
                                    const ia = new Uint8Array(ab);
                                    for (let i = 0; i < byteString.length; i++) {
                                        ia[i] = byteString.charCodeAt(i);
                                    }
                                    const blob = new Blob([ab], { type: 'image/gif' });
                                    resolve(blob);
                                } catch (e) {
                                    reject(new Error('Ошибка конвертации GIF: ' + e.message));
                                }
                            });
                    } catch (err) {
                        reject(new Error('Ошибка обработки GIF: ' + err.message));
                    }
                } else {
                    reject(new Error('Ошибка создания GIF: ' + (obj.error || 'Неизвестная ошибка')));
                }
            });
        }).catch((err) => {
            reject(new Error('Ошибка загрузки кадров: ' + err.message));
        });
    }

    // ===== Конвертация видео в WebM =====
    async function convertVideoToWebM(videoFile, fps, duration, startTime, size) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const url = URL.createObjectURL(videoFile);
            video.src = url;
            video.muted = true;
            video.currentTime = startTime;

            video.onloadeddata = function() {
                const sizePreset = sizePresets[size] || sizePresets.medium;
                const width = Math.min(sizePreset.width, video.videoWidth);
                const height = Math.min(sizePreset.height, video.videoHeight);
                
                const aspectRatio = video.videoWidth / video.videoHeight;
                let finalWidth = width;
                let finalHeight = height;
                if (width / height > aspectRatio) {
                    finalHeight = Math.round(width / aspectRatio);
                } else {
                    finalWidth = Math.round(height * aspectRatio);
                }

                const totalFrames = Math.min(Math.floor(duration * fps), 300);
                const captureCanvas = document.createElement('canvas');
                captureCanvas.width = finalWidth;
                captureCanvas.height = finalHeight;
                const captureCtx = captureCanvas.getContext('2d');

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
                let videoStartTime = startTime;

                function captureFrame() {
                    if (currentFrame >= totalFrames || video.ended) {
                        recorder.stop();
                        return;
                    }

                    const progress = Math.round((currentFrame / totalFrames) * 100);
                    progressEl.textContent = `🎬 Запись WebM: ${progress}%`;

                    captureCtx.clearRect(0, 0, finalWidth, finalHeight);
                    const sx = (video.videoWidth - finalWidth) / 2;
                    const sy = (video.videoHeight - finalHeight) / 2;
                    captureCtx.drawImage(video, sx, sy, finalWidth, finalHeight, 0, 0, finalWidth, finalHeight);
                    currentFrame++;
                    video.currentTime = videoStartTime + (currentFrame / fps);
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

    // ===== Показать готовый GIF на превью =====
    function showGifPreview(blob) {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
        };
        img.onerror = function() {
            // Если не удалось загрузить как изображение, пробуем как видео
            const vid = document.createElement('video');
            vid.src = url;
            vid.muted = true;
            vid.onloadeddata = function() {
                canvas.width = vid.videoWidth || 640;
                canvas.height = vid.videoHeight || 360;
                ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
            };
            vid.load();
        };
        img.src = url;
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
        const size = sizeSelect.value;
        const startTime = parseFloat(startTimeSlider.value);
        const duration = parseFloat(durationSlider.value);

        // Проверка, что выбранная область не выходит за пределы видео
        if (currentFile.type.startsWith('video/')) {
            const video = document.createElement('video');
            const url = URL.createObjectURL(currentFile);
            video.src = url;
            await new Promise((resolve) => {
                video.onloadedmetadata = function() {
                    if (startTime + duration > video.duration) {
                        alert(`Выбранная область выходит за пределы видео. Максимальная длительность: ${(video.duration - startTime).toFixed(1)} сек`);
                        URL.revokeObjectURL(url);
                        resolve();
                    } else {
                        URL.revokeObjectURL(url);
                        resolve();
                    }
                };
                video.load();
            });
        }

        isConverting = true;
        convertBtn.disabled = true;
        progressEl.className = 'progress-visible';
        progressEl.textContent = '⏳ Подготовка...';

        try {
            let blob = null;
            let ext = to;

            if (to === 'gif' && currentFile.type.startsWith('video/')) {
                blob = await convertVideoToGif(currentFile, fps, duration, quality, startTime, size);
                ext = 'gif';
            } else if (to === 'webm' && currentFile.type.startsWith('video/')) {
                blob = await convertVideoToWebM(currentFile, fps, duration, startTime, size);
                ext = 'webm';
            } else if (to === 'wav' && currentFile.type.startsWith('audio/')) {
                blob = await convertAudioToWav(currentFile);
                ext = 'wav';
            } else {
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
                
                // Показываем результат на превью
                if (ext === 'gif') {
                    showGifPreview(blob);
                } else if (ext === 'mp4' || ext === 'webm') {
                    const url = URL.createObjectURL(blob);
                    const vid = document.createElement('video');
                    vid.src = url;
                    vid.muted = true;
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
        stopPreview();
        currentFile = null;
        convertedBlob = null;
        downloadBtn.disabled = true;
        fileInput.value = '';
        updateFileStatus(null);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        progressEl.className = 'progress-hidden';
        progressEl.textContent = '';
        overlay.classList.remove('hidden');
        startTimeSlider.value = 0;
        startTimeVal.textContent = '0';
        durationSlider.value = 5;
        durationVal.textContent = '5';
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