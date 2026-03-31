// Module Signalements avec carte Leaflet
const IssuesMapModule = (function () {
    // État du module
    let state = {
        viewMode: 'map', // 'map' ou 'list'
        selectedIssueId: null,
        filters: {
            status: 'all',
            severity: 'all',
            type: 'all'
        },
        map: null,
        markers: [],
        currentLatLng: null,
        sortBy: 'date',
        sortOrder: 'desc'
    };

    // Données mockées pour les signalements avec coordonnées GPS
    const mockIssues = [
        {
            id: 'issue1',
            title: 'Affaissement tranchée',
            description: 'Affaissement constaté sur la tranchée EU après les intempéries',
            type: 'desordre',
            taskId: '2-2-2',
            taskName: 'Tranchée EP',
            phase: 'Terrassement',
            responsable: 'Bernard',
            status: 'en_cours',
            severity: 'critique',
            impact: true,
            location: {
                lat: 45.764043,
                lng: 4.835659,
                address: 'Lot B, zone technique'
            },
            dateCreation: '2024-03-15',
            dateResolution: null,
            createdBy: 'Dupont',
            attachments: [],
            history: [
                {
                    date: '2024-03-15',
                    user: 'Dupont',
                    action: 'Création',
                    comment: 'Signalement créé'
                }
            ],
            comments: []
        },
        {
            id: 'issue2',
            title: 'Défaut de compactage',
            description: 'Zone mal compactée sur la couche de fondation',
            type: 'non-conformite',
            taskId: '4-1-2',
            taskName: 'Mise en œuvre',
            phase: 'Voirie',
            responsable: 'Dupont',
            status: 'ouvert',
            severity: 'moyenne',
            impact: true,
            location: {
                lat: 45.764156,
                lng: 4.836892,
                address: 'Lot A, secteur nord'
            },
            dateCreation: '2024-03-14',
            dateResolution: null,
            createdBy: 'Bernard',
            attachments: [],
            history: [
                {
                    date: '2024-03-14',
                    user: 'Bernard',
                    action: 'Création',
                    comment: 'Signalement créé'
                }
            ],
            comments: []
        },
        {
            id: 'issue3',
            title: 'Réseau électrique endommagé',
            description: 'Câble électrique sectionné lors des fouilles',
            type: 'incident',
            taskId: '2-2-1',
            taskName: 'Tranchée EU',
            phase: 'Terrassement',
            responsable: 'Martin',
            status: 'resolu',
            severity: 'critique',
            impact: true,
            location: {
                lat: 45.763892,
                lng: 4.835102,
                address: 'Intersection lots A et B'
            },
            dateCreation: '2024-03-10',
            dateResolution: '2024-03-12',
            resolutionComment: 'Câble réparé, test OK',
            createdBy: 'Leroy',
            attachments: [],
            history: [
                {
                    date: '2024-03-10',
                    user: 'Leroy',
                    action: 'Création',
                    comment: 'Signalement créé'
                },
                {
                    date: '2024-03-12',
                    user: 'Martin',
                    action: 'Résolution',
                    comment: 'Câble réparé, test OK'
                }
            ],
            comments: []
        },
        {
            id: 'issue4',
            title: 'Problème alignement bordures',
            description: 'Défaut d\'alignement sur les bordures de trottoir',
            type: 'non-conformite',
            taskId: '4-2',
            taskName: 'Couche de base',
            phase: 'Voirie',
            responsable: 'Bernard',
            status: 'ouvert',
            severity: 'faible',
            impact: false,
            location: {
                lat: 45.764321,
                lng: 4.836451,
                address: 'Trottoir sud'
            },
            dateCreation: '2024-03-13',
            dateResolution: null,
            createdBy: 'Petit',
            attachments: [],
            history: [
                {
                    date: '2024-03-13',
                    user: 'Petit',
                    action: 'Création',
                    comment: 'Signalement créé'
                }
            ],
            comments: []
        },
        {
            id: 'issue5',
            title: 'Zone inondée après orage',
            description: 'Accumulation d\'eau dans la fouille',
            type: 'desordre',
            taskId: '2-2',
            taskName: 'Déblais VRD',
            phase: 'Terrassement',
            responsable: 'Dupont',
            status: 'en_cours',
            severity: 'moyenne',
            impact: true,
            location: {
                lat: 45.764567,
                lng: 4.835789,
                address: 'Fouille principale'
            },
            dateCreation: '2024-03-12',
            dateResolution: null,
            createdBy: 'Bernard',
            attachments: [],
            history: [
                {
                    date: '2024-03-12',
                    user: 'Bernard',
                    action: 'Création',
                    comment: 'Signalement créé'
                }
            ],
            comments: []
        },
        {
            id: 'issue6',
            title: 'Absence de signalisation',
            description: 'Zone de travail non signalée, risque pour les piétons',
            type: 'securite',
            taskId: '1-2',
            taskName: 'Clôture chantier',
            phase: 'Installation',
            responsable: 'Bernard',
            status: 'ouvert',
            severity: 'moyenne',
            impact: false,
            location: {
                lat: 45.764789,
                lng: 4.836112,
                address: 'Entrée chantier sud'
            },
            dateCreation: '2024-03-16',
            dateResolution: null,
            createdBy: 'Petit',
            attachments: [],
            history: [
                {
                    date: '2024-03-16',
                    user: 'Petit',
                    action: 'Création',
                    comment: 'Signalement créé'
                }
            ],
            comments: []
        }
    ];

    // Types de signalements avec icônes modernes (Font Awesome)
    const issueTypes = [
        { id: 'incident', label: 'Incident', icon: 'fa-bolt', color: '#EF4444', bgColor: '#FEE2E2' },
        { id: 'non-conformite', label: 'Non-conformité', icon: 'fa-times-circle', color: '#F59E0B', bgColor: '#FEF3C7' },
        { id: 'desordre', label: 'Désordre', icon: 'fa-tools', color: '#3B82F6', bgColor: '#DBEAFE' },
        { id: 'securite', label: 'Sécurité', icon: 'fa-shield-alt', color: '#8B5CF6', bgColor: '#EDE9FE' },
        { id: 'qualite', label: 'Qualité', icon: 'fa-check-circle', color: '#10B981', bgColor: '#D1FAE5' }
    ];

    // Statuts
    const statusConfig = {
        'ouvert': { label: 'Ouvert', color: 'text-red-700 bg-red-100', icon: 'fa-circle' },
        'en_cours': { label: 'En cours', color: 'text-orange-700 bg-orange-100', icon: 'fa-spinner' },
        'resolu': { label: 'Résolu', color: 'text-green-700 bg-green-100', icon: 'fa-check-circle' }
    };

    // Gravités
    const severityConfig = {
        'faible': { label: 'Faible', color: 'text-yellow-700 bg-yellow-100', icon: 'fa-arrow-down' },
        'moyenne': { label: 'Moyenne', color: 'text-orange-700 bg-orange-100', icon: 'fa-minus' },
        'critique': { label: 'Critique', color: 'text-red-700 bg-red-100', icon: 'fa-arrow-up' }
    };

    // ==================== FONCTIONS UTILITAIRES ====================

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }

    function formatRelativeDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Aujourd'hui";
        if (diffDays === 1) return "Hier";
        if (diffDays < 7) return `Il y a ${diffDays} jours`;
        if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
        return formatDate(dateStr);
    }

    // Filtrer les signalements
    function filterIssues(issues) {
        let filtered = [...issues];

        if (state.filters.status !== 'all') {
            filtered = filtered.filter(i => i.status === state.filters.status);
        }
        if (state.filters.severity !== 'all') {
            filtered = filtered.filter(i => i.severity === state.filters.severity);
        }
        if (state.filters.type !== 'all') {
            filtered = filtered.filter(i => i.type === state.filters.type);
        }

        // Tri
        filtered.sort((a, b) => {
            if (state.sortBy === 'date') {
                return state.sortOrder === 'desc'
                    ? new Date(b.dateCreation) - new Date(a.dateCreation)
                    : new Date(a.dateCreation) - new Date(b.dateCreation);
            }
            if (state.sortBy === 'severity') {
                const severityOrder = { 'critique': 3, 'moyenne': 2, 'faible': 1 };
                return state.sortOrder === 'desc'
                    ? severityOrder[b.severity] - severityOrder[a.severity]
                    : severityOrder[a.severity] - severityOrder[b.severity];
            }
            return 0;
        });

        return filtered;
    }

    // Initialiser la carte Leaflet
    function initMap(containerId, center = [45.764043, 4.835659], zoom = 17) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Conteneur de carte non trouvé:', containerId);
            return null;
        }

        if (state.map) {
            state.map.remove();
            state.map = null;
        }

        state.map = L.map(containerId, {
            center: center,
            zoom: zoom,
            zoomControl: true,
            fadeAnimation: true,
            markerZoomAnimation: true
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(state.map);

        // Ajouter les contrôles de zoom
        L.control.zoom({
            position: 'bottomright'
        }).addTo(state.map);

        setTimeout(() => {
            if (state.map) {
                state.map.invalidateSize();
            }
        }, 200);

        return state.map;
    }

    // Ajouter des marqueurs sur la carte avec icônes modernes
    function addMarkers(issues) {
        if (!state.map) {
            console.error('Carte non initialisée');
            return;
        }

        if (state.markers.length > 0) {
            state.markers.forEach(marker => marker.remove());
            state.markers = [];
        }

        issues.forEach(issue => {
            const type = issueTypes.find(t => t.id === issue.type) || issueTypes[0];
            const status = statusConfig[issue.status];

            // Créer une icône personnalisée avec Font Awesome
            const markerHtml = `
                <div style="
                    background-color: ${type.color};
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 20px;
                    border: 3px solid white;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    cursor: pointer;
                    transition: transform 0.2s;
                ">
                    <i class="fas ${type.icon}"></i>
                </div>
            `;

            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: markerHtml,
                iconSize: [44, 44],
                iconAnchor: [22, 44],
                popupAnchor: [0, -44]
            });

            const marker = L.marker([issue.location.lat, issue.location.lng], {
                icon: customIcon,
                riseOnHover: true
            }).addTo(state.map);

            // Popup avec informations
            const popupContent = `
                <div style="min-width: 260px; padding: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <span style="background-color: ${type.color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                            <i class="fas ${type.icon}" style="font-size: 10px;"></i>
                            ${type.label}
                        </span>
                        <span style="background-color: #F3F4F6; color: #374151; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">
                            <i class="fas ${status.icon}" style="font-size: 10px; margin-right: 4px;"></i>
                            ${status.label}
                        </span>
                    </div>
                    <h4 style="margin: 0 0 8px 0; font-weight: 700; font-size: 16px; color: #111827;">${issue.title}</h4>
                    <p style="margin: 0 0 12px 0; font-size: 12px; color: #6B7280; line-height: 1.5;">${issue.description.substring(0, 80)}${issue.description.length > 80 ? '...' : ''}</p>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 11px; color: #9CA3AF;">
                        <span><i class="fas fa-map-pin" style="margin-right: 4px;"></i> ${issue.location.address}</span>
                        <span>•</span>
                        <span><i class="fas fa-user" style="margin-right: 4px;"></i> ${issue.responsable}</span>
                    </div>
                    <button class="view-issue-btn" data-issue-id="${issue.id}" style="
                        background: #1E3A8A;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 8px;
                        font-size: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        width: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: background 0.2s;
                    ">
                        <i class="fas fa-eye"></i>
                        Voir le détail
                    </button>
                </div>
            `;

            marker.bindPopup(popupContent, {
                maxWidth: 300,
                minWidth: 260,
                className: 'custom-popup'
            });

            marker.on('popupopen', () => {
                initMapEvents();
            });

            state.markers.push(marker);
        });

        if (state.markers.length > 0) {
            const group = L.featureGroup(state.markers);
            state.map.fitBounds(group.getBounds().pad(0.2));
        }
    }

    // ==================== RENDU ====================

    function renderIssuesMapTab(projectId) {
        const tabContent = document.querySelectorAll('.project-tab-content')[6];
        if (!tabContent) return;

        const issues = [...mockIssues];
        const filteredIssues = filterIssues(issues);
        const selectedIssue = issues.find(i => i.id === state.selectedIssueId);

        tabContent.innerHTML = `
            <div class="flex flex-col h-full bg-gray-50">
                <!-- Header avec sélecteur de vue -->
                <div class="bg-white border-b border-gray-200 px-6 py-3">
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-xl font-semibold text-gray-900">Signalements</h2>
                        <button id="addIssueMapBtn" class="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800 transition shadow-sm">
                            <i class="fas fa-plus-circle"></i>
                            Nouveau signalement
                        </button>
                    </div>
                    
                    <!-- Sélecteur de vue -->
                    <div class="flex items-center gap-4 mb-3">
                        <div class="flex bg-gray-100 rounded-lg p-1">
                            <button class="view-mode-btn px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${state.viewMode === 'map' ? 'bg-white shadow text-blue-900' : 'text-gray-600 hover:text-gray-900'}" data-view="map">
                                <i class="fas fa-map-marked-alt"></i>
                                Vue carte
                            </button>
                            <button class="view-mode-btn px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${state.viewMode === 'list' ? 'bg-white shadow text-blue-900' : 'text-gray-600 hover:text-gray-900'}" data-view="list">
                                <i class="fas fa-list"></i>
                                Vue liste
                            </button>
                        </div>
                    </div>
                    
                    <!-- Filtres -->
                    <div class="flex items-center gap-3">
                        <select id="filterStatus" class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            <option value="all">Tous les statuts</option>
                            <option value="ouvert">Ouvert</option>
                            <option value="en_cours">En cours</option>
                            <option value="resolu">Résolu</option>
                        </select>
                        
                        <select id="filterSeverity" class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            <option value="all">Toutes gravités</option>
                            <option value="faible">Faible</option>
                            <option value="moyenne">Moyenne</option>
                            <option value="critique">Critique</option>
                        </select>
                        
                        <select id="filterType" class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            <option value="all">Tous types</option>
                            ${issueTypes.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
                        </select>
                        
                        <div class="flex-1 relative">
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input type="text" id="searchIssues" placeholder="Rechercher un signalement..." 
                                   class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        </div>
                    </div>
                </div>
                
                <!-- Zone principale -->
                <div class="flex flex-1 min-h-0">
                    <!-- Vue carte ou liste -->
                    <div class="${state.viewMode === 'map' ? 'w-2/3' : 'w-2/3'} bg-gray-50 p-4 overflow-auto">
                        ${state.viewMode === 'map' ? `
                            <div class="relative h-full rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                <div id="map" class="absolute inset-0" style="background: #e5e7eb;"></div>
                            </div>
                        ` : `
                            <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                                <div class="flex items-center justify-between mb-4">
                                    <h3 class="text-sm font-medium text-gray-700">Liste des signalements (${filteredIssues.length})</h3>
                                    <div class="flex items-center gap-2">
                                        <button class="sort-btn p-2 text-gray-400 hover:text-gray-600" data-sort="date">
                                            <i class="fas fa-sort-amount-down"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
                                    ${filteredIssues.map(issue => renderIssueListItem(issue)).join('')}
                                    ${filteredIssues.length === 0 ? `
                                        <div class="text-center py-12">
                                            <i class="fas fa-search text-4xl text-gray-300 mb-3"></i>
                                            <p class="text-gray-500">Aucun signalement trouvé</p>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `}
                    </div>
                    
                    <!-- Zone de détail commune -->
                    <div class="w-1/3 bg-white border-l border-gray-200 overflow-y-auto">
                        ${selectedIssue ? renderIssueDetail(selectedIssue) : `
                            <div class="h-full flex items-center justify-center p-6">
                                <div class="text-center">
                                    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <i class="fas fa-map-marked-alt text-3xl text-gray-400"></i>
                                    </div>
                                    <h3 class="text-lg font-medium text-gray-900 mb-2">Aucun signalement sélectionné</h3>
                                    <p class="text-sm text-gray-500 mb-4">Cliquez sur un signalement sur la carte ou dans la liste pour voir ses détails</p>
                                    <button id="quickAddBtn" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800 transition">
                                        <i class="fas fa-plus-circle"></i>
                                        Nouveau signalement
                                    </button>
                                </div>
                            </div>
                        `}
                    </div>
                </div>
            </div>
            
            <!-- Panel overlay pour les actions -->
            <div id="panelOverlay" class="fixed inset-0 bg-black/50 hidden z-40"></div>
        `;

        // Initialiser la carte si en mode map
        if (state.viewMode === 'map') {
            setTimeout(() => {
                const mapContainer = document.getElementById('map');
                if (mapContainer) {
                    mapContainer.style.height = '100%';
                    mapContainer.style.minHeight = '500px';

                    const map = initMap('map');
                    if (map) {
                        addMarkers(filteredIssues);
                        initMapEvents();

                        setTimeout(() => {
                            map.invalidateSize();
                        }, 300);
                    }
                }
            }, 500);
        }

        initEventListeners(issues);
    }

    // Élément de liste pour la vue liste
    function renderIssueListItem(issue) {
        const type = issueTypes.find(t => t.id === issue.type) || issueTypes[0];
        const status = statusConfig[issue.status];
        const severity = severityConfig[issue.severity];
        const isSelected = issue.id === state.selectedIssueId;

        return `
            <div class="issue-list-item p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}" data-issue-id="${issue.id}">
                <div class="flex items-start gap-3">
                    <div style="background-color: ${type.color};" class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0">
                        <i class="fas ${type.icon}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-1">
                            <h4 class="font-medium text-gray-900 truncate">${issue.title}</h4>
                            <span class="text-xs text-gray-400 flex-shrink-0 ml-2">${formatRelativeDate(issue.dateCreation)}</span>
                        </div>
                        <p class="text-xs text-gray-600 mb-2 line-clamp-2">${issue.description}</p>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${status.color}">
                                <i class="fas ${status.icon} text-xs"></i>
                                ${status.label}
                            </span>
                            <span class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${severity.color}">
                                <i class="fas ${severity.icon} text-xs"></i>
                                ${severity.label}
                            </span>
                            <span class="inline-flex items-center gap-1 text-xs text-gray-500">
                                <i class="fas fa-user"></i>
                                ${issue.responsable}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Détail d'un signalement (commun aux deux vues)
    function renderIssueDetail(issue) {
        const type = issueTypes.find(t => t.id === issue.type) || issueTypes[0];
        const status = statusConfig[issue.status];
        const severity = severityConfig[issue.severity];

        return `
            <div class="h-full flex flex-col">
                <!-- En-tête avec actions -->
                <div class="p-6 border-b border-gray-200">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <div style="background-color: ${type?.color || '#1f2937'};" 
                                class="w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl">
                                <i class="fas ${type?.icon || 'fa-question'}"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900">
                                    ${issue?.title || 'Sans titre'}
                                </h3>
                                <span class="text-sm text-gray-500">
                                    #${issue?.id ? issue.id.substring(0, 8) : 'N/A'}
                                </span>
                            </div>
                        </div>
                        <button class="close-detail p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" title="Fermer">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="flex items-center gap-2 flex-wrap mb-4">
                        <span class="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-full ${status?.color || 'bg-gray-100 text-gray-700'}">
                            <i class="fas ${status?.icon || 'fa-circle'}"></i>
                            ${status?.label || 'Inconnu'}
                        </span>
                        <span class="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-full ${severity?.color || 'bg-gray-100 text-gray-700'}">
                            <i class="fas ${severity?.icon || 'fa-exclamation'}"></i>
                            ${severity?.label || 'Non défini'}
                        </span>
                        <span class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full">
                            <i class="fas ${type?.icon || 'fa-tag'}" style="color: ${type?.color || '#6b7280'};"></i>
                            ${type?.label || 'Type inconnu'}
                        </span>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div class="bg-gray-50 rounded-lg p-3">
                            <div class="text-xs text-gray-500 mb-1">Responsable</div>
                            <div class="font-medium flex items-center gap-2">
                                <i class="fas fa-user-circle text-gray-400"></i>
                                ${issue?.responsable || 'Non assigné'}
                            </div>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-3">
                            <div class="text-xs text-gray-500 mb-1">Signalé le</div>
                            <div class="font-medium flex items-center gap-2">
                                <i class="fas fa-calendar text-gray-400"></i>
                                ${issue?.dateCreation ? formatDate(issue.dateCreation) : '—'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Contenu détaillé -->
                <div class="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    <!-- Description -->
                    <div>
                        <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-align-left text-gray-400"></i>
                            Description
                        </h4>
                        <p class="text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
                            ${issue?.description || 'Aucune description'}
                        </p>
                    </div>
                    
                    <!-- Localisation -->
                    <div>
                        <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-map-pin text-gray-400"></i>
                            Localisation
                        </h4>
                        <div class="bg-gray-50 rounded-lg p-4">
                            <p class="text-sm text-gray-600 mb-2">
                                ${issue?.location?.address || 'Adresse non disponible'}
                            </p>
                            <p class="text-xs text-gray-400">
                                Lat: ${issue?.location?.lat ? issue.location.lat.toFixed(6) : '—'},
                                Lng: ${issue?.location?.lng ? issue.location.lng.toFixed(6) : '—'}
                            </p>
                        </div>
                    </div>
                    
                    <!-- Tâche liée -->
                    <div>
                        <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-tasks text-gray-400"></i>
                            Tâche liée
                        </h4>
                        <div class="bg-gray-50 rounded-lg p-4">
                            <p class="text-sm font-medium text-gray-900">
                                ${issue?.taskName || 'Non liée'}
                            </p>
                            <p class="text-xs text-gray-500 mt-1">
                                Phase: ${issue?.phase || '—'}
                            </p>
                        </div>
                    </div>
                    
                    <!-- Historique -->
                    <div>
                        <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-history text-gray-400"></i>
                            Historique
                        </h4>
                        <div class="space-y-3">
                            ${(issue?.history || []).map(event => `
                                <div class="flex gap-3 text-sm">
                                    <div class="flex-shrink-0">
                                        <div class="w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                                    </div>
                                    <div class="flex-1 bg-gray-50 rounded-lg p-3">
                                        <div class="flex items-center justify-between mb-1">
                                            <span class="font-medium text-gray-900">${event.user || '—'}</span>
                                            <span class="text-xs text-gray-400">${event.date ? formatDate(event.date) : '—'}</span>
                                        </div>
                                        <p class="text-sm text-gray-600">${event.comment || ''}</p>
                                    </div>
                                </div>
                            `).join('')}
                            ${(issue?.history || []).length === 0 ? `
                                <p class="text-sm text-gray-400 italic">Aucun historique</p>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Commentaires -->
                    <div>
                        <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <i class="fas fa-comments text-gray-400"></i>
                            Commentaires
                        </h4>
                        <div class="space-y-3 mb-4">
                            ${(issue?.comments || []).map(comment => `
                                <div class="bg-gray-50 rounded-lg p-3">
                                    <div class="flex items-center justify-between mb-1">
                                        <span class="font-medium text-sm text-gray-900">${comment.user || '—'}</span>
                                        <span class="text-xs text-gray-400">${comment.date ? formatDate(comment.date) : '—'}</span>
                                    </div>
                                    <p class="text-sm text-gray-600">${comment.text || ''}</p>
                                </div>
                            `).join('')}
                            ${(issue?.comments || []).length === 0 ? `
                                <p class="text-sm text-gray-400 italic">Aucun commentaire</p>
                            ` : ''}
                        </div>
                        
                        <div class="flex gap-2">
                            <input type="text" id="newComment" placeholder="Ajouter un commentaire..." 
                                class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <button id="addCommentBtn" 
                                    class="px-4 py-2 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800 transition flex items-center gap-2">
                                <i class="fas fa-paper-plane"></i>
                                Envoyer
                            </button>
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    ${issue?.status !== 'resolu' ? `
                    <div class="border-t border-gray-200 pt-4">
                        <h4 class="text-sm font-medium text-gray-700 mb-3">Actions</h4>
                        <div class="space-y-3">
                            <select id="changeStatus" 
                                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="ouvert" ${issue?.status === 'ouvert' ? 'selected' : ''}>Ouvert</option>
                                <option value="en_cours" ${issue?.status === 'en_cours' ? 'selected' : ''}>En cours</option>
                                <option value="resolu">Résolu</option>
                            </select>
                            
                            <textarea id="resolutionComment" rows="2" 
                                    placeholder="Commentaire de résolution..." 
                                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                            
                            <button id="saveIssueChanges" 
                                    class="w-full px-4 py-2 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800 transition flex items-center justify-center gap-2">
                                <i class="fas fa-save"></i>
                                Enregistrer les modifications
                            </button>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            `;

    }

    // Formulaire de nouveau signalement (uniquement sur la vue carte)
    function showNewIssueDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <i class="fas fa-plus-circle text-blue-900"></i>
                            Nouveau signalement
                        </h3>
                        <button class="close-dialog text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-6">
                        <!-- Formulaire -->
                        <div>
                            <form id="newIssueMapForm" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                                    <input type="text" name="title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea name="description" rows="3" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                                </div>
                                
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                        <select name="type" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            ${issueTypes.map(t => `<option value="${t.id}"><i class="fas ${t.icon}"></i> ${t.label}</option>`).join('')}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Gravité</label>
                                        <select name="severity" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="faible">Faible</option>
                                            <option value="moyenne">Moyenne</option>
                                            <option value="critique">Critique</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                                    <select name="responsable" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="Dupont">Dupont</option>
                                        <option value="Martin">Martin</option>
                                        <option value="Bernard">Bernard</option>
                                        <option value="Petit">Petit</option>
                                        <option value="Leroy">Leroy</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Adresse / Lieu</label>
                                    <input type="text" name="address" id="locationAddress" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                
                                <input type="hidden" name="lat" id="locationLat">
                                <input type="hidden" name="lng" id="locationLng">
                            </form>
                        </div>
                        
                        <!-- Carte de sélection -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Cliquez sur la carte pour localiser le problème</label>
                            <div id="newIssueMap" style="height: 350px; width: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem;"></div>
                            <div class="flex items-center justify-between mt-3">
                                <p class="text-xs text-gray-500">
                                    <i class="fas fa-info-circle text-blue-500"></i>
                                    Coordonnées : <span id="selectedCoords">-</span>
                                </p>
                                <button type="button" id="useCurrentLocation" class="text-xs text-blue-900 hover:text-blue-700">
                                    <i class="fas fa-crosshairs"></i>
                                    Ma position
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-200">
                        <button type="button" class="cancel-btn px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Annuler</button>
                        <button type="submit" form="newIssueMapForm" class="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 flex items-center gap-2">
                            <i class="fas fa-save"></i>
                            Créer le signalement
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Initialiser la carte de sélection
        setTimeout(() => {
            const mapContainer = document.getElementById('newIssueMap');
            if (mapContainer) {
                const map = L.map('newIssueMap').setView([45.764043, 4.835659], 17);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; OpenStreetMap'
                }).addTo(map);

                let marker = null;

                map.on('click', (e) => {
                    if (marker) marker.remove();

                    marker = L.marker(e.latlng, {
                        icon: L.divIcon({
                            className: 'custom-marker',
                            html: '<div style="background-color: #1E3A8A; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><i class="fas fa-map-pin"></i></div>',
                            iconSize: [40, 40],
                            iconAnchor: [20, 40]
                        })
                    }).addTo(map);

                    document.getElementById('locationLat').value = e.latlng.lat.toFixed(6);
                    document.getElementById('locationLng').value = e.latlng.lng.toFixed(6);
                    document.getElementById('selectedCoords').innerHTML =
                        `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
                });

                document.getElementById('useCurrentLocation')?.addEventListener('click', () => {
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((position) => {
                            const { latitude, longitude } = position.coords;
                            map.setView([latitude, longitude], 18);

                            if (marker) marker.remove();
                            marker = L.marker([latitude, longitude]).addTo(map);

                            document.getElementById('locationLat').value = latitude.toFixed(6);
                            document.getElementById('locationLng').value = longitude.toFixed(6);
                            document.getElementById('selectedCoords').innerHTML =
                                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                        });
                    }
                });
            }
        }, 100);

        // Gestionnaires
        dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.remove());
        dialog.querySelector('.cancel-btn').addEventListener('click', () => dialog.remove());

        dialog.querySelector('#newIssueMapForm').addEventListener('submit', (e) => {
            e.preventDefault();

            if (!document.getElementById('locationLat').value) {
                alert('Veuillez sélectionner un emplacement sur la carte');
                return;
            }

            const formData = new FormData(e.target);

            const newIssue = {
                id: `issue${Date.now()}`,
                title: formData.get('title'),
                description: formData.get('description'),
                type: formData.get('type'),
                taskId: '2-2',
                taskName: 'Tâche associée',
                phase: 'Terrassement',
                responsable: formData.get('responsable'),
                status: 'ouvert',
                severity: formData.get('severity'),
                impact: true,
                location: {
                    lat: parseFloat(formData.get('lat')),
                    lng: parseFloat(formData.get('lng')),
                    address: formData.get('address')
                },
                dateCreation: new Date().toISOString().split('T')[0],
                dateResolution: null,
                createdBy: 'Martin',
                attachments: [],
                history: [{
                    date: new Date().toISOString().split('T')[0],
                    user: 'Martin',
                    action: 'Création',
                    comment: 'Signalement créé'
                }],
                comments: []
            };

            mockIssues.push(newIssue);
            dialog.remove();
            renderIssuesMapTab(appState.currentProjectId);
        });
    }

    // ==================== ÉVÉNEMENTS ====================

    function initMapEvents() {
        document.querySelectorAll('.view-issue-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const issueId = btn.dataset.issueId;
                const issue = mockIssues.find(i => i.id === issueId);
                if (issue) {
                    state.selectedIssueId = issueId;
                    renderIssuesMapTab(appState.currentProjectId);

                    // Fermer tous les popups
                    if (state.map) {
                        state.map.closePopup();
                    }
                }
            });
        });
    }

    function initEventListeners(issues) {
        // Changement de vue
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.viewMode = btn.dataset.view;
                state.selectedIssueId = null; // Reset sélection au changement de vue
                renderIssuesMapTab(appState.currentProjectId);
            });
        });

        // Filtres
        document.getElementById('filterStatus')?.addEventListener('change', (e) => {
            state.filters.status = e.target.value;
            state.selectedIssueId = null;
            renderIssuesMapTab(appState.currentProjectId);
        });

        document.getElementById('filterSeverity')?.addEventListener('change', (e) => {
            state.filters.severity = e.target.value;
            state.selectedIssueId = null;
            renderIssuesMapTab(appState.currentProjectId);
        });

        document.getElementById('filterType')?.addEventListener('change', (e) => {
            state.filters.type = e.target.value;
            state.selectedIssueId = null;
            renderIssuesMapTab(appState.currentProjectId);
        });

        // Recherche
        document.getElementById('searchIssues')?.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            // Implémenter la recherche
        });

        // Clic sur élément de la liste
        document.querySelectorAll('.issue-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const issueId = item.dataset.issueId;
                state.selectedIssueId = issueId;
                renderIssuesMapTab(appState.currentProjectId);

                // Si en mode carte, centrer sur le marqueur
                if (state.viewMode === 'map' && state.map) {
                    const issue = issues.find(i => i.id === issueId);
                    if (issue) {
                        state.map.setView([issue.location.lat, issue.location.lng], 19);
                    }
                }
            });
        });

        // Bouton nouveau signalement
        document.getElementById('addIssueMapBtn')?.addEventListener('click', () => {
            showNewIssueDialog();
        });

        document.getElementById('quickAddBtn')?.addEventListener('click', () => {
            showNewIssueDialog();
        });

        // Fermer le détail
        document.querySelector('.close-detail')?.addEventListener('click', () => {
            state.selectedIssueId = null;
            renderIssuesMapTab(appState.currentProjectId);
        });
    }

    // API publique
    return {
        render: renderIssuesMapTab
    };
})();

window.renderIssuesMapTab = IssuesMapModule.render;