// Rendu des cartes de chantiers
function renderProjectCards() {
    const container = document.getElementById('projectCards');
    container.innerHTML = '';
    
    let filteredChantiers = mockData.chantiers;
    
    if (appState.activeFilter === 'late') {
        filteredChantiers = mockData.chantiers.filter(c => c.statut === 'retard');
    } else if (appState.activeFilter === 'risk') {
        filteredChantiers = mockData.chantiers.filter(c => c.alertes > 3);
    } else if (appState.activeFilter === 'validated') {
        filteredChantiers = mockData.chantiers.filter(c => c.avancement === 100);
    }
    
    if (appState.searchQuery) {
        const query = appState.searchQuery.toLowerCase();
        filteredChantiers = filteredChantiers.filter(c => 
            c.nom.toLowerCase().includes(query) || 
            c.type.toLowerCase().includes(query) ||
            c.adresse.toLowerCase().includes(query)
        );
    }
    
    filteredChantiers.forEach(chantier => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow';
        card.dataset.projectId = chantier.id;
        
        card.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center">
                    <div class="w-10 h-10 rounded-lg ${chantier.statut === 'en-cours' ? 'bg-blue-100' : chantier.statut === 'retard' ? 'bg-red-100' : 'bg-green-100'} flex items-center justify-center mr-3">
                        <svg class="w-5 h-5 ${chantier.statut === 'en-cours' ? 'text-blue-900' : chantier.statut === 'retard' ? 'text-red-900' : 'text-green-900'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900">${chantier.nom}</h4>
                        <span class="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${chantier.badgeColor}">${chantier.badge}</span>
                    </div>
                </div>
            </div>
            
            <p class="text-gray-600 text-sm mb-4 flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                ${chantier.adresse}
            </p>
            
            <div class="mb-5">
                <div class="flex justify-between mb-1">
                    <span class="text-sm font-medium text-gray-700">Avancement</span>
                    <span class="text-sm font-medium text-gray-900">${chantier.avancement}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="progress-bar h-2 rounded-full" style="--progress: ${chantier.avancement}%; width: ${chantier.avancement}%; background: #1E3A8A;"></div>
                </div>
            </div>
            
            <div class="flex items-center justify-between text-sm text-gray-600 mb-5">
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.698-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <span>${chantier.alertes} alerte${chantier.alertes > 1 ? 's' : ''}</span>
                </div>
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span>${chantier.nouvellesPhotos} photos</span>
                </div>
                ${chantier.messages && chantier.messages.length > 0 ? `
                <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    <span>${chantier.messages.length} message${chantier.messages.length > 1 ? 's' : ''}</span>
                </div>
                ` : ''}
            </div>
            
            <button class="view-project-btn w-full py-2.5 bg-blue-900 text-white font-medium rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors" data-project-id="${chantier.id}">
                Ouvrir le chantier
            </button>
        `;
        
        container.appendChild(card);
    });
    
    if (filteredChantiers.length === 0) {
        container.innerHTML = `
            <div class="col-span-3 py-12 text-center">
                <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Aucun chantier trouvé</h3>
                <p class="text-gray-600">Essayez de modifier vos filtres ou votre recherche.</p>
            </div>
        `;
    }
    
    const totalAlertes = mockData.chantiers.reduce((sum, chantier) => sum + chantier.alertes, 0);
    document.getElementById('alertCount').textContent = `${totalAlertes} alerte${totalAlertes > 1 ? 's' : ''}`;
}

function renderAlerts() {
    const container = document.getElementById('alertsList');
    container.innerHTML = '';
    
    mockData.alertes.forEach(alerte => {
        const alerteElement = document.createElement('div');
        alerteElement.className = 'p-4 hover:bg-gray-50 transition-colors';
        
        alerteElement.innerHTML = `
            <div class="flex items-start">
                <div class="mr-3 mt-1">
                    <span class="inline-block px-2 py-1 text-xs font-medium rounded-full ${alerte.type === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}">
                        ${alerte.type === 'urgent' ? 'URGENT' : 'À VÉRIFIER'}
                    </span>
                </div>
                <div class="flex-1">
                    <h4 class="font-medium text-gray-900">${alerte.titre}</h4>
                    <p class="text-sm text-gray-600 mt-1">${alerte.description}</p>
                    <div class="flex items-center mt-3 text-sm text-gray-500">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>${alerte.temps}</span>
                        <span class="mx-2">•</span>
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                        <span>${alerte.chantierNom}</span>
                    </div>
                </div>
                <button class="ml-4 px-3 py-1.5 bg-blue-900 text-white text-sm font-medium rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    Traiter
                </button>
            </div>
        `;
        
        container.appendChild(alerteElement);
    });
}

function renderPhotos() {
    const container = document.querySelector('.grid.grid-cols-2.gap-4');
    if (!container) return;
    
    container.innerHTML = '';
    
    mockData.photos.forEach(photo => {
        const photoElement = document.createElement('div');
        photoElement.className = 'relative rounded-lg overflow-hidden shadow-sm';
        
        photoElement.innerHTML = `
            <div class="${photo.couleur} h-40 flex items-center justify-center">
                <svg class="w-12 h-12 text-white opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
            </div>
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
                <p class="font-medium text-sm">${photo.nom}</p>
                <div class="flex items-center justify-between text-xs mt-1">
                    <span>${photo.timestamp}</span>
                    <span>${photo.auteur}</span>
                </div>
            </div>
        `;
        
        container.appendChild(photoElement);
    });
}

function renderValidations() {
    const container = document.getElementById('validationsTable');
    container.innerHTML = '';
    
    mockData.validations.forEach(validation => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${validation.document}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                ${validation.demandeur}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                ${validation.date}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <button class="validate-btn px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2" data-validation-id="${validation.id}">
                    Valider
                </button>
            </td>
        `;
        
        container.appendChild(row);
    });
}

function renderDocuments() {
    const container = document.getElementById('documentsList');
    container.innerHTML = '';
    
    mockData.documents.forEach(doc => {
        const docElement = document.createElement('div');
        docElement.className = 'p-4 hover:bg-gray-50 transition-colors';
        
        const icon = doc.type === 'pdf' ? '📄' : 
                    doc.type === 'excel' ? '📋' : 
                    doc.type === 'archive' ? '🗜️' : '📄';
        
        docElement.innerHTML = `
            <div class="flex items-center">
                <div class="text-2xl mr-3">${icon}</div>
                <div class="flex-1">
                    <h4 class="font-medium text-gray-900">${doc.nom}</h4>
                    <div class="flex items-center mt-1 text-sm text-gray-600">
                        <span>${doc.taille}</span>
                        <span class="mx-2">•</span>
                        <span>${doc.date}</span>
                    </div>
                </div>
                <button class="ml-4 p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                    </svg>
                </button>
            </div>
        `;
        
        container.appendChild(docElement);
    });
}