// Variables globales pour l'état des documents
let selectedFolder = null;
let selectedDocument = null;
let selectedVersion = null;
let zoomLevel = 100;
let contextMenuOpen = false;
let expandedFolders = new Set(); // Pour garder trace des dossiers dépliés
let detailsSidebarOpen = false; // État de la sidebar de détails

// Rendu de l'onglet Documents
function renderDocumentsTab(projectId) {
    const project = mockData.chantiers.find(p => p.id == projectId);
    if (!project) return;
    
    const tabContent = document.querySelectorAll('.project-tab-content')[3];
    if (!tabContent) return;
    
    const projectName = project.nom;
    const folderStructure = documentsArborescence[projectName] || { 
        id: "root", 
        name: projectName, 
        type: "folder", 
        children: [] 
    };
    
    // Initialiser le dossier racine comme déplié
    if (!selectedFolder && !selectedDocument) {
        selectedFolder = folderStructure;
        expandedFolders.add(folderStructure.id);
    }
    
    tabContent.innerHTML = `
        <div class="flex h-full relative">
            <!-- Arborescence des dossiers et documents (gauche) -->
            <div class="w-2/5 bg-white rounded-lg border border-gray-200 shadow-sm p-4 overflow-y-auto" style="max-height: 600px;">
                <div class="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b">
                    <h3 class="text-lg font-semibold text-gray-900">Documents</h3>
                    <div class="flex items-center gap-2">
                        <button class="collapse-all-btn p-2 text-gray-500 hover:text-blue-900 rounded-lg hover:bg-gray-100" title="Tout réduire">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <button class="expand-all-btn p-2 text-gray-500 hover:text-blue-900 rounded-lg hover:bg-gray-100" title="Tout développer">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </button>
                        <button class="new-folder-btn p-2 text-gray-500 hover:text-blue-900 rounded-lg hover:bg-gray-100" title="Nouveau dossier">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-5 5h10a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="folder-tree space-y-1" id="folderTree">
                    ${renderFolderTreeWithDocuments(folderStructure, 0)}
                </div>
            </div>
            
            <!-- Contenu de la partie droite (dossier ou document) -->
            <div class="w-3/5 ml-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4 overflow-y-auto" style="max-height: 600px;">
                <div class="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">${selectedDocument ? '📄' : '📁'}</span>
                        <h4 class="text-lg font-semibold text-gray-900">
                            ${selectedDocument ? selectedDocument.name : (selectedFolder ? selectedFolder.name : 'Sélectionnez un élément')}
                        </h4>
                        ${selectedDocument ? `
                            <span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                ${selectedVersion ? selectedVersion.version : ''}
                            </span>
                        ` : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        ${selectedDocument ? `
                            <!-- Sélecteur de version pour document -->
                            <select id="versionSelector" class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                ${selectedDocument.versions.map((version, index) => `
                                    <option value="${index}" ${version === selectedVersion ? 'selected' : ''}>
                                        ${version.version} - ${formatDate(version.date)}
                                    </option>
                                `).join('')}
                            </select>
                        ` : ''}
                        
                        <!-- Bouton détail (toujours visible) -->
                        <button id="toggleDetailsBtn" class="p-2 text-gray-500 hover:text-blue-900 rounded-lg hover:bg-gray-100 ${detailsSidebarOpen ? 'bg-blue-50 text-blue-900' : ''}" title="Afficher/masquer les détails">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </button>
                        
                        <!-- Menu à 3 points pour actions (toujours visible) -->
                        <div class="relative">
                            <button id="threeDotsBtn" class="p-2 text-gray-500 hover:text-blue-900 rounded-lg hover:bg-gray-100" title="Actions">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                                </svg>
                            </button>
                            
                            <!-- Menu déroulant des actions -->
                            <div id="threeDotsMenu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
                                ${renderThreeDotsMenu(selectedDocument, selectedFolder)}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Contenu dynamique selon la sélection -->
                <div id="rightPanelContent">
                    ${selectedDocument ? renderDocumentPreview(selectedDocument) : 
                      (selectedFolder ? renderFolderContent(selectedFolder) : renderEmptyState())}
                </div>
            </div>
        </div>
        
        <!-- Sidebar de détails (cachée par défaut) -->
        <div id="detailsSidebar" class="context-sidebar ${detailsSidebarOpen ? 'open' : ''}">
            <div class="h-full flex flex-col">
                <!-- En-tête de la sidebar -->
                <div class="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                    <div class="flex items-center">
                        <span class="text-2xl mr-3">${selectedDocument ? '📄' : '📁'}</span>
                        <div>
                            <h3 id="sidebarTitle" class="font-semibold text-gray-900">
                                ${selectedDocument ? selectedDocument.name : selectedFolder ? selectedFolder.name : 'Détails'}
                            </h3>
                            <span id="sidebarType" class="type-badge ${selectedDocument ? 'document' : 'folder'} mt-1">
                                ${selectedDocument ? 'Document' : 'Dossier'}
                            </span>
                        </div>
                    </div>
                    <button id="closeDetailsBtn" class="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <!-- Contenu de la sidebar -->
                <div id="sidebarContent" class="flex-1 overflow-y-auto p-4">
                    ${selectedDocument ? renderDocumentDetails(selectedDocument) : 
                      (selectedFolder ? renderFolderDetails(selectedFolder) : 
                      '<p class="text-gray-500 text-center py-8">Sélectionnez un élément pour voir ses détails</p>')}
                </div>
            </div>
        </div>
    `;
    
    // Ajouter les écouteurs d'événements
    initDocumentsEventListeners(projectId, folderStructure);
}

// Fonction pour rendre le menu à 3 points
function renderThreeDotsMenu(document, folder) {
    if (document) {
        return `
            <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-action="rename">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                </svg>
                Renommer
            </button>
            <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-action="duplicate">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Dupliquer
            </button>
            <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-action="move">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
                Déplacer
            </button>
            <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-action="download">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Télécharger
            </button>
            <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-action="share">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                </svg>
                Partager
            </button>
            <div class="border-t border-gray-200 my-1"></div>
            <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2" data-action="delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                Supprimer
            </button>
        `;
    } else if (folder) {
        return `
            <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-action="rename">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                </svg>
                Renommer le dossier
            </button>
            <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-action="new-folder">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-5 5h10a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                Nouveau dossier
            </button>
            <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-action="new-document">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5h10a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                Nouveau document
            </button>
            <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-action="upload">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"></path>
                </svg>
                Uploader des fichiers
            </button>
            <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-action="duplicate">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Dupliquer le dossier
            </button>
            <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-action="move">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
                Déplacer
            </button>
            <div class="border-t border-gray-200 my-1"></div>
            <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2" data-action="delete">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                Supprimer le dossier
            </button>
        `;
    }
    return '';
}

// Fonction pour rendre l'arborescence avec dossiers ET documents
function renderFolderTreeWithDocuments(folder, level = 0) {
    if (!folder) return '';
    
    const isSelected = selectedFolder && selectedFolder.id === folder.id;
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    
    // Séparer les dossiers et documents pour l'affichage
    const subFolders = folder.children ? folder.children.filter(child => child.type === 'folder') : [];
    const documents = folder.children ? folder.children.filter(child => child.type === 'document') : [];
    
    let html = `<div class="folder-tree-item mb-1">`;
    
    // Ligne du dossier
    html += `
        <div class="folder-item flex items-center p-2 rounded-lg ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}" data-folder-id="${folder.id}" data-folder-path="${folder.name}">
            <div class="flex items-center flex-1">
                ${hasChildren ? `
                    <button class="folder-toggle-btn p-1 mr-1 rounded hover:bg-gray-200" data-folder-id="${folder.id}">
                        <svg class="w-4 h-4 text-gray-600 transform transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                ` : `
                    <span class="w-6"></span>
                `}
                <svg class="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                </svg>
                <span class="font-medium text-gray-900">${folder.name}</span>
                ${hasChildren ? `
                    <span class="ml-2 text-xs text-gray-500">(${subFolders.length} dossier${subFolders.length > 1 ? 's' : ''}, ${documents.length} document${documents.length > 1 ? 's' : ''})</span>
                ` : ''}
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 folder-actions">
                <button class="p-1 text-gray-500 hover:text-blue-900 rounded" title="Plus d'options" data-action="folder-options" data-folder-id="${folder.id}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    // Afficher les enfants si le dossier est déplié
    if (isExpanded && hasChildren) {
        html += `<div class="folder-children ml-6 mt-1 space-y-1">`;
        
        // D'abord les sous-dossiers
        subFolders.forEach(child => {
            html += renderFolderTreeWithDocuments(child, level + 1);
        });
        
        // Ensuite les documents
        documents.forEach(doc => {
            const isDocSelected = selectedDocument && selectedDocument.id === doc.id;
            const currentVersion = doc.versions.find(v => v.isCurrent) || doc.versions[0];
            
            html += `
                <div class="document-item flex items-center p-2 pl-10 rounded-lg ${isDocSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}" data-document-id="${doc.id}">
                    <div class="flex items-center flex-1">
                        <span class="text-xl mr-2">📄</span>
                        <div class="flex-1">
                            <div class="font-medium text-gray-900">${doc.name}</div>
                            <div class="flex items-center text-xs text-gray-500">
                                <span>${currentVersion.version}</span>
                                <span class="mx-1">•</span>
                                <span>${formatDate(currentVersion.date)}</span>
                                <span class="mx-1">•</span>
                                <span>${currentVersion.size}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="version-badge ${doc.versions.length > 1 ? 'current' : ''} text-xs px-2 py-1 rounded-full bg-gray-100">
                            ${doc.versions.length} v
                        </span>
                        <button class="p-1 text-gray-500 hover:text-blue-900 rounded" data-action="doc-options" data-document-id="${doc.id}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
    }
    
    html += `</div>`;
    return html;
}

// Rendu du contenu d'un dossier
function renderFolderContent(folder) {
    if (!folder || !folder.children) {
        return '<p class="text-gray-500 text-center py-8">Dossier vide</p>';
    }
    
    const subFolders = folder.children.filter(child => child.type === 'folder');
    const documents = folder.children.filter(child => child.type === 'document');
    
    let html = '';
    
    // Statistiques rapides
    html += `
        <div class="grid grid-cols-3 gap-3 mb-6">
            <div class="bg-blue-50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-blue-900">${subFolders.length}</div>
                <div class="text-xs text-gray-600">Dossier${subFolders.length > 1 ? 's' : ''}</div>
            </div>
            <div class="bg-green-50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-green-900">${documents.length}</div>
                <div class="text-xs text-gray-600">Document${documents.length > 1 ? 's' : ''}</div>
            </div>
            <div class="bg-purple-50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-purple-900">${documents.reduce((acc, doc) => acc + doc.versions.length, 0)}</div>
                <div class="text-xs text-gray-600">Versions</div>
            </div>
        </div>
    `;
    
    // Afficher les sous-dossiers
    if (subFolders.length > 0) {
        html += '<h5 class="text-sm font-medium text-gray-700 mb-3">Sous-dossiers</h5>';
        html += '<div class="grid grid-cols-2 gap-3 mb-6">';
        subFolders.forEach(subFolder => {
            const subFolderDocs = subFolder.children ? subFolder.children.filter(c => c.type === 'document').length : 0;
            const subFolderSubs = subFolder.children ? subFolder.children.filter(c => c.type === 'folder').length : 0;
            
            html += `
                <div class="folder-card p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all" data-folder-id="${subFolder.id}">
                    <div class="flex items-center">
                        <svg class="w-5 h-5 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                        </svg>
                        <span class="font-medium text-gray-900">${subFolder.name}</span>
                    </div>
                    <div class="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>📁 ${subFolderSubs}</span>
                        <span>📄 ${subFolderDocs}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    // Afficher les documents
    if (documents.length > 0) {
        html += '<h5 class="text-sm font-medium text-gray-700 mb-3">Documents</h5>';
        html += '<div class="space-y-2">';
        documents.forEach(doc => {
            const currentVersion = doc.versions.find(v => v.isCurrent) || doc.versions[0];
            html += `
                <div class="document-card p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all" data-document-id="${doc.id}">
                    <div class="flex items-start justify-between">
                        <div class="flex items-center">
                            <span class="text-2xl mr-3">📄</span>
                            <div>
                                <h6 class="font-medium text-gray-900">${doc.name}</h6>
                                <div class="flex items-center mt-1 text-xs text-gray-500">
                                    <span>${currentVersion.version}</span>
                                    <span class="mx-2">•</span>
                                    <span>${formatDate(currentVersion.date)}</span>
                                    <span class="mx-2">•</span>
                                    <span>${currentVersion.size}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="version-badge ${doc.versions.length > 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'} text-xs px-2 py-1 rounded-full">
                                ${doc.versions.length} v
                            </span>
                            <button class="p-1 text-gray-400 hover:text-gray-600" data-action="doc-quick-options" data-document-id="${doc.id}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    if (subFolders.length === 0 && documents.length === 0) {
        html = `
            <div class="text-center py-12">
                <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path>
                </svg>
                <p class="text-gray-500 mb-2">Ce dossier est vide</p>
                <button class="text-sm text-blue-900 hover:text-blue-700 font-medium" data-action="upload">➕ Ajouter des fichiers</button>
            </div>
        `;
    }
    
    return html;
}

// Rendu de l'aperçu du document
function renderDocumentPreview(document) {
    if (!document) return '';
    
    const currentVersion = selectedVersion || document.versions.find(v => v.isCurrent) || document.versions[0];
    
    return `
        <div class="document-preview-container">
            <!-- Barre d'outils de l'aperçu -->
            <div class="flex items-center justify-between mb-4 p-2 bg-gray-50 rounded-lg">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-700">Aperçu</span>
                    <span class="text-xs text-gray-500">${currentVersion.pages} pages</span>
                </div>
                <div class="zoom-controls flex items-center gap-2">
                    <button class="zoom-btn-preview p-1 text-gray-500 hover:text-blue-900 rounded hover:bg-white" data-zoom="-10">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                        </svg>
                    </button>
                    <span class="zoom-level text-sm min-w-[3rem] text-center">${zoomLevel}%</span>
                    <button class="zoom-btn-preview p-1 text-gray-500 hover:text-blue-900 rounded hover:bg-white" data-zoom="10">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- Simulation des pages PDF -->
            <div class="pdf-pages space-y-4" style="transform: scale(${zoomLevel/100}); transform-origin: top center;">
                ${Array.from({ length: Math.min(3, currentVersion.pages) }, (_, i) => `
                    <div class="pdf-page bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                        <div class="text-center text-gray-400 text-xs mb-2">Page ${i + 1}</div>
                        <div class="h-48 bg-gray-50 rounded flex items-center justify-center">
                            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                            </svg>
                        </div>
                        <div class="mt-2 text-xs text-gray-500 text-center">
                            Contenu simulé de la page ${i + 1}
                        </div>
                    </div>
                `).join('')}
                ${currentVersion.pages > 3 ? `
                    <div class="text-center text-sm text-gray-500 py-2 bg-gray-50 rounded-lg">
                        + ${currentVersion.pages - 3} pages supplémentaires
                    </div>
                ` : ''}
            </div>
            
            <!-- Commentaires de la version -->
            ${currentVersion.comments ? `
                <div class="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div class="flex items-start gap-2">
                        <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                        </svg>
                        <p class="text-sm text-blue-800">${currentVersion.comments}</p>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// Rendu des détails d'un document (pour la sidebar)
function renderDocumentDetails(document) {
    if (!document) return '';
    
    const currentVersion = selectedVersion || document.versions.find(v => v.isCurrent) || document.versions[0];
    const allVersions = document.versions || [];
    
    return `
        <div class="space-y-6">
            <!-- Informations générales -->
            <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 class="font-medium text-gray-700">Informations</h4>
                </div>
                <div class="p-4">
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Nom</span>
                            <span class="text-sm font-medium text-gray-900">${document.name}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Type</span>
                            <span class="text-sm font-medium text-gray-900">Document PDF</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Version actuelle</span>
                            <span class="text-sm font-medium text-blue-900">${currentVersion.version}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Dernière modification</span>
                            <span class="text-sm text-gray-900">${formatDate(currentVersion.date)}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Auteur</span>
                            <span class="text-sm text-gray-900">${currentVersion.author}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Taille</span>
                            <span class="text-sm text-gray-900">${currentVersion.size}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Pages</span>
                            <span class="text-sm text-gray-900">${currentVersion.pages}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Créé le</span>
                            <span class="text-sm text-gray-900">${formatDate(document.versions[0]?.date || new Date())}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Statistiques des versions -->
            <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 class="font-medium text-gray-700">Versions</h4>
                </div>
                <div class="p-4">
                    <div class="grid grid-cols-3 gap-3 mb-4">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-900">${allVersions.length}</div>
                            <div class="text-xs text-gray-600">Total</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-900">${allVersions.filter(v => v.isCurrent).length}</div>
                            <div class="text-xs text-gray-600">Actuelle</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-purple-900">${allVersions.filter(v => !v.isCurrent).length}</div>
                            <div class="text-xs text-gray-600">Anciennes</div>
                        </div>
                    </div>
                    
                    <!-- Timeline des versions -->
                    <div class="version-timeline space-y-3 max-h-60 overflow-y-auto pr-2">
                        ${allVersions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(version => `
                            <div class="version-item p-3 rounded-lg ${version === currentVersion ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'} cursor-pointer transition-all" data-version="${version.version}">
                                <div class="flex items-start gap-2">
                                    <div class="mt-1">
                                        <span class="version-indicator ${version === currentVersion ? 'current' : 'old'}"></span>
                                    </div>
                                    <div class="flex-1">
                                        <div class="flex items-center justify-between">
                                            <span class="font-medium text-sm">${version.version}</span>
                                            <span class="text-xs text-gray-500">${formatDate(version.date)}</span>
                                        </div>
                                        <p class="text-xs text-gray-600 mt-1">${version.author}</p>
                                        ${version.comments ? `
                                            <p class="text-xs text-gray-500 mt-1 italic">"${version.comments}"</p>
                                        ` : ''}
                                        <div class="flex items-center gap-2 mt-2">
                                            <span class="text-xs text-gray-500">📄 ${version.pages} pages</span>
                                            <span class="text-xs text-gray-500">•</span>
                                            <span class="text-xs text-gray-500">💾 ${version.size}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Rendu des détails d'un dossier (pour la sidebar)
function renderFolderDetails(folder) {
    if (!folder) return '';
    
    const subFolders = folder.children ? folder.children.filter(c => c.type === 'folder') : [];
    const documents = folder.children ? folder.children.filter(c => c.type === 'document') : [];
    const totalVersions = documents.reduce((acc, doc) => acc + doc.versions.length, 0);
    const totalSize = documents.reduce((acc, doc) => {
        const size = parseFloat(doc.versions[0]?.size) || 0;
        return acc + size;
    }, 0).toFixed(1);
    
    return `
        <div class="space-y-6">
            <!-- Informations générales -->
            <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 class="font-medium text-gray-700">Informations</h4>
                </div>
                <div class="p-4">
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Nom</span>
                            <span class="text-sm font-medium text-gray-900">${folder.name}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Type</span>
                            <span class="text-sm font-medium text-gray-900">Dossier</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Emplacement</span>
                            <span class="text-sm text-gray-900">/${getFolderPath(folder)}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600">Créé le</span>
                            <span class="text-sm text-gray-900">${formatDate(new Date().toISOString())}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Statistiques -->
            <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 class="font-medium text-gray-700">Statistiques</h4>
                </div>
                <div class="p-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="text-center p-3 bg-blue-50 rounded-lg">
                            <div class="text-2xl font-bold text-blue-900">${subFolders.length}</div>
                            <div class="text-xs text-gray-600">Dossier${subFolders.length > 1 ? 's' : ''}</div>
                        </div>
                        <div class="text-center p-3 bg-green-50 rounded-lg">
                            <div class="text-2xl font-bold text-green-900">${documents.length}</div>
                            <div class="text-xs text-gray-600">Document${documents.length > 1 ? 's' : ''}</div>
                        </div>
                        <div class="text-center p-3 bg-purple-50 rounded-lg">
                            <div class="text-2xl font-bold text-purple-900">${totalVersions}</div>
                            <div class="text-xs text-gray-600">Versions</div>
                        </div>
                        <div class="text-center p-3 bg-orange-50 rounded-lg">
                            <div class="text-2xl font-bold text-orange-900">${totalSize} MB</div>
                            <div class="text-xs text-gray-600">Taille totale</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Activité récente -->
            <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 class="font-medium text-gray-700">Activité récente</h4>
                </div>
                <div class="p-4">
                    <div class="space-y-3">
                        <div class="flex items-center gap-3 text-sm">
                            <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span class="text-gray-600">2 documents ajoutés aujourd'hui</span>
                        </div>
                        <div class="flex items-center gap-3 text-sm">
                            <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span class="text-gray-600">1 dossier créé hier</span>
                        </div>
                        <div class="flex items-center gap-3 text-sm">
                            <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
                            <span class="text-gray-600">5 versions modifiées cette semaine</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Rendu de l'état vide
function renderEmptyState() {
    return `
        <div class="h-full flex items-center justify-center">
            <div class="text-center">
                <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path>
                </svg>
                <h4 class="text-lg font-medium text-gray-700 mb-2">Sélectionnez un élément</h4>
                <p class="text-sm text-gray-500">Cliquez sur un dossier ou un document dans l'arborescence pour commencer</p>
            </div>
        </div>
    `;
}

// Fonction pour obtenir le chemin complet d'un dossier
function getFolderPath(folder) {
    return folder.name;
}

// Fonction pour ajuster le zoom
function adjustZoom(delta) {
    zoomLevel = Math.max(50, Math.min(200, zoomLevel + delta));
    const preview = document.querySelector('.pdf-pages');
    if (preview) {
        preview.style.transform = `scale(${zoomLevel/100})`;
    }
    const zoomDisplay = document.querySelector('.zoom-level');
    if (zoomDisplay) {
        zoomDisplay.textContent = `${zoomLevel}%`;
    }
}

// Initialiser les écouteurs d'événements pour les documents
function initDocumentsEventListeners(projectId, folderStructure) {
    // Gestionnaire pour les clics sur les dossiers dans l'arborescence
    document.querySelectorAll('.folder-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // Ne pas déclencher si on clique sur le bouton toggle ou les actions
            if (e.target.closest('.folder-toggle-btn') || e.target.closest('[data-action]')) return;
            
            const folderId = this.dataset.folderId;
            
            const findFolder = (node, id) => {
                if (node.id === id) return node;
                if (node.children) {
                    for (let child of node.children) {
                        const found = findFolder(child, id);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            const folder = findFolder(folderStructure, folderId);
            if (folder) {
                selectedFolder = folder;
                selectedDocument = null;
                selectedVersion = null;
                renderDocumentsTab(projectId);
            }
        });
    });
    
    // Gestionnaire pour les clics sur les cartes de dossiers (partie droite)
    document.querySelectorAll('.folder-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('[data-action]')) return;
            
            const folderId = this.dataset.folderId;
            
            const findFolder = (node, id) => {
                if (node.id === id) return node;
                if (node.children) {
                    for (let child of node.children) {
                        const found = findFolder(child, id);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            const folder = findFolder(folderStructure, folderId);
            if (folder) {
                selectedFolder = folder;
                selectedDocument = null;
                selectedVersion = null;
                renderDocumentsTab(projectId);
            }
        });
    });
    
    // Gestionnaire pour les clics sur les documents (arborescence et cartes)
    document.querySelectorAll('.document-item, .document-card').forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target.closest('[data-action]')) return;
            
            const docId = this.dataset.documentId;
            
            const findDocument = (node, id) => {
                if (node.id === id) return node;
                if (node.children) {
                    for (let child of node.children) {
                        const found = findDocument(child, id);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            const doc = findDocument(folderStructure, docId);
            if (doc) {
                selectedDocument = doc;
                selectedVersion = doc.versions.find(v => v.isCurrent) || doc.versions[0];
                renderDocumentsTab(projectId);
            }
        });
    });
    
    // Gestionnaire pour les clics sur les versions dans la sidebar
    document.querySelectorAll('.version-item').forEach(item => {
        item.addEventListener('click', function() {
            const versionStr = this.dataset.version;
            if (selectedDocument) {
                const version = selectedDocument.versions.find(v => v.version === versionStr);
                if (version) {
                    selectedVersion = version;
                    renderDocumentsTab(projectId);
                }
            }
        });
    });
    
    // Gestionnaire pour le sélecteur de version
    const versionSelector = document.getElementById('versionSelector');
    if (versionSelector) {
        versionSelector.addEventListener('change', function(e) {
            const versionIndex = parseInt(e.target.value);
            if (selectedDocument && selectedDocument.versions[versionIndex]) {
                selectedVersion = selectedDocument.versions[versionIndex];
                renderDocumentsTab(projectId);
            }
        });
    }
    
    // Gestionnaire pour le bouton toggle des dossiers
    document.querySelectorAll('.folder-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const folderId = this.dataset.folderId;
            
            if (expandedFolders.has(folderId)) {
                expandedFolders.delete(folderId);
            } else {
                expandedFolders.add(folderId);
            }
            
            renderDocumentsTab(projectId);
        });
    });
    
    // Gestionnaire pour le zoom dans l'aperçu
    document.querySelectorAll('.zoom-btn-preview').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const delta = parseInt(this.dataset.zoom);
            adjustZoom(delta);
        });
    });
    
    // Bouton tout réduire
    const collapseAllBtn = document.querySelector('.collapse-all-btn');
    if (collapseAllBtn) {
        collapseAllBtn.addEventListener('click', function() {
            expandedFolders.clear();
            // Garder seulement le dossier racine
            expandedFolders.add(folderStructure.id);
            renderDocumentsTab(projectId);
        });
    }
    
    // Bouton tout développer
    const expandAllBtn = document.querySelector('.expand-all-btn');
    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', function() {
            // Fonction pour collecter tous les IDs de dossiers
            const collectFolderIds = (node) => {
                expandedFolders.add(node.id);
                if (node.children) {
                    node.children.forEach(child => {
                        if (child.type === 'folder') {
                            collectFolderIds(child);
                        }
                    });
                }
            };
            collectFolderIds(folderStructure);
            renderDocumentsTab(projectId);
        });
    }
    
    // Bouton toggle détails
    const toggleDetailsBtn = document.getElementById('toggleDetailsBtn');
    if (toggleDetailsBtn) {
        toggleDetailsBtn.addEventListener('click', function() {
            detailsSidebarOpen = !detailsSidebarOpen;
            const sidebar = document.getElementById('detailsSidebar');
            if (sidebar) {
                sidebar.classList.toggle('open');
            }
        });
    }
    
    // Bouton fermer détails
    const closeDetailsBtn = document.getElementById('closeDetailsBtn');
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', function() {
            detailsSidebarOpen = false;
            const sidebar = document.getElementById('detailsSidebar');
            if (sidebar) {
                sidebar.classList.remove('open');
            }
        });
    }
    
    // Gestionnaire pour le menu à 3 points
    const threeDotsBtn = document.getElementById('threeDotsBtn');
    const threeDotsMenu = document.getElementById('threeDotsMenu');
    
    if (threeDotsBtn && threeDotsMenu) {
        threeDotsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            threeDotsMenu.classList.toggle('hidden');
        });
        
        // Fermer le menu si on clique ailleurs
        document.addEventListener('click', function(e) {
            if (!e.target.closest('#threeDotsBtn') && !e.target.closest('#threeDotsMenu')) {
                threeDotsMenu.classList.add('hidden');
            }
        });
    }
    
    // Gestionnaire pour les actions du menu à 3 points
    document.querySelectorAll('.three-dots-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const action = this.dataset.action;
            
            // Fermer le menu
            const menu = document.getElementById('threeDotsMenu');
            if (menu) {
                menu.classList.add('hidden');
            }
            
            handleDocumentAction(action, selectedDocument, selectedFolder);
        });
    });
    
    // Gestionnaire pour les actions rapides
    document.addEventListener('click', function(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;
        
        const action = actionBtn.dataset.action;
        
        // Ne pas traiter les actions déjà gérées par le menu à 3 points
        if (action === 'rename' || action === 'duplicate' || action === 'move' || 
            action === 'download' || action === 'share' || action === 'delete' ||
            action === 'new-folder' || action === 'new-document' || action === 'upload') {
            return;
        }
        
        switch(action) {
            case 'quick-download':
                if (selectedDocument) {
                    alert(`Téléchargement de ${selectedDocument.name} simulé`);
                }
                break;
            case 'quick-share':
                if (selectedDocument) {
                    alert(`Partage de ${selectedDocument.name} simulé`);
                }
                break;
            case 'folder-options':
            case 'doc-options':
            case 'doc-quick-options':
                // Ouvrir le menu à 3 points
                if (threeDotsMenu) {
                    threeDotsMenu.classList.toggle('hidden');
                }
                break;
            case 'upload':
                handleDocumentAction('upload', selectedDocument, selectedFolder);
                break;
        }
    });
}

function handleDocumentAction(action, document, folder) {
    switch(action) {
        case 'rename':
            const newName = prompt(`Nouveau nom pour ${document ? document.name : folder.name}:`);
            if (newName) {
                if (document) {
                    document.name = newName;
                } else if (folder) {
                    folder.name = newName;
                }
                renderDocumentsTab(appState.currentProjectId);
            }
            break;
            
        case 'duplicate':
            alert(`Duplication de ${document ? document.name : folder.name} simulée`);
            break;
            
        case 'move':
            alert(`Déplacement de ${document ? document.name : folder.name} simulé`);
            break;
            
        case 'download':
            alert(`Téléchargement de ${document ? document.name : 'éléments'} simulé`);
            break;
            
        case 'share':
            alert(`Partage de ${document ? document.name : 'dossier'} simulé`);
            break;
            
        case 'delete':
            if (confirm(`Supprimer ${document ? document.name : folder.name} ?`)) {
                alert(`Suppression simulée de ${document ? document.name : folder.name}`);
                if (document) {
                    selectedDocument = null;
                } else if (folder) {
                    selectedFolder = null;
                }
                renderDocumentsTab(appState.currentProjectId);
            }
            break;
            
        case 'new-document':
            const docName = prompt('Nom du nouveau document:');
            if (docName && folder) {
                alert(`Création du document ${docName} simulée`);
            }
            break;
            
        case 'new-folder':
            const folderName = prompt('Nom du nouveau dossier:');
            if (folderName && folder) {
                const newFolder = {
                    id: `folder${Date.now()}`,
                    name: folderName,
                    type: 'folder',
                    children: []
                };
                folder.children.push(newFolder);
                renderDocumentsTab(appState.currentProjectId);
            }
            break;
            
        case 'upload':
            alert('Upload de fichier simulé');
            break;
            
        default:
            console.log('Action non gérée:', action);
    }
}

// Rendre adjustZoom accessible globalement
window.adjustZoom = adjustZoom;