// Module Photos - Encapsulé pour éviter les conflits avec documents.js
const PhotosModule = (function() {
    // Variables privées du module
    let selectedFolder = null;
    let selectedPhoto = null;
    let currentPhotoIndex = 0;
    let expandedFolders = new Set();
    let detailsSidebarOpen = false;
    let photoZoomLevel = 100;

    // Données mockées pour les photos avec arborescence
    const photosArborescence = {
        "ZAC Les Hauts": {
            id: "photos-root",
            name: "Photos du chantier",
            type: "folder",
            children: [
                {
                    id: "photos-folder1",
                    name: "Avancement général",
                    type: "folder",
                    children: [
                        {
                            id: "photo1",
                            name: "Vue d'ensemble - Lot A",
                            type: "photo",
                            thumbnail: "#",
                            date: "2024-02-15",
                            time: "14:30",
                            author: "P. Martin",
                            location: "Lot A",
                            description: "Vue générale du chantier depuis le sud",
                            equipment: "Drone DJI Mavic 3",
                            tags: ["general", "avancement"],
                            versions: [
                                {
                                    id: "v1",
                                    date: "2024-02-01",
                                    url: "#",
                                    comments: "Début des travaux"
                                },
                                {
                                    id: "v2",
                                    date: "2024-02-08",
                                    url: "#",
                                    comments: "Après terrassement"
                                },
                                {
                                    id: "v3",
                                    date: "2024-02-15",
                                    url: "#",
                                    comments: "État actuel",
                                    isCurrent: true
                                }
                            ]
                        },
                        {
                            id: "photo2",
                            name: "Avancement façade nord",
                            type: "photo",
                            thumbnail: "#",
                            date: "2024-02-15",
                            time: "15:45",
                            author: "P. Martin",
                            location: "Façade nord",
                            description: "Évolution de la façade nord",
                            equipment: "Sony A7III",
                            tags: ["facade", "avancement"],
                            versions: [
                                {
                                    id: "v1",
                                    date: "2024-02-05",
                                    url: "#",
                                    comments: "Début façade"
                                },
                                {
                                    id: "v2",
                                    date: "2024-02-12",
                                    url: "#",
                                    comments: "Avancement"
                                },
                                {
                                    id: "v3",
                                    date: "2024-02-15",
                                    url: "#",
                                    comments: "État actuel",
                                    isCurrent: true
                                }
                            ]
                        },
                        {
                            id: "photo3",
                            name: "Vue aérienne zone sud",
                            type: "photo",
                            thumbnail: "#",
                            date: "2024-02-14",
                            time: "11:20",
                            author: "P. Martin",
                            location: "Zone sud",
                            description: "Prise de vue drone de la zone sud",
                            equipment: "Drone DJI Mavic 3",
                            tags: ["aerienne", "general"],
                            versions: [
                                {
                                    id: "v1",
                                    date: "2024-02-14",
                                    url: "#",
                                    comments: "Première prise",
                                    isCurrent: true
                                }
                            ]
                        }
                    ]
                },
                {
                    id: "photos-folder2",
                    name: "Points critiques",
                    type: "folder",
                    children: [
                        {
                            id: "photo4",
                            name: "Réseau électrique - Point de contrôle",
                            type: "photo",
                            thumbnail: "#",
                            date: "2024-02-14",
                            time: "11:20",
                            author: "L. Bernard",
                            location: "Lot B, zone technique",
                            description: "Vérification du raccordement électrique",
                            equipment: "iPhone 15 Pro",
                            tags: ["technique", "controle"],
                            versions: [
                                {
                                    id: "v1",
                                    date: "2024-02-14",
                                    url: "#",
                                    comments: "Avant travaux",
                                    isCurrent: true
                                }
                            ]
                        },
                        {
                            id: "photo5",
                            name: "Problème étanchéité - Toiture",
                            type: "photo",
                            thumbnail: "#",
                            date: "2024-02-13",
                            time: "09:45",
                            author: "L. Bernard",
                            location: "Toiture zone B",
                            description: "Point d'infiltration détecté",
                            equipment: "iPhone 15 Pro",
                            tags: ["probleme", "toiture"],
                            versions: [
                                {
                                    id: "v1",
                                    date: "2024-02-13",
                                    url: "#",
                                    comments: "Détection",
                                    isCurrent: true
                                }
                            ]
                        }
                    ]
                },
                {
                    id: "photos-folder3",
                    name: "Réunions chantier",
                    type: "folder",
                    children: [
                        {
                            id: "photo6",
                            name: "Réunion du 12 février",
                            type: "photo",
                            thumbnail: "#",
                            date: "2024-02-12",
                            time: "10:00",
                            author: "P. Martin",
                            location: "Salle de réunion",
                            description: "Présentation avancement",
                            equipment: "Sony A7III",
                            tags: ["reunion"],
                            versions: [
                                {
                                    id: "v1",
                                    date: "2024-02-12",
                                    url: "#",
                                    comments: "Photo de groupe",
                                    isCurrent: true
                                }
                            ]
                        }
                    ]
                },
                {
                    id: "photos-folder4",
                    name: "Désordres et réserves",
                    type: "folder",
                    children: []
                }
            ]
        }
    };

    // Fonction utilitaire pour formater la date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    // Fonction pour récupérer toutes les photos d'un dossier (récursif)
    function getAllPhotosInFolder(folder) {
        if (!folder || !folder.children) return [];
        
        let photos = [];
        folder.children.forEach(child => {
            if (child.type === 'photo') {
                photos.push(child);
            } else if (child.type === 'folder') {
                photos = photos.concat(getAllPhotosInFolder(child));
            }
        });
        
        return photos;
    }

    // Rendu de l'onglet Photos
    function renderPhotosTab(projectId) {
        const project = mockData.chantiers.find(p => p.id == projectId);
        if (!project) return;
        
        const tabContent = document.querySelectorAll('.project-tab-content')[4];
        if (!tabContent) return;
        
        const projectName = project.nom;
        const folderStructure = photosArborescence[projectName] || { 
            id: "photos-root", 
            name: "Photos du chantier", 
            type: "folder", 
            children: [] 
        };
        
        // Initialiser le dossier racine comme déplié
        if (!selectedFolder && !selectedPhoto) {
            selectedFolder = folderStructure;
            expandedFolders.add(folderStructure.id);
        }
        
        // Récupérer toutes les photos du dossier sélectionné pour le carousel
        const photosInFolder = selectedFolder ? getAllPhotosInFolder(selectedFolder) : [];
        if (selectedPhoto && photosInFolder.length > 0) {
            currentPhotoIndex = photosInFolder.findIndex(p => p.id === selectedPhoto.id);
            if (currentPhotoIndex === -1) currentPhotoIndex = 0;
        }
        
        tabContent.innerHTML = `
            <div class="flex h-full relative">
                <!-- Arborescence des dossiers (gauche) -->
                <div class="w-2/5 bg-white rounded-lg border border-gray-200 shadow-sm p-4 overflow-y-auto" style="max-height: 600px;">
                    <div class="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b">
                        <h3 class="text-lg font-semibold text-gray-900">Photos</h3>
                        <div class="flex items-center gap-2">
                            <button class="photos-collapse-all-btn p-2 text-gray-500 hover:text-blue-900 rounded-lg hover:bg-gray-100" title="Tout réduire">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>
                            <button class="photos-expand-all-btn p-2 text-gray-500 hover:text-blue-900 rounded-lg hover:bg-gray-100" title="Tout développer">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </button>
                            <button class="photos-upload-btn p-2 text-gray-500 hover:text-blue-900 rounded-lg hover:bg-gray-100" title="Uploader des photos">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="folder-tree space-y-1" id="photosFolderTree">
                        ${renderFolderTreeWithPhotos(folderStructure, 0)}
                    </div>
                </div>
                
                <!-- Contenu de la partie droite (dossier ou carousel photo) -->
                <div class="w-3/5 ml-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4 overflow-y-auto" style="max-height: 600px;">
                    <div class="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 border-b">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">${selectedPhoto ? '📷' : '📁'}</span>
                            <h4 class="text-lg font-semibold text-gray-900">
                                ${selectedPhoto ? selectedPhoto.name : (selectedFolder ? selectedFolder.name : 'Sélectionnez un dossier')}
                            </h4>
                            ${selectedPhoto ? `
                                <span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                    ${formatDate(selectedPhoto.date)}
                                </span>
                            ` : ''}
                        </div>
                        
                        <div class="flex items-center gap-2">
                            ${selectedPhoto ? `
                                <!-- Sélecteur de version -->
                                <select id="photosVersionSelector" class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    ${selectedPhoto.versions.map((version, index) => `
                                        <option value="${index}" ${version.isCurrent ? 'selected' : ''}>
                                            ${version.date} - ${version.comments.substring(0, 20)}...
                                        </option>
                                    `).join('')}
                                </select>
                            ` : ''}
                            
                            <!-- Bouton détail -->
                            <button id="photosToggleDetailsBtn" class="p-2 text-gray-500 hover:text-blue-900 rounded-lg hover:bg-gray-100 ${detailsSidebarOpen ? 'bg-blue-50 text-blue-900' : ''}" title="Afficher/masquer les détails">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </button>
                            
                            <!-- Menu à 3 points -->
                            <div class="relative">
                                <button id="photosThreeDotsBtn" class="p-2 text-gray-500 hover:text-blue-900 rounded-lg hover:bg-gray-100">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                                    </svg>
                                </button>
                                
                                <div id="photosThreeDotsMenu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
                                    ${renderThreeDotsMenu(selectedPhoto, selectedFolder)}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Contenu dynamique selon la sélection -->
                    <div id="photosRightPanelContent">
                        ${selectedPhoto ? renderPhotoCarousel(selectedPhoto, photosInFolder) : 
                          (selectedFolder ? renderFolderPhotos(selectedFolder) : renderEmptyState())}
                    </div>
                </div>
            </div>
            
            <!-- Sidebar de détails -->
            <div id="photosDetailsSidebar" class="context-sidebar ${detailsSidebarOpen ? 'open' : ''}">
                <div class="h-full flex flex-col">
                    <div class="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                        <div class="flex items-center">
                            <span class="text-2xl mr-3">${selectedPhoto ? '📷' : '📁'}</span>
                            <div>
                                <h3 class="font-semibold text-gray-900">
                                    ${selectedPhoto ? selectedPhoto.name : selectedFolder ? selectedFolder.name : 'Détails'}
                                </h3>
                                <span class="type-badge ${selectedPhoto ? 'document' : 'folder'} mt-1">
                                    ${selectedPhoto ? 'Photo' : 'Dossier'}
                                </span>
                            </div>
                        </div>
                        <button id="photosCloseDetailsBtn" class="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="flex-1 overflow-y-auto p-4">
                        ${selectedPhoto ? renderPhotoDetails(selectedPhoto) : 
                          (selectedFolder ? renderFolderDetails(selectedFolder) : 
                          '<p class="text-gray-500 text-center py-8">Sélectionnez un élément pour voir ses détails</p>')}
                    </div>
                </div>
            </div>
        `;
        
        initPhotosEventListeners();
    }

    // Rendu de l'arborescence avec photos
    function renderFolderTreeWithPhotos(folder, level = 0) {
        if (!folder) return '';
        
        const isSelected = selectedFolder && selectedFolder.id === folder.id;
        const isExpanded = expandedFolders.has(folder.id);
        const hasChildren = folder.children && folder.children.length > 0;
        
        // Séparer les dossiers et photos
        const subFolders = folder.children ? folder.children.filter(child => child.type === 'folder') : [];
        const photos = folder.children ? folder.children.filter(child => child.type === 'photo') : [];
        
        let html = `<div class="folder-tree-item mb-1">`;
        
        // Ligne du dossier
        html += `
            <div class="folder-item flex items-center p-2 rounded-lg ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}" data-photos-folder-id="${folder.id}">
                <div class="flex items-center flex-1">
                    ${hasChildren ? `
                        <button class="photos-folder-toggle-btn p-1 mr-1 rounded hover:bg-gray-200" data-photos-folder-id="${folder.id}">
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
                    <span class="ml-2 text-xs text-gray-500">(${photos.length} photo${photos.length > 1 ? 's' : ''})</span>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 folder-actions">
                    <button class="p-1 text-gray-500 hover:text-blue-900 rounded" title="Plus d'options" data-photos-action="folder-options" data-photos-folder-id="${folder.id}">
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
                html += renderFolderTreeWithPhotos(child, level + 1);
            });
            
            // Ensuite les photos
            photos.forEach(photo => {
                const isPhotoSelected = selectedPhoto && selectedPhoto.id === photo.id;
                const currentVersion = photo.versions.find(v => v.isCurrent) || photo.versions[0];
                
                html += `
                    <div class="photo-item flex items-center p-2 pl-10 rounded-lg ${isPhotoSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}" data-photos-photo-id="${photo.id}">
                        <div class="flex items-center flex-1">
                            <span class="text-xl mr-2">📷</span>
                            <div class="flex-1">
                                <div class="font-medium text-gray-900 truncate">${photo.name}</div>
                                <div class="flex items-center text-xs text-gray-500">
                                    <span>${photo.date}</span>
                                    <span class="mx-1">•</span>
                                    <span>${photo.author}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="version-badge ${photo.versions.length > 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'} text-xs px-2 py-1 rounded-full">
                                ${photo.versions.length} v
                            </span>
                            <button class="p-1 text-gray-500 hover:text-blue-900 rounded" data-photos-action="photo-options" data-photos-photo-id="${photo.id}">
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

    // Rendu des photos d'un dossier (vue grille)
    function renderFolderPhotos(folder) {
        if (!folder || !folder.children) {
            return '<p class="text-gray-500 text-center py-8">Dossier vide</p>';
        }
        
        const photos = folder.children.filter(child => child.type === 'photo');
        
        if (photos.length === 0) {
            return `
                <div class="text-center py-12">
                    <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <p class="text-gray-500 mb-2">Ce dossier ne contient aucune photo</p>
                    <button class="text-sm text-blue-900 hover:text-blue-700 font-medium" data-photos-action="upload-photos">📤 Uploader des photos</button>
                </div>
            `;
        }
        
        return `
            <div class="grid grid-cols-3 gap-4">
                ${photos.map(photo => renderPhotoThumbnail(photo)).join('')}
            </div>
        `;
    }

    // Rendu d'une vignette photo
    function renderPhotoThumbnail(photo) {
        const currentVersion = photo.versions.find(v => v.isCurrent) || photo.versions[0];
        
        return `
            <div class="photo-thumbnail bg-gray-50 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-300 hover:shadow-md transition-all" data-photos-photo-id="${photo.id}">
                <div class="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
                    <span class="text-4xl">📷</span>
                    ${photo.versions.length > 1 ? `
                        <div class="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                            ${photo.versions.length}
                        </div>
                    ` : ''}
                </div>
                <div class="p-2">
                    <p class="text-sm font-medium text-gray-900 truncate">${photo.name}</p>
                    <p class="text-xs text-gray-500 mt-1">${photo.date} • ${photo.author}</p>
                </div>
            </div>
        `;
    }

    // Rendu du carousel photo
    function renderPhotoCarousel(photo, allPhotos) {
        const currentVersion = photo.versions.find(v => v.isCurrent) || photo.versions[0];
        const currentIndex = allPhotos.findIndex(p => p.id === photo.id);
        const totalPhotos = allPhotos.length;
        
        return `
            <div class="photo-carousel-container">
                <!-- Photo principale -->
                <div class="relative bg-gray-100 rounded-lg overflow-hidden mb-4" style="min-height: 400px;">
                    <!-- Navigation flèches -->
                    <button id="photosPrevBtn" class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg z-10 transition-all ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentIndex === 0 ? 'disabled' : ''}>
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                    </button>
                    <button id="photosNextBtn" class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg z-10 transition-all ${currentIndex === totalPhotos - 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentIndex === totalPhotos - 1 ? 'disabled' : ''}>
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                    
                    <!-- Photo -->
                    <div class="flex items-center justify-center p-8" style="min-height: 400px;">
                        <div class="text-center">
                            <div class="text-9xl mb-4">📷</div>
                            <p class="text-gray-500">Aperçu de la photo</p>
                            <p class="text-sm text-gray-400 mt-2">Version du ${currentVersion.date}</p>
                        </div>
                    </div>
                    
                    <!-- Badge position -->
                    <div class="absolute bottom-4 right-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                        ${currentIndex + 1} / ${totalPhotos}
                    </div>
                </div>
                
                <!-- Miniatures de navigation -->
                <div class="photo-thumbnails flex gap-2 overflow-x-auto pb-2">
                    ${allPhotos.map((p, index) => `
                        <div class="thumbnail-item flex-shrink-0 w-16 h-16 bg-gray-100 rounded border-2 ${p.id === photo.id ? 'border-blue-500' : 'border-transparent'} cursor-pointer hover:border-blue-300 transition-all" data-photos-photo-id="${p.id}" data-photos-index="${index}">
                            <div class="w-full h-full flex items-center justify-center text-2xl">
                                📷
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Informations rapides -->
                <div class="mt-6 grid grid-cols-3 gap-4">
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-xs text-gray-500">Auteur</div>
                        <div class="font-medium text-gray-900">${photo.author}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-xs text-gray-500">Date</div>
                        <div class="font-medium text-gray-900">${formatDate(photo.date)} à ${photo.time}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-xs text-gray-500">Localisation</div>
                        <div class="font-medium text-gray-900">${photo.location}</div>
                    </div>
                </div>
                
                <!-- Description -->
                <div class="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p class="text-sm text-blue-800">${photo.description}</p>
                </div>
                
                <!-- Tags -->
                <div class="mt-4 flex flex-wrap gap-2">
                    ${photo.tags.map(tag => `
                        <span class="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700">#${tag}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Rendu des détails d'une photo
    function renderPhotoDetails(photo) {
        const currentVersion = photo.versions.find(v => v.isCurrent) || photo.versions[0];
        
        return `
            <div class="space-y-6">
                <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h4 class="font-medium text-gray-700">Informations EXIF</h4>
                    </div>
                    <div class="p-4">
                        <div class="space-y-3">
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Appareil</span>
                                <span class="text-sm font-medium text-gray-900">${photo.equipment}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Dimensions</span>
                                <span class="text-sm text-gray-900">5472 × 3648 px</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Résolution</span>
                                <span class="text-sm text-gray-900">300 dpi</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Taille du fichier</span>
                                <span class="text-sm text-gray-900">4.2 MB</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Date de prise</span>
                                <span class="text-sm text-gray-900">${photo.date} ${photo.time}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h4 class="font-medium text-gray-700">Historique des versions</h4>
                    </div>
                    <div class="p-4">
                        <div class="space-y-3">
                            ${photo.versions.map(version => `
                                <div class="p-3 rounded-lg ${version.isCurrent ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'} cursor-pointer" data-photos-version="${version.id}">
                                    <div class="flex items-center justify-between">
                                        <span class="font-medium text-sm">${version.date}</span>
                                        ${version.isCurrent ? '<span class="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">Actuelle</span>' : ''}
                                    </div>
                                    <p class="text-xs text-gray-600 mt-1">${version.comments}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h4 class="font-medium text-gray-700">Localisation</h4>
                    </div>
                    <div class="p-4">
                        <div class="bg-gray-100 h-32 rounded-lg flex items-center justify-center">
                            <span class="text-gray-500">Carte simulée</span>
                        </div>
                        <p class="text-sm text-gray-600 mt-2">${photo.location}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Rendu des détails d'un dossier
    function renderFolderDetails(folder) {
        if (!folder) return '';
        
        const photos = folder.children ? folder.children.filter(c => c.type === 'photo') : [];
        const subFolders = folder.children ? folder.children.filter(c => c.type === 'folder') : [];
        
        return `
            <div class="space-y-6">
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
                                <span class="text-sm text-gray-900">Dossier photo</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Photos</span>
                                <span class="text-sm text-gray-900">${photos.length}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm text-gray-600">Sous-dossiers</span>
                                <span class="text-sm text-gray-900">${subFolders.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h4 class="font-medium text-gray-700">Actions</h4>
                    </div>
                    <div class="p-4">
                        <div class="grid grid-cols-2 gap-2">
                            <button class="action-btn p-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-center" data-photos-action="upload">
                                <svg class="w-5 h-5 mx-auto mb-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"></path>
                                </svg>
                                <span class="text-xs">Uploader</span>
                            </button>
                            <button class="action-btn p-3 bg-gray-50 rounded-lg hover:bg-gray-100 text-center" data-photos-action="download-all">
                                <svg class="w-5 h-5 mx-auto mb-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                </svg>
                                <span class="text-xs">Tout télécharger</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Rendu du menu à 3 points
    function renderThreeDotsMenu(photo, folder) {
        if (photo) {
            return `
                <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-photos-action="download">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                    Télécharger
                </button>
                <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-photos-action="share">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                    </svg>
                    Partager
                </button>
                <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-photos-action="move">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                    </svg>
                    Déplacer
                </button>
                <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-photos-action="rename">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                    Renommer
                </button>
                <div class="border-t border-gray-200 my-1"></div>
                <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2" data-photos-action="delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    Supprimer
                </button>
            `;
        } else if (folder) {
            return `
                <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-photos-action="upload">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"></path>
                    </svg>
                    Uploader des photos
                </button>
                <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-photos-action="new-folder">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-5 5h10a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                    Nouveau dossier
                </button>
                <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-photos-action="download-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                    Tout télécharger
                </button>
                <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2" data-photos-action="rename">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                    Renommer
                </button>
                <div class="border-t border-gray-200 my-1"></div>
                <button class="three-dots-item w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2" data-photos-action="delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    Supprimer
                </button>
            `;
        }
        return '';
    }

    // Rendu de l'état vide
    function renderEmptyState() {
        return `
            <div class="h-full flex items-center justify-center">
                <div class="text-center">
                    <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <h4 class="text-lg font-medium text-gray-700 mb-2">Sélectionnez un dossier</h4>
                    <p class="text-sm text-gray-500">Cliquez sur un dossier dans l'arborescence pour voir ses photos</p>
                </div>
            </div>
        `;
    }

    // Initialiser les écouteurs d'événements
    function initPhotosEventListeners() {
        // Clic sur dossier dans l'arborescence
        document.querySelectorAll('[data-photos-folder-id]').forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target.closest('.photos-folder-toggle-btn') || e.target.closest('[data-photos-action]')) return;
                
                const folderId = this.dataset.photosFolderId;
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
                
                const folder = findFolder(photosArborescence["ZAC Les Hauts"], folderId);
                if (folder) {
                    selectedFolder = folder;
                    selectedPhoto = null;
                    renderPhotosTab(appState.currentProjectId);
                }
            });
        });
        
        // Clic sur photo dans l'arborescence
        document.querySelectorAll('[data-photos-photo-id]').forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target.closest('[data-photos-action]')) return;
                
                const photoId = this.dataset.photosPhotoId;
                const findPhoto = (node, id) => {
                    if (node.id === id) return node;
                    if (node.children) {
                        for (let child of node.children) {
                            const found = findPhoto(child, id);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                
                const photo = findPhoto(photosArborescence["ZAC Les Hauts"], photoId);
                if (photo) {
                    selectedPhoto = photo;
                    renderPhotosTab(appState.currentProjectId);
                }
            });
        });
        
        // Bouton toggle dossier
        document.querySelectorAll('.photos-folder-toggle-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const folderId = this.dataset.photosFolderId;
                
                if (expandedFolders.has(folderId)) {
                    expandedFolders.delete(folderId);
                } else {
                    expandedFolders.add(folderId);
                }
                
                renderPhotosTab(appState.currentProjectId);
            });
        });
        
        // Navigation carousel - précédent
        const prevBtn = document.getElementById('photosPrevBtn');
        if (prevBtn && !prevBtn.hasAttribute('disabled')) {
            prevBtn.addEventListener('click', function() {
                if (!selectedFolder) return;
                const photos = getAllPhotosInFolder(selectedFolder);
                const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
                if (currentIndex > 0) {
                    selectedPhoto = photos[currentIndex - 1];
                    renderPhotosTab(appState.currentProjectId);
                }
            });
        }
        
        // Navigation carousel - suivant
        const nextBtn = document.getElementById('photosNextBtn');
        if (nextBtn && !nextBtn.hasAttribute('disabled')) {
            nextBtn.addEventListener('click', function() {
                if (!selectedFolder) return;
                const photos = getAllPhotosInFolder(selectedFolder);
                const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
                if (currentIndex < photos.length - 1) {
                    selectedPhoto = photos[currentIndex + 1];
                    renderPhotosTab(appState.currentProjectId);
                }
            });
        }
        
        // Clic sur miniature dans le carousel
        document.querySelectorAll('[data-photos-photo-id]').forEach(item => {
            item.addEventListener('click', function() {
                const photoId = this.dataset.photosPhotoId;
                const findPhoto = (node, id) => {
                    if (node.id === id) return node;
                    if (node.children) {
                        for (let child of node.children) {
                            const found = findPhoto(child, id);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                
                const photo = findPhoto(photosArborescence["ZAC Les Hauts"], photoId);
                if (photo) {
                    selectedPhoto = photo;
                    renderPhotosTab(appState.currentProjectId);
                }
            });
        });
        
        // Bouton tout réduire
        const collapseAllBtn = document.querySelector('.photos-collapse-all-btn');
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', function() {
                expandedFolders.clear();
                expandedFolders.add(photosArborescence["ZAC Les Hauts"].id);
                renderPhotosTab(appState.currentProjectId);
            });
        }
        
        // Bouton tout développer
        const expandAllBtn = document.querySelector('.photos-expand-all-btn');
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', function() {
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
                collectFolderIds(photosArborescence["ZAC Les Hauts"]);
                renderPhotosTab(appState.currentProjectId);
            });
        }
        
        // Sélecteur de version
        const versionSelector = document.getElementById('photosVersionSelector');
        if (versionSelector) {
            versionSelector.addEventListener('change', function(e) {
                const versionIndex = parseInt(e.target.value);
                if (selectedPhoto && selectedPhoto.versions[versionIndex]) {
                    selectedPhoto.versions.forEach(v => v.isCurrent = false);
                    selectedPhoto.versions[versionIndex].isCurrent = true;
                    renderPhotosTab(appState.currentProjectId);
                }
            });
        }
        
        // Bouton toggle détails
        const toggleDetailsBtn = document.getElementById('photosToggleDetailsBtn');
        if (toggleDetailsBtn) {
            toggleDetailsBtn.addEventListener('click', function() {
                detailsSidebarOpen = !detailsSidebarOpen;
                const sidebar = document.getElementById('photosDetailsSidebar');
                if (sidebar) {
                    sidebar.classList.toggle('open');
                }
            });
        }
        
        // Bouton fermer détails
        const closeDetailsBtn = document.getElementById('photosCloseDetailsBtn');
        if (closeDetailsBtn) {
            closeDetailsBtn.addEventListener('click', function() {
                detailsSidebarOpen = false;
                const sidebar = document.getElementById('photosDetailsSidebar');
                if (sidebar) {
                    sidebar.classList.remove('open');
                }
            });
        }
        
        // Menu à 3 points
        const threeDotsBtn = document.getElementById('photosThreeDotsBtn');
        const threeDotsMenu = document.getElementById('photosThreeDotsMenu');
        
        if (threeDotsBtn && threeDotsMenu) {
            threeDotsBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                threeDotsMenu.classList.toggle('hidden');
            });
            
            document.addEventListener('click', function(e) {
                if (!e.target.closest('#photosThreeDotsBtn') && !e.target.closest('#photosThreeDotsMenu')) {
                    threeDotsMenu.classList.add('hidden');
                }
            });
        }
        
        // Actions du menu à 3 points
        document.querySelectorAll('[data-photos-action]').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const action = this.dataset.photosAction;
                
                const menu = document.getElementById('photosThreeDotsMenu');
                if (menu) menu.classList.add('hidden');
                
                handlePhotoAction(action, selectedPhoto, selectedFolder);
            });
        });
    }

    // Gestion des actions
    function handlePhotoAction(action, photo, folder) {
        switch(action) {
            case 'download':
                alert(`Téléchargement de ${photo ? photo.name : 'photos'} simulé`);
                break;
            case 'download-all':
                alert(`Téléchargement de tout le dossier simulé`);
                break;
            case 'share':
                alert(`Partage de ${photo ? photo.name : 'dossier'} simulé`);
                break;
            case 'move':
                alert(`Déplacement de ${photo ? photo.name : 'dossier'} simulé`);
                break;
            case 'rename':
                const newName = prompt(`Nouveau nom pour ${photo ? photo.name : folder.name}:`);
                if (newName) {
                    if (photo) {
                        photo.name = newName;
                    } else if (folder) {
                        folder.name = newName;
                    }
                    renderPhotosTab(appState.currentProjectId);
                }
                break;
            case 'delete':
                if (confirm(`Supprimer ${photo ? photo.name : folder.name} ?`)) {
                    alert(`Suppression simulée de ${photo ? photo.name : folder.name}`);
                    if (photo) {
                        selectedPhoto = null;
                    } else if (folder) {
                        selectedFolder = null;
                    }
                    renderPhotosTab(appState.currentProjectId);
                }
                break;
            case 'upload':
                alert('Upload de photos simulé');
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
                    renderPhotosTab(appState.currentProjectId);
                }
                break;
            case 'upload-photos':
                alert('Upload de photos simulé');
                break;
        }
    }

    // API publique du module
    return {
        render: renderPhotosTab
    };
})();

// Rendre la fonction disponible globalement
window.renderPhotosTab = PhotosModule.render;