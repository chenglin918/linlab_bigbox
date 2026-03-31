document.addEventListener('DOMContentLoaded', () => {
    // 3D Model Loading Bar
    const modelViewer = document.querySelector('model-viewer');
    const progress = document.querySelector('.progress-bar');
    const updateBar = document.querySelector('.update-bar');
    
    if (modelViewer && progress && updateBar) {
        modelViewer.addEventListener('progress', (event) => {
            const percent = event.detail.totalProgress * 100;
            updateBar.style.width = `${percent}%`;
            if (percent === 100) {
                progress.classList.add('hide');
            }
        });
    }

    // Modal Events
    const modalBtn = document.getElementById('modalCloseBtn');
    const modalBackdrop = document.getElementById('modalBackdrop');
    
    if (modalBtn) modalBtn.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

    // Allow closing via Escape key
    document.addEventListener('keydown', function(event) {
        const modal = document.getElementById('sensorModal');
        if (event.key === "Escape" && modal && modal.classList.contains('show')) {
            closeModal();
        }
    });

    // Initialize Tabs
    const hash = window.location.hash.replace('#', '') || 'introduction';
    switchTab(hash, true); // true = no animation on initial load

    // Load Data
    loadSpecificationsData();

    // Load fixed Results images from the local results folder.
    loadResultImagesFromFolder();
});

let stateData = null;

function switchTab(targetId, initialLoad = false) {
    // 1. Update Navigation Underlines
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active', 'text-primary');
        if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(targetId)) {
            link.classList.add('active', 'text-primary');
        }
    });

    // 2. Handle Section Transitions
    const sections = Array.from(document.querySelectorAll('.page-section'));
    const activeSection = sections.find(s => s.classList.contains('active'));
    const targetSection = document.getElementById(targetId);

    if (!targetSection) return;
    
    // Update URL hash without jumping
    history.pushState(null, null, `#${targetId}`);

    if (initialLoad) {
        sections.forEach(s => {
            s.classList.remove('active', 'show');
            s.style.display = 'none';
        });
        targetSection.style.display = 'flex';
        targetSection.classList.add('active', 'show');
        return;
    }

    if (activeSection === targetSection) return;

    // Determine slide direction based on DOM order for a natural feel
    const isMovingRight = sections.indexOf(targetSection) > sections.indexOf(activeSection);
    
    if (activeSection) {
        // Fade out active section
        activeSection.classList.remove('show');
        
        // Wait for fade out to complete before hiding and showing new block
        setTimeout(() => {
            activeSection.classList.remove('active');
            activeSection.style.display = 'none';

            // Prepare target section position
            targetSection.style.transform = isMovingRight ? 'translateX(30px)' : 'translateX(-30px)';
            targetSection.style.display = 'flex';
            targetSection.classList.add('active');
            
            // Force reflow
            void targetSection.offsetWidth;
            
            // Slide in
            targetSection.classList.add('show');
            targetSection.style.transform = ''; // clears inline transform to use CSS default
        }, 300); // matches CSS transition duration
    }
}

function loadResultImagesFromFolder() {
    const figureMap = {
        'img-temperature': 'Heatmap change occur at distinction.png',
        'img-moisture': 'Temp_profile_0308.jpg',
        'img-frost-heave': 'Temp&Frost heave history.png',
        'img-dfos-strain': 'DFOS results_base strain.jpg',
        'img-dfos-temp': 'DFOS results_subgrade strain.jpg'
    };

    Object.entries(figureMap).forEach(([imgId, fileName]) => {
        const imgElement = document.getElementById(imgId);
        const placeholderElement = document.getElementById('placeholder-' + imgId.replace('img-', ''));

        if (!imgElement) return;

        imgElement.onload = () => {
            imgElement.classList.remove('hidden');
            if (placeholderElement) placeholderElement.classList.add('hidden');
        };

        imgElement.onerror = () => {
            imgElement.classList.add('hidden');
            if (placeholderElement) {
                placeholderElement.classList.remove('hidden');
                placeholderElement.textContent = `Could not load ${fileName}`;
            }
        };

        imgElement.src = `results/${encodeURIComponent(fileName)}`;
    });
}

function closeModal() {
    const modal = document.getElementById('sensorModal');
    if(modal) {
        modal.classList.remove('show');
        // Because of the 'opacity', the pointer-events none will handle actual dismissal.
        // We'll reset scroll as well just in case.
        document.body.style.overflow = '';
    }
}

function openModal(sensor) {
    const modal = document.getElementById('sensorModal');
    const nameEl = document.getElementById('modalSensorName');
    const specsEl = document.getElementById('modalSensorSpecs');
    const photosEl = document.getElementById('modalSensorPhotos');
    
    // Set Header
    if(nameEl) nameEl.textContent = sensor.name;
    
    // Set Specs
    let specsHtml = '';
    for (const [key, value] of Object.entries(sensor.specs)) {
        // Format value nicely
        const formattedValue = typeof value === 'string' ? value.replace(/\n/g, '<br>') : value;
        specsHtml += `
            <div class="flex items-start gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div class="mt-1">
                    <span class="material-symbols-outlined text-primary text-xl">check_circle</span>
                </div>
                <div>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-slate-100">${key}</h4>
                    <p class="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">${formattedValue}</p>
                </div>
            </div>
        `;
    }
    if(specsEl) specsEl.innerHTML = specsHtml;
    
    // Set Photos
    let photosHtml = '';
    if (sensor.photos && sensor.photos.length > 0) {
        sensor.photos.forEach(photo => {
            photosHtml += `
                <div class="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm h-48 bg-slate-100 dark:bg-slate-800 relative group">
                    <img src="${photo}" alt="${sensor.name} photo" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span class="text-white text-xs font-medium">Installation View</span>
                    </div>
                </div>
            `;
        });
    } else {
        photosHtml = `
            <div class="col-span-full flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-center">
                <span class="material-symbols-outlined text-4xl mb-2 opacity-50">hide_image</span>
                <p class="text-sm font-medium">No imagery available</p>
                <p class="text-xs mt-1">Installation photos for this sensor type have not been logged.</p>
            </div>
        `;
    }
    if(photosEl) photosEl.innerHTML = photosHtml;
    
    // Show Modal
    if(modal) {
        document.body.style.overflow = 'hidden'; // Stop background scrolling
        modal.classList.add('show');
    }
}

async function loadSpecificationsData() {
    try {
        const response = await fetch('data.json?t=' + new Date().getTime());
        if (!response.ok) throw new Error('Network response was not ok');
        
        stateData = await response.json();
        
        if (stateData["Overall specification"] && stateData["Overall specification"].format === "structured") {
            const allSensors = stateData["Overall specification"].sensors;
            
            // On Box: contain LVDT, DFOS, thin-film pressure sensor
            const onBoxKeywords = ['lvdt', 'dfos', 'thin-film'];
            const onBoxSensors = allSensors.filter(s => 
                onBoxKeywords.some(keyword => s.name.toLowerCase().includes(keyword))
            );
            
            // In Soil: remove LVDT, thin-film pressure sensor, loading plate, strain gauge
            const inSoilExcludedKeywords = ['lvdt', 'thin-film', 'loading plate', 'strain gauge'];
            const inSoilSensors = allSensors.filter(s => 
                !inSoilExcludedKeywords.some(keyword => s.name.toLowerCase().includes(keyword))
            );

            // Render to containers
            renderSensors(onBoxSensors, 'sensorListContainerOnBox');
            renderSensors(inSoilSensors, 'sensorListContainerInSoil');
        } else {
            throw new Error("Data format changed or 'Overall specification' missing.");
        }
        
    } catch (error) {
        console.error('Error loading data:', error);
        const errorHtml = `
            <div class="col-span-full p-8 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl text-center">
                <span class="material-symbols-outlined text-red-500 text-4xl mb-4">error</span>
                <h3 class="text-red-800 dark:text-red-400 font-bold mb-2">Data Load Failure</h3>
                <p class="text-red-600 dark:text-red-300 text-sm mb-4">Please ensure you are viewing this via the local server to bypass CORS restrictions.</p>
                <code class="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm block max-w-md mx-auto">python -m http.server 8000</code>
            </div>
        `;
        const containerOnBox = document.getElementById('sensorListContainerOnBox');
        const containerInSoil = document.getElementById('sensorListContainerInSoil');
        if (containerOnBox) containerOnBox.innerHTML = errorHtml;
        if (containerInSoil) containerInSoil.innerHTML = errorHtml;
    }
}

function renderSensors(sensors, containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;
    
    container.innerHTML = '';
    
    if (!sensors || sensors.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-slate-500 dark:text-slate-400 py-8">No sensors recorded in the database.</p>';
        return;
    }
    
    sensors.forEach((sensor, index) => {
        const card = document.createElement('div');
        // Staggered animation delay
        card.style.animationDelay = `${index * 50}ms`;
        card.className = 'group flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 cursor-pointer hover:border-primary dark:hover:border-primary hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(23,84,207,0.15)] transition-all duration-300 transform hover:-translate-y-1';
        
        // Define some icon logic depending on the name
        let icon = "sensors";
        let colorClass = "text-primary bg-primary/10";
        if(sensor.name.toLowerCase().includes('pressure')) { icon = "compress"; colorClass = "text-sky-500 bg-sky-500/10"; }
        if(sensor.name.toLowerCase().includes('temp') || sensor.name.toLowerCase().includes('thermo')) { icon = "device_thermostat"; colorClass = "text-amber-500 bg-amber-500/10"; }
        if(sensor.name.toLowerCase().includes('lvdt') || sensor.name.toLowerCase().includes('disp')) { icon = "straighten"; colorClass = "text-emerald-500 bg-emerald-500/10"; }

        card.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div class="w-12 h-12 rounded-lg flex items-center justify-center ${colorClass}">
                    <span class="material-symbols-outlined">${icon}</span>
                </div>
                <span class="material-symbols-outlined text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors">arrow_outward</span>
            </div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">${sensor.name}</h3>
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                View Spec Sheet
            </p>
        `;
        
        card.onclick = () => openModal(sensor);
        container.appendChild(card);
    });
}
