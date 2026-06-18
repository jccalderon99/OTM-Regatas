document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let viewer = null;
    let autoRotateActive = false;
    let previousView = '#/';

    // Edit Mode State
    let isEditMode = false;
    let activeTourData = null;
    let currentEditingSceneId = null;

    // --- DOM Elements ---
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.app-view');
    
    // View containers
    const viewLanding = document.getElementById('view-landing');
    const viewSaved = document.getElementById('view-saved');
    const viewViewer = document.getElementById('view-viewer');
    
    // Splash screen
    const splashScreen = document.getElementById('splash-screen');
    const tourTitleSplash = document.getElementById('tour-title-splash');

    // Landing View elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadProgressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('progress-bar');
    const uploadStatusText = document.getElementById('upload-status-text');
    const uploadSuccessContainer = document.getElementById('upload-success-container');
    const generatedLinkInput = document.getElementById('generated-link-input');
    const btnCopyLink = document.getElementById('btn-copy-link');
    const btnViewNow = document.getElementById('btn-view-now');
    const btnUploadAnother = document.getElementById('btn-upload-another');

    // Gallery View elements
    const galleryGrid = document.getElementById('gallery-grid');
    const galleryEmpty = document.getElementById('gallery-empty');

    // Viewer View elements
    const btnCloseViewer = document.getElementById('btn-close-viewer');
    const tourTitle = document.getElementById('tour-title');
    const sceneTitle = document.getElementById('scene-title');
    const btnZoomIn = document.getElementById('ctrl-zoom-in');
    const btnZoomOut = document.getElementById('ctrl-zoom-out');
    const btnAutorotate = document.getElementById('ctrl-autorotate');
    const btnGyro = document.getElementById('ctrl-gyro');
    const btnFullscreen = document.getElementById('ctrl-fullscreen');
    const btnToggleThumbs = document.getElementById('toggle-thumbnails');
    const btnCloseThumbs = document.getElementById('close-thumbnails');
    const thumbsDrawer = document.getElementById('thumbnails-drawer');
    const thumbsContainer = document.getElementById('thumbnails-container');
    const infoCard = document.getElementById('info-card');
    const infoTitle = document.getElementById('info-title');
    const infoText = document.getElementById('info-text');
    const btnCloseInfo = document.getElementById('close-info');
    const transitionOverlay = document.getElementById('scene-transition');
    const uiContainer = document.getElementById('ui-container');

    // Edit Mode UI Elements
    const btnEditTour = document.getElementById('btn-edit-tour');
    const editorConsole = document.getElementById('editor-console');
    const editorScenesList = document.getElementById('editor-scenes-list');
    const btnAddScene = document.getElementById('btn-add-scene');
    const inputAddScene = document.getElementById('input-add-scene');
    const btnSaveEdit = document.getElementById('btn-save-edit');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');

    // Hotspot Modal elements
    const modalAddHotspot = document.getElementById('modal-add-hotspot');
    const btnCloseModalHs = document.getElementById('btn-close-modal-hs');
    const btnCancelModalHs = document.getElementById('btn-cancel-modal-hs');
    const formAddHotspot = document.getElementById('form-add-hotspot');
    const hsPitch = document.getElementById('hs-pitch');
    const hsYaw = document.getElementById('hs-yaw');
    const hsType = document.getElementById('hs-type');
    const groupHsInfo = document.getElementById('group-hs-info');
    const groupHsScene = document.getElementById('group-hs-scene');
    const hsTitleInput = document.getElementById('hs-title-input');
    const hsTextInput = document.getElementById('hs-text-input');
    const hsTargetSceneSelect = document.getElementById('hs-target-scene-select');

    // --- SVG Icons for Hotspots ---
    const icons = {
        scene: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };

    // --- Router ---
    function router() {
        const hash = window.location.hash || '#/';
        
        // Hide all views first
        views.forEach(v => {
            if (v.id !== 'view-viewer') {
                v.classList.add('hidden');
            }
        });

        // Manage active nav links
        navLinks.forEach(link => {
            if (link.getAttribute('href') === hash) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Close viewer if switching routes
        if (!hash.startsWith('#/tour/') && hash !== '#/example') {
            deactivateViewer();
        }

        // Route handler
        if (hash === '#/' || hash === '') {
            viewLanding.classList.remove('hidden');
            previousView = '#/';
        } else if (hash === '#/saved') {
            viewSaved.classList.remove('hidden');
            loadGallery();
            previousView = '#/saved';
        } else if (hash === '#/example') {
            previousView = '#/example';
            activateViewer();
            loadExampleTour();
        } else if (hash.startsWith('#/tour/')) {
            const tourId = hash.replace('#/tour/', '');
            activateViewer();
            loadUploadedTour(tourId);
        }
    }

    // Run router on load and hash change
    window.addEventListener('hashchange', router);
    
    // Initial load
    router();

    // --- Viewer Activation / Deactivation ---
    function activateViewer() {
        viewViewer.classList.remove('hidden');
        // Wait for next animation frame, then add active class for slide-up transition
        requestAnimationFrame(() => {
            viewViewer.classList.add('active');
        });
        document.body.style.overflow = 'hidden'; // Stop background scrolling

        // CRITICAL FIX: Trigger WebGL resize after transition completes
        setTimeout(() => {
            if (viewer) {
                viewer.resize();
            }
        }, 650);
    }

    function deactivateViewer() {
        viewViewer.classList.remove('active');
        document.body.style.overflow = 'auto'; // Re-enable background scrolling
        
        // Destroy Pannellum viewer
        if (viewer) {
            try {
                viewer.destroy();
            } catch (e) {
                console.error("Error destroying Pannellum:", e);
            }
            viewer = null;
        }

        // Exit edit mode if active
        if (isEditMode) {
            exitEditMode(true);
        }

        // Hide UI container overlay, edit button and drawers
        uiContainer.classList.add('hidden');
        thumbsDrawer.classList.add('hidden');
        infoCard.classList.add('hidden');
        btnEditTour.classList.add('hidden');
        editorConsole.classList.add('hidden');
        autoRotateActive = false;
        btnAutorotate.classList.remove('active');

        // ALWAYS hide loading splash screen when deactivating viewer
        hideSplash();

        // Delay hiding the view element until slide transition finishes
        setTimeout(() => {
            if (!window.location.hash.startsWith('#/tour/') && window.location.hash !== '#/example') {
                viewViewer.classList.add('hidden');
            }
        }, 600);
    }

    // Go back button inside Viewer
    btnCloseViewer.addEventListener('click', () => {
        // Return to previous view (Landing or Gallery)
        if (previousView === '#/example' || previousView.startsWith('#/tour/')) {
            window.location.hash = '#/';
        } else {
            window.location.hash = previousView;
        }
    });

    // --- Drag & Drop Upload Logic ---
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop zone on drag over
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleUpload(files[0]);
        }
    });

    // Click to upload
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleUpload(fileInput.files[0]);
        }
    });

    // Handle Upload Implementation
    function handleUpload(file) {
        // Validate type
        if (!file.type.match('image.*')) {
            alert('Por favor, selecciona una imagen panorámica válida (JPG, PNG, WEBP).');
            return;
        }

        // Show uploading UI state
        dropZone.classList.add('hidden');
        uploadProgressContainer.classList.remove('hidden');
        uploadSuccessContainer.classList.add('hidden');
        progressBar.style.width = '0%';
        uploadStatusText.innerText = 'Subiendo panorama... 0%';

        const formData = new FormData();
        formData.append('panorama', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload', true);

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percent + '%';
                uploadStatusText.innerText = `Subiendo panorama... ${percent}%`;
            }
        });

        // Response handler
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        showUploadSuccess(response.tour);
                    } else {
                        showUploadError(response.error || 'Error al procesar la imagen.');
                    }
                } catch (err) {
                    showUploadError('Error de procesamiento en el servidor.');
                }
            } else {
                showUploadError(`Error de servidor (${xhr.status})`);
            }
        };

        xhr.onerror = function() {
            showUploadError('Error de red al intentar conectarse al servidor.');
        };

        xhr.send(formData);
    }

    function showUploadSuccess(tour) {
        uploadProgressContainer.classList.add('hidden');
        uploadSuccessContainer.classList.remove('hidden');

        // Set up shared link
        const shareLink = window.location.origin + '/#/tour/' + tour.id;
        generatedLinkInput.value = shareLink;
        btnViewNow.setAttribute('href', `#/tour/${tour.id}`);
    }

    function showUploadError(errorMsg) {
        uploadProgressContainer.classList.add('hidden');
        dropZone.classList.remove('hidden');
        alert('Error: ' + errorMsg);
    }

    // Copy to clipboard
    btnCopyLink.addEventListener('click', () => {
        generatedLinkInput.select();
        generatedLinkInput.setSelectionRange(0, 99999); // For mobile devices
        
        navigator.clipboard.writeText(generatedLinkInput.value)
            .then(() => {
                const prevText = btnCopyLink.innerText;
                btnCopyLink.innerText = '¡Copiado!';
                btnCopyLink.style.background = 'var(--success)';
                
                setTimeout(() => {
                    btnCopyLink.innerText = prevText;
                    btnCopyLink.style.background = 'var(--accent-gradient)';
                }, 2000);
            })
            .catch(err => {
                console.error('Error copying link:', err);
                alert('No se pudo copiar automáticamente. Copia el texto manualmente.');
            });
    });

    btnUploadAnother.addEventListener('click', () => {
        uploadSuccessContainer.classList.add('hidden');
        dropZone.classList.remove('hidden');
        fileInput.value = ''; // Reset input
    });

    // --- Saved Tours Gallery Logic ---
    async function loadGallery() {
        try {
            const response = await fetch('/api/tours');
            if (!response.ok) throw new Error('Failed to fetch tours');
            const tours = await response.json();

            galleryGrid.innerHTML = '';

            if (tours.length === 0) {
                galleryEmpty.classList.remove('hidden');
                galleryGrid.classList.add('hidden');
                return;
            }

            galleryEmpty.classList.add('hidden');
            galleryGrid.classList.remove('hidden');

            tours.forEach(tour => {
                const dateFormatted = new Date(tour.createdAt).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const card = document.createElement('div');
                card.className = 'tour-card';
                card.innerHTML = `
                    <div class="card-image">
                        <img src="${tour.image}" alt="${tour.title}" loading="lazy">
                        <span class="card-badge">360°</span>
                    </div>
                    <div class="card-info">
                        <h3>${tour.title}</h3>
                        <span class="card-date">${dateFormatted}</span>
                        <div class="card-actions">
                            <a href="#/tour/${tour.id}" class="btn-card-view">Abrir</a>
                            <button class="btn-card-share" data-link="${window.location.origin}/#/tour/${tour.id}">Compartir</button>
                        </div>
                    </div>
                `;

                // Share link on gallery card click
                const btnShare = card.querySelector('.btn-card-share');
                btnShare.addEventListener('click', (e) => {
                    const link = btnShare.getAttribute('data-link');
                    navigator.clipboard.writeText(link)
                        .then(() => {
                            const prevText = btnShare.innerText;
                            btnShare.innerText = '¡Copiado!';
                            btnShare.style.background = 'var(--success)';
                            btnShare.style.color = '#fff';
                            btnShare.style.borderColor = 'var(--success)';
                            
                            setTimeout(() => {
                                btnShare.innerText = prevText;
                                btnShare.style.background = 'rgba(255, 255, 255, 0.05)';
                                btnShare.style.color = 'var(--text-secondary)';
                                btnShare.style.borderColor = 'var(--glass-border)';
                            }, 2000);
                        });
                });

                galleryGrid.appendChild(card);
            });

        } catch (error) {
            console.error('Error loading gallery:', error);
            galleryGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--danger);">Error al cargar los recorridos. Reintenta más tarde.</p>`;
        }
    }

    // --- Loading Dynamic Tours ---
    async function loadUploadedTour(id) {
        showSplash('Cargando Recorrido (las imágenes de alta resolución pueden tardar unos segundos)...');

        try {
            const response = await fetch(`/api/tours/${id}`);
            if (!response.ok) {
                if (response.status === 404) throw new Error('El recorrido virtual no existe.');
                throw new Error('Error al conectar con el servidor.');
            }
            activeTourData = await response.json();

            // Enable edit button for user-uploaded tours
            btnEditTour.classList.remove('hidden');

            // Set up initial scene
            currentEditingSceneId = activeTourData.defaultScene || Object.keys(activeTourData.scenes)[0];

            loadTourViewerFromData(activeTourData, currentEditingSceneId);

        } catch (error) {
            console.error('Error loading tour:', error);
            tourTitleSplash.innerHTML = `<span style="color: var(--danger); font-weight: 600;">Error:</span> ${error.message}<br><br><a href="#/" class="btn-secondary" style="margin-top: 20px; font-size: 0.9rem;">Volver al Inicio</a>`;
            document.querySelector('.splash-content .spinner').style.display = 'none';
        }
    }

    // --- Loading Multi-scene Example Tour ---
    async function loadExampleTour() {
        showSplash('Cargando Recorrido Demo...');

        try {
            const response = await fetch('config.json');
            if (!response.ok) throw new Error('No se pudo cargar config.json.');
            const configData = await response.json();

            // Disable editor button for static example demo
            btnEditTour.classList.add('hidden');

            activeTourData = {
                id: 'demo',
                title: configData.tourName,
                defaultScene: configData.defaultScene,
                scenes: configData.scenes
            };

            currentEditingSceneId = activeTourData.defaultScene;

            loadTourViewerFromData(activeTourData, currentEditingSceneId);

        } catch (error) {
            console.error('Error loading example tour:', error);
            tourTitleSplash.innerHTML = `<span style="color: var(--danger); font-weight: 600;">Error:</span> ${error.message}<br><br><a href="#/" class="btn-secondary" style="margin-top: 20px; font-size: 0.9rem;">Volver al Inicio</a>`;
            document.querySelector('.splash-content .spinner').style.display = 'none';
        }
    }

    // --- Unified Scene Loader from Tour Data ---
    function loadTourViewerFromData(tourData, firstSceneId = null, initialPitch = 0, initialYaw = 0, initialHfov = 100) {
        tourTitle.innerText = tourData.title || 'Recorrido Virtual';
        
        const firstScene = firstSceneId || tourData.defaultScene || Object.keys(tourData.scenes)[0];
        currentEditingSceneId = firstScene;
        sceneTitle.innerText = tourData.scenes[firstScene].title || 'Escena';

        const panConfig = {
            default: {
                firstScene: firstScene,
                sceneFadeDuration: 0,
                autoLoad: true,
                autoRotate: 0,
                compass: false,
                showControls: false
            },
            scenes: {}
        };

        // Convert tour scenes to Pannellum format
        for (const [sceneId, scene] of Object.entries(tourData.scenes)) {
            const hfov = scene.hfov || 100;
            panConfig.scenes[sceneId] = {
                title: scene.title,
                type: "equirectangular",
                panorama: scene.image,
                pitch: sceneId === firstScene ? initialPitch : (scene.pitch || 0),
                yaw: sceneId === firstScene ? initialYaw : (scene.yaw || 0),
                hfov: sceneId === firstScene ? initialHfov : hfov,
                minHfov: Math.max(50, hfov - 40),
                maxHfov: Math.min(120, hfov + 20),
                hotSpots: (scene.hotSpots || []).map(createCustomHotspot)
            };
        }

        // Build scene thumbnails for drawer (if more than 1 scene)
        const sceneCount = Object.keys(tourData.scenes).length;
        if (sceneCount > 1) {
            buildTourThumbnails(tourData);
            btnToggleThumbs.classList.remove('hidden');
        } else {
            btnToggleThumbs.classList.add('hidden');
            thumbsDrawer.classList.add('hidden');
        }

        initPannellum(panConfig);
    }

    function buildTourThumbnails(tourData) {
        thumbsContainer.innerHTML = '';
        for (const [id, scene] of Object.entries(tourData.scenes)) {
            const div = document.createElement('div');
            div.className = 'thumbnail-item' + (id === currentEditingSceneId ? ' active' : '');
            div.dataset.scene = id;
            div.innerHTML = `
                <img src="${scene.thumbnail || scene.image}" alt="${scene.title}" loading="lazy">
                <div class="thumb-label">${scene.title}</div>
            `;
            div.addEventListener('click', () => {
                if (currentEditingSceneId !== id) {
                    if (isEditMode) {
                        currentEditingSceneId = id;
                        renderEditorScenesList();
                        loadTourViewerFromData(activeTourData, id);
                    } else {
                        transitionToScene(id);
                    }
                }
                if (window.innerWidth <= 768) {
                    thumbsDrawer.classList.add('hidden');
                }
            });
            thumbsContainer.appendChild(div);
        }
    }

    // --- Pannellum Initialization & Handlers ---
    function initPannellum(panConfig) {
        if (viewer) {
            try {
                viewer.destroy();
            } catch (e) {
                console.error("Error destroying Pannellum:", e);
            }
            viewer = null;
        }

        // CRITICAL WebGL FIX: Recreate DOM panorama element completely to flush cached states and lost contexts
        const oldContainer = document.getElementById('panorama');
        if (oldContainer) {
            const parent = oldContainer.parentNode;
            const newContainer = document.createElement('div');
            newContainer.id = 'panorama';
            if (isEditMode) newContainer.className = 'edit-mode';
            parent.replaceChild(newContainer, oldContainer);
        }

        viewer = pannellum.viewer('panorama', panConfig);

        // Error handler to prevent stuck black loading screen on failures
        viewer.on('error', (err) => {
            console.error("Pannellum error captured:", err);
            hideSplash();
            alert(`Aviso: No se pudo cargar esta escena 360° (${err.message || 'Error de WebGL'}).`);
            deactivateViewer();
            window.location.hash = '#/saved';
        });

        viewer.on('scenechange', (sceneId) => {
            currentEditingSceneId = sceneId;
            sceneTitle.innerText = panConfig.scenes[sceneId].title || 'Escena';
            updateThumbnailActiveState(sceneId);
            if (isEditMode) {
                renderEditorScenesList();
            }
        });

        viewer.on('load', () => {
            hideSplash();
            uiContainer.classList.remove('hidden');
            sceneTitle.innerText = panConfig.scenes[viewer.getScene()].title || 'Escena';
            updateThumbnailActiveState(viewer.getScene());
            
            // Trigger resize immediately after load completes
            viewer.resize();
        });
    }

    function createCustomHotspot(hs) {
        return {
            pitch: hs.pitch,
            yaw: hs.yaw,
            createTooltipFunc: hotspotFunc,
            createTooltipArgs: hs
        };
    }

    // Custom DOM builder for Hotspots
    function hotspotFunc(hotSpotDiv, args) {
        hotSpotDiv.classList.add('custom-hotspot');
        hotSpotDiv.classList.add(`hotspot-${args.type}`);
        
        if (isEditMode) {
            hotSpotDiv.classList.add('edit-mode');
        }

        // Icon
        hotSpotDiv.innerHTML = args.icon === 'arrow' ? icons.scene : icons[args.type] || icons.info;
        
        // Tooltip
        if (args.text || args.title) {
            const tooltip = document.createElement('div');
            tooltip.classList.add('hotspot-tooltip');
            tooltip.innerText = args.title || args.text;
            hotSpotDiv.appendChild(tooltip);
        }

        // Click Logic
        hotSpotDiv.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop click from triggering new hotspot placement in edit mode
            
            if (isEditMode) {
                // Deletion Flow
                if (confirm('¿Deseas eliminar este punto de interés (comentario o enlace)?')) {
                    const scene = activeTourData.scenes[currentEditingSceneId];
                    const index = scene.hotSpots.findIndex(hs => hs.pitch === args.pitch && hs.yaw === args.yaw);
                    if (index > -1) {
                        scene.hotSpots.splice(index, 1);
                    }
                    
                    // Reload current viewer to reflect delete
                    const pitch = viewer.getPitch();
                    const yaw = viewer.getYaw();
                    const hfov = viewer.getHfov();
                    loadTourViewerFromData(activeTourData, currentEditingSceneId, pitch, yaw, hfov);
                }
            } else {
                // Viewing Flow
                if (args.type === 'scene' && args.targetScene) {
                    transitionToScene(args.targetScene, args.targetPitch, args.targetYaw);
                } else if (args.type === 'info') {
                    showInfoCard(args.title, args.text);
                }
            }
        });
    }

    function transitionToScene(sceneId, pitch, yaw) {
        if (!viewer) return;
        
        // 1. Show transition overlay
        transitionOverlay.classList.add('active');
        
        setTimeout(() => {
            if (!viewer) {
                transitionOverlay.classList.remove('active');
                return;
            }

            // 2. Safety fallback: force hide the black screen after 2 seconds if network/load hangs
            const safetyTimeout = setTimeout(() => {
                transitionOverlay.classList.remove('active');
                if (viewer) viewer.resize();
                console.warn("Scene transition safety timeout fired.");
            }, 2000);

            // 3. Attach load event listener BEFORE loading the scene to avoid race conditions!
            viewer.once('load', () => {
                clearTimeout(safetyTimeout);
                setTimeout(() => {
                    transitionOverlay.classList.remove('active');
                    if (viewer) viewer.resize();
                }, 100);
            });

            // 4. Load the scene
            viewer.loadScene(sceneId, pitch, yaw);
            
        }, 400); // sync with CSS fade
    }

    function updateThumbnailActiveState(sceneId) {
        document.querySelectorAll('.thumbnail-item').forEach(el => {
            if (el.dataset.scene === sceneId) {
                el.classList.add('active');
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } else {
                el.classList.remove('active');
            }
        });
    }

    function showInfoCard(title, text) {
        infoTitle.innerText = title || 'Información';
        infoText.innerHTML = text.replace(/\\n/g, '<br>');
        infoCard.classList.remove('hidden');
    }

    // --- Loading Splash Screen ---
    function showSplash(title) {
        tourTitleSplash.innerText = title;
        // Make spinner visible again if hidden by error
        const spinner = document.querySelector('.splash-content .spinner');
        if (spinner) spinner.style.display = 'block';
        
        splashScreen.classList.remove('hidden');
    }

    function hideSplash() {
        splashScreen.classList.add('hidden');
    }

    // --- Custom Control Panel Listeners ---
    btnZoomIn.addEventListener('click', () => {
        if (viewer) viewer.setHfov(viewer.getHfov() - 10);
    });

    btnZoomOut.addEventListener('click', () => {
        if (viewer) viewer.setHfov(viewer.getHfov() + 10);
    });
    
    btnFullscreen.addEventListener('click', () => {
        if (viewer) viewer.toggleFullscreen();
    });

    btnAutorotate.addEventListener('click', () => {
        if (!viewer) return;
        autoRotateActive = !autoRotateActive;
        if (autoRotateActive) {
            viewer.startAutoRotate(-2);
            btnAutorotate.classList.add('active');
        } else {
            viewer.stopAutoRotate();
            btnAutorotate.classList.remove('active');
        }
    });

    // Hide autorotate if user drags panorama manually
    if (viewer) {
        viewer.on('mousedown', () => {
            if (autoRotateActive) {
                autoRotateActive = false;
                btnAutorotate.classList.remove('active');
            }
        });
    }

    btnGyro.addEventListener('click', () => {
        if (!viewer) return;
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        viewer.startOrientation();
                        btnGyro.classList.add('active');
                    }
                })
                .catch(console.error);
        } else {
            viewer.startOrientation();
            btnGyro.classList.toggle('active');
        }
    });

    // Gyroscope capability check
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        btnGyro.classList.remove('hidden');
    } else if ('ondeviceorientation' in window) {
        btnGyro.classList.remove('hidden');
    }

    btnToggleThumbs.addEventListener('click', () => {
        thumbsDrawer.classList.toggle('hidden');
    });

    btnCloseThumbs.addEventListener('click', () => {
        thumbsDrawer.classList.add('hidden');
    });

    btnCloseInfo.addEventListener('click', () => {
        infoCard.classList.add('hidden');
    });


    // ==========================================================================
    // MODO EDICIÓN (ClauVR Creator Logic)
    // ==========================================================================

    // Toggle Edit Mode
    btnEditTour.addEventListener('click', () => {
        if (!activeTourData) return;
        
        isEditMode = !isEditMode;

        if (isEditMode) {
            enterEditMode();
        } else {
            exitEditMode(false); // Cancel edits on toggle off
        }
    });

    function enterEditMode() {
        btnEditTour.classList.add('active');
        btnEditTour.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Ver Tour</span>
        `;

        editorConsole.classList.remove('hidden');
        
        const panDiv = document.getElementById('panorama');
        if (panDiv) panDiv.classList.add('edit-mode');
        
        // Hide overlay elements
        infoCard.classList.add('hidden');
        
        renderEditorScenesList();
        
        // Force redraw viewer to render delete buttons on hotspots
        const pitch = viewer.getPitch();
        const yaw = viewer.getYaw();
        const hfov = viewer.getHfov();
        loadTourViewerFromData(activeTourData, currentEditingSceneId, pitch, yaw, hfov);
    }

    function exitEditMode(saveInMemoryState) {
        isEditMode = false;
        btnEditTour.classList.remove('active');
        btnEditTour.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <span>Editar Tour</span>
        `;
        
        editorConsole.classList.add('hidden');
        
        const panDiv = document.getElementById('panorama');
        if (panDiv) panDiv.classList.remove('edit-mode');
        
        if (!saveInMemoryState) {
            // Restore from server
            loadUploadedTour(activeTourData.id);
        } else {
            // Re-render normally with current in-memory changes
            loadTourViewerFromData(activeTourData, currentEditingSceneId);
        }
    }

    // Render scenes list in editor sidebar console
    function renderEditorScenesList() {
        editorScenesList.innerHTML = '';
        const sceneEntries = Object.entries(activeTourData.scenes);
        
        sceneEntries.forEach(([id, scene]) => {
            const item = document.createElement('div');
            item.className = 'editor-scene-item' + (id === currentEditingSceneId ? ' active' : '');
            item.dataset.scene = id;
            
            item.innerHTML = `
                <span class="editor-scene-name">${scene.title}</span>
                ${sceneEntries.length > 1 ? `<button class="btn-delete-scene" title="Eliminar escena">&times;</button>` : ''}
            `;
            
            // Delete scene handler
            const btnDelete = item.querySelector('.btn-delete-scene');
            if (btnDelete) {
                btnDelete.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent switching active scene
                    if (confirm(`¿Deseas eliminar la escena "${scene.title}" y todos sus puntos de interés?`)) {
                        delete activeTourData.scenes[id];
                        
                        // If we deleted the current active scene, switch to another
                        if (currentEditingSceneId === id) {
                            currentEditingSceneId = Object.keys(activeTourData.scenes)[0];
                        }
                        // Update default start scene if deleted
                        if (activeTourData.defaultScene === id) {
                            activeTourData.defaultScene = currentEditingSceneId;
                        }

                        renderEditorScenesList();
                        loadTourViewerFromData(activeTourData, currentEditingSceneId);
                    }
                });
            }

            // Click item to switch editing scene
            item.addEventListener('click', () => {
                if (currentEditingSceneId !== id) {
                    currentEditingSceneId = id;
                    renderEditorScenesList();
                    loadTourViewerFromData(activeTourData, id);
                }
            });

            editorScenesList.appendChild(item);
        });
    }

    // Click on Panorama to drop hotspot (Only in Edit Mode)
    document.getElementById('app-content').addEventListener('click', (event) => {
        if (!isEditMode || !viewer) return;

        // Verify click originates inside panorama and not overlays
        if (!event.target.closest('#panorama') || 
            event.target.closest('#ui-container') || 
            event.target.closest('.glass-panel') || 
            event.target.closest('.custom-hotspot') ||
            event.target.closest('.pnlm-controls-container')) {
            return;
        }

        const coords = viewer.mouseEventToCoords(event);
        if (coords) {
            const [pitch, yaw] = coords;
            openAddHotspotModal(pitch, yaw);
        }
    });

    // Hotspot Modal Logic
    function openAddHotspotModal(pitch, yaw) {
        hsPitch.value = pitch;
        hsYaw.value = yaw;
        
        // Reset inputs
        hsTitleInput.value = '';
        hsTextInput.value = '';
        hsType.value = 'info';
        groupHsInfo.classList.remove('hidden');
        groupHsScene.classList.add('hidden');

        // Populate other scenes dropdown
        hsTargetSceneSelect.innerHTML = '';
        let hasOtherScenes = false;

        for (const [id, scene] of Object.entries(activeTourData.scenes)) {
            if (id !== currentEditingSceneId) {
                const opt = document.createElement('option');
                opt.value = id;
                opt.innerText = scene.title;
                hsTargetSceneSelect.appendChild(opt);
                hasOtherScenes = true;
            }
        }

        // Enable or disable "Scene Link" option depending on other scenes existence
        const optScene = hsType.querySelector('option[value="scene"]');
        if (!hasOtherScenes) {
            optScene.disabled = true;
            if (hsType.value === 'scene') {
                hsType.value = 'info';
                groupHsInfo.classList.remove('hidden');
                groupHsScene.classList.add('hidden');
            }
        } else {
            optScene.disabled = false;
        }

        modalAddHotspot.classList.remove('hidden');
    }

    // Hotspot Type selector listener
    hsType.addEventListener('change', () => {
        if (hsType.value === 'info') {
            groupHsInfo.classList.remove('hidden');
            groupHsScene.classList.add('hidden');
        } else {
            groupHsInfo.classList.add('hidden');
            groupHsScene.classList.remove('hidden');
        }
    });

    // Close Modals
    function closeHotspotModal() {
        modalAddHotspot.classList.add('hidden');
    }

    btnCloseModalHs.addEventListener('click', closeHotspotModal);
    btnCancelModalHs.addEventListener('click', closeHotspotModal);

    // Form submit: Add hotspot
    formAddHotspot.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const pitch = parseFloat(hsPitch.value);
        const yaw = parseFloat(hsYaw.value);
        const type = hsType.value;

        let newHotspot = {
            pitch,
            yaw,
            type
        };

        if (type === 'info') {
            newHotspot.title = hsTitleInput.value.trim() || 'Nota';
            newHotspot.text = hsTextInput.value.trim() || 'Detalle informativo.';
        } else {
            const targetSceneId = hsTargetSceneSelect.value;
            if (!targetSceneId) {
                alert('Por favor, agrega otra escena primero para poder conectarlas.');
                return;
            }
            const targetSceneName = activeTourData.scenes[targetSceneId].title;
            newHotspot.targetScene = targetSceneId;
            newHotspot.text = `Ir a: ${targetSceneName}`;
            newHotspot.icon = 'arrow';
            newHotspot.targetPitch = 0;
            newHotspot.targetYaw = 0;
        }

        // Add to active data structure
        const scene = activeTourData.scenes[currentEditingSceneId];
        if (!scene.hotSpots) scene.hotSpots = [];
        scene.hotSpots.push(newHotspot);

        closeHotspotModal();

        // Reload viewer to show the new hotspot
        const curPitch = viewer.getPitch();
        const curYaw = viewer.getYaw();
        const curHfov = viewer.getHfov();
        loadTourViewerFromData(activeTourData, currentEditingSceneId, curPitch, curYaw, curHfov);
    });

    // Add Scene to Tour
    btnAddScene.addEventListener('click', () => {
        inputAddScene.click();
    });

    inputAddScene.addEventListener('change', async () => {
        if (inputAddScene.files.length === 0) return;

        const file = inputAddScene.files[0];
        const sceneTitleStr = prompt('Escribe el título para la nueva escena:', file.name.substring(0, file.name.lastIndexOf('.')) || 'Nueva Escena');
        if (sceneTitleStr === null) return; // User cancelled

        showSplash('Subiendo Nueva Escena...');

        const formData = new FormData();
        formData.append('panorama', file);
        formData.append('title', sceneTitleStr);

        try {
            const response = await fetch(`/api/tours/${activeTourData.id}/scenes`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Error en el servidor al subir la imagen.');
            const result = await response.json();

            if (result.success) {
                activeTourData = result.tour;
                currentEditingSceneId = result.sceneId;

                hideSplash();
                renderEditorScenesList();
                loadTourViewerFromData(activeTourData, currentEditingSceneId);
                alert('¡Escena agregada exitosamente! Haz clic en la pantalla para enlazarla con otras.');
            } else {
                throw new Error(result.error || 'Error desconocido.');
            }
        } catch (err) {
            hideSplash();
            alert('Error: ' + err.message);
        } finally {
            inputAddScene.value = ''; // Reset input
        }
    });

    // Save All Edits to Server
    btnSaveEdit.addEventListener('click', async () => {
        showSplash('Guardando Recorrido...');

        try {
            const response = await fetch(`/api/tours/${activeTourData.id}/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: activeTourData.title,
                    defaultScene: activeTourData.defaultScene,
                    scenes: activeTourData.scenes
                })
            });

            if (!response.ok) throw new Error('Error al conectar con el servidor.');
            const result = await response.json();

            if (result.success) {
                activeTourData = result.tour;
                exitEditMode(true); // Exit edit mode preserving memory changes
                alert('¡Recorrido guardado exitosamente!');
            } else {
                throw new Error(result.error || 'Error desconocido.');
            }
        } catch (err) {
            hideSplash();
            alert('Error: ' + err.message);
        }
    });

    // Cancel Edits
    btnCancelEdit.addEventListener('click', () => {
        if (confirm('¿Deseas salir del modo edición? Se perderán todos los cambios no guardados.')) {
            exitEditMode(false);
        }
    });
});
