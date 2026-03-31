// Module Gestion des Problèmes
const IssuesModule = (function() {
    // État du module
    let state = {
        selectedIssueId: null,
        filters: {
            status: 'all',
            severity: 'all',
            impact: 'all',
            responsable: 'all'
        },
        sortBy: 'date',
        sortOrder: 'desc'
    };

    // Données mockées pour les problèmes
    const mockIssues = [
        {
            id: 'issue1',
            title: 'Retard livraison GNT',
            description: 'Le fournisseur annonce un retard de 3 jours sur la livraison de la grave non traitée pour la couche de fondation.',
            taskId: '4-1',
            taskName: 'Fourniture GNT',
            phase: 'Voirie',
            responsable: 'Dupont',
            status: 'ouvert',
            severity: 'critique',
            impact: true,
            dateCreation: '2024-03-15',
            dateResolution: null,
            createdBy: 'Martin',
            attachments: [],
            history: [
                {
                    date: '2024-03-15',
                    user: 'Martin',
                    action: 'Création',
                    comment: 'Problème signalé'
                }
            ],
            comments: []
        },
        {
            id: 'issue2',
            title: 'Problème étanchéité tranchée EP',
            description: 'Infiltration d\'eau constatée dans la tranchée EP après les pluies. Nécessite reprise du compactage.',
            taskId: '2-2-2',
            taskName: 'Tranchée EP',
            phase: 'Terrassement',
            responsable: 'Bernard',
            status: 'en_cours',
            severity: 'moyenne',
            impact: true,
            dateCreation: '2024-03-10',
            dateResolution: null,
            createdBy: 'Bernard',
            attachments: [],
            history: [
                {
                    date: '2024-03-10',
                    user: 'Bernard',
                    action: 'Création',
                    comment: 'Problème signalé'
                },
                {
                    date: '2024-03-11',
                    user: 'Dupont',
                    action: 'Assignation',
                    comment: 'Assigné à Bernard'
                },
                {
                    date: '2024-03-12',
                    user: 'Bernard',
                    action: 'Commentaire',
                    comment: 'Analyse en cours, besoin d\'une pompe'
                }
            ],
            comments: [
                {
                    date: '2024-03-12',
                    user: 'Bernard',
                    text: 'Analyse en cours, besoin d\'une pompe'
                }
            ]
        },
        {
            id: 'issue3',
            title: 'Défaut alignement canalisations EU',
            description: 'Lors du contrôle, les canalisations EU présentent un défaut d\'alignement de 2 cm sur 10 mètres.',
            taskId: '3-2-1',
            taskName: 'Pose EU',
            phase: 'Réseaux',
            responsable: 'Martin',
            status: 'resolu',
            severity: 'faible',
            impact: false,
            dateCreation: '2024-03-05',
            dateResolution: '2024-03-08',
            resolutionComment: 'Reprise localisée effectuée, contrôle OK',
            resolutionAttachments: [],
            createdBy: 'Petit',
            attachments: [],
            history: [
                {
                    date: '2024-03-05',
                    user: 'Petit',
                    action: 'Création',
                    comment: 'Problème signalé'
                },
                {
                    date: '2024-03-06',
                    user: 'Martin',
                    action: 'Prise en charge',
                    comment: 'Je m\'en occupe'
                },
                {
                    date: '2024-03-08',
                    user: 'Martin',
                    action: 'Résolution',
                    comment: 'Reprise effectuée, contrôle OK'
                }
            ],
            comments: []
        },
        {
            id: 'issue4',
            title: 'Absence plans de récolement',
            description: 'Les plans de récolement pour les réseaux humides ne sont pas encore transmis par le BET.',
            taskId: '3',
            taskName: 'Réseaux humides',
            phase: 'Réseaux',
            responsable: 'Martin',
            status: 'ouvert',
            severity: 'moyenne',
            impact: false,
            dateCreation: '2024-03-14',
            dateResolution: null,
            createdBy: 'Dupont',
            attachments: [],
            history: [
                {
                    date: '2024-03-14',
                    user: 'Dupont',
                    action: 'Création',
                    comment: 'Problème signalé'
                }
            ],
            comments: []
        },
        {
            id: 'issue5',
            title: 'Intempéries - Chantier inondé',
            description: 'Fortes pluies ont inondé une partie des fouilles. Nécessite pompage et séchage avant reprise.',
            taskId: '2-2',
            taskName: 'Déblais VRD',
            phase: 'Terrassement',
            responsable: 'Dupont',
            status: 'en_cours',
            severity: 'critique',
            impact: true,
            dateCreation: '2024-03-13',
            dateResolution: null,
            createdBy: 'Bernard',
            attachments: [],
            history: [
                {
                    date: '2024-03-13',
                    user: 'Bernard',
                    action: 'Création',
                    comment: 'Problème signalé'
                },
                {
                    date: '2024-03-14',
                    user: 'Dupont',
                    action: 'Commentaire',
                    comment: 'Pompage en cours, prévoir 2 jours de séchage'
                }
            ],
            comments: [
                {
                    date: '2024-03-14',
                    user: 'Dupont',
                    text: 'Pompage en cours, prévoir 2 jours de séchage'
                }
            ]
        }
    ];

    // Phases disponibles
    const phases = ['Installation', 'Terrassement', 'Réseaux', 'Voirie', 'Finitions'];

    // Responsables
    const responsables = ['Dupont', 'Martin', 'Bernard', 'Petit', 'Leroy'];

    // Statuts
    const statusConfig = {
        'ouvert': { label: 'Ouvert', color: 'bg-red-100 text-red-700', icon: '🔴' },
        'en_cours': { label: 'En cours', color: 'bg-orange-100 text-orange-700', icon: '🟠' },
        'resolu': { label: 'Résolu', color: 'bg-green-100 text-green-700', icon: '✅' }
    };

    // Gravités
    const severityConfig = {
        'faible': { label: 'Faible', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
        'moyenne': { label: 'Moyenne', color: 'bg-orange-100 text-orange-700', icon: '🟠' },
        'critique': { label: 'Critique', color: 'bg-red-100 text-red-700', icon: '🔴' }
    };

    // ==================== FONCTIONS UTILITAIRES ====================

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }

    // Filtrer les problèmes
    function filterIssues(issues) {
        let filtered = [...issues];
        
        if (state.filters.status !== 'all') {
            filtered = filtered.filter(i => i.status === state.filters.status);
        }
        if (state.filters.severity !== 'all') {
            filtered = filtered.filter(i => i.severity === state.filters.severity);
        }
        if (state.filters.impact !== 'all') {
            const impact = state.filters.impact === 'true';
            filtered = filtered.filter(i => i.impact === impact);
        }
        if (state.filters.responsable !== 'all') {
            filtered = filtered.filter(i => i.responsable === state.filters.responsable);
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
            if (state.sortBy === 'status') {
                const statusOrder = { 'ouvert': 3, 'en_cours': 2, 'resolu': 1 };
                return state.sortOrder === 'desc'
                    ? statusOrder[b.status] - statusOrder[a.status]
                    : statusOrder[a.status] - statusOrder[b.status];
            }
            return 0;
        });
        
        return filtered;
    }

    // Compter les problèmes par phase
    function countByPhase(issues) {
        const counts = {};
        phases.forEach(phase => counts[phase] = 0);
        issues.forEach(issue => {
            if (counts[issue.phase] !== undefined) {
                counts[issue.phase]++;
            }
        });
        return counts;
    }

    // ==================== RENDU ====================

    function renderIssuesTab(projectId) {
        const tabContent = document.querySelectorAll('.project-tab-content')[5]; // 5ème onglet (index 4)
        if (!tabContent) return;
        
        const issues = [...mockIssues];
        const filteredIssues = filterIssues(issues);
        const phaseCounts = countByPhase(issues);
        
        tabContent.innerHTML = `
            <div class="flex flex-col h-full">
                <!-- Header -->
                <div class="bg-white border-b border-gray-200 px-6 py-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <h2 class="text-xl font-semibold text-gray-900">Problèmes et signalements</h2>
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                                    ${issues.filter(i => i.status === 'ouvert').length} ouverts
                                </span>
                                <span class="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
                                    ${issues.filter(i => i.status === 'en_cours').length} en cours
                                </span>
                                <span class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                    ${issues.filter(i => i.status === 'resolu').length} résolus
                                </span>
                            </div>
                        </div>
                        <button id="addIssueBtn" class="flex items-center gap-2 px-3 py-1.5 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800 transition">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                            </svg>
                            Ajouter un problème
                        </button>
                    </div>
                    
                    <!-- Vue d'ensemble par phase -->
                    <div class="grid grid-cols-5 gap-3 mt-4">
                        ${phases.map(phase => `
                            <div class="bg-gray-50 rounded-lg p-2 text-center">
                                <div class="text-xs text-gray-500">${phase}</div>
                                <div class="text-lg font-semibold ${phaseCounts[phase] > 0 ? 'text-red-600' : 'text-gray-400'}">
                                    ${phaseCounts[phase] || 0}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- Filtres -->
                    <div class="flex items-center gap-3 mt-4">
                        <select id="filterStatus" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="all">Tous statuts</option>
                            <option value="ouvert">Ouvert</option>
                            <option value="en_cours">En cours</option>
                            <option value="resolu">Résolu</option>
                        </select>
                        
                        <select id="filterSeverity" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="all">Toutes gravités</option>
                            <option value="faible">Faible</option>
                            <option value="moyenne">Moyenne</option>
                            <option value="critique">Critique</option>
                        </select>
                        
                        <select id="filterImpact" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="all">Tous impacts</option>
                            <option value="true">Avec impact</option>
                            <option value="false">Sans impact</option>
                        </select>
                        
                        <select id="filterResponsable" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="all">Tous responsables</option>
                            ${responsables.map(r => `<option value="${r}">${r}</option>`).join('')}
                        </select>
                        
                        <input type="text" id="searchIssues" placeholder="Rechercher..." 
                               class="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                
                <!-- Tableau des problèmes -->
                <div class="flex-1 bg-gray-50 p-4 overflow-auto">
                    <table class="min-w-full bg-white rounded-lg shadow-sm">
                        <thead class="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" data-sort="title">
                                    Titre
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" data-sort="task">
                                    Tâche liée
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" data-sort="responsable">
                                    Responsable
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" data-sort="status">
                                    Statut
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" data-sort="impact">
                                    Impact
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" data-sort="severity">
                                    Gravité
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" data-sort="date">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${filteredIssues.map(issue => renderIssueRow(issue)).join('')}
                        </tbody>
                    </table>
                    
                    ${filteredIssues.length === 0 ? `
                        <div class="text-center py-12">
                            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.698-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                            </svg>
                            <p class="text-gray-500">Aucun problème trouvé</p>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Panel de détail (caché par défaut) -->
            <div id="issueDetailPanel" class="fixed inset-y-0 right-0 w-96 bg-white shadow-xl transform transition-transform duration-300 translate-x-full z-50">
                <div class="h-full flex flex-col">
                    <div class="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                        <h3 class="font-semibold text-gray-900">Détail du problème</h3>
                        <button id="closeDetailPanel" class="p-1 text-gray-400 hover:text-gray-600">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div id="issueDetailContent" class="flex-1 overflow-y-auto p-4">
                        <!-- Le contenu sera injecté dynamiquement -->
                    </div>
                </div>
            </div>
            
            <!-- Overlay pour le panel -->
            <div id="panelOverlay" class="fixed inset-0 bg-black/50 hidden z-40"></div>
        `;
        
        initEventListeners(issues);
    }

    // Rendu d'une ligne du tableau
    function renderIssueRow(issue) {
        const status = statusConfig[issue.status];
        const severity = severityConfig[issue.severity];
        
        return `
            <tr class="hover:bg-gray-50 cursor-pointer" data-issue-id="${issue.id}">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">${issue.title}</td>
                <td class="px-4 py-3 text-sm text-gray-600">
                    <div>
                        <span class="font-medium">${issue.taskName}</span>
                        <div class="text-xs text-gray-400">${issue.phase}</div>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">${issue.responsable}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs rounded-full ${status.color}">${status.icon} ${status.label}</span>
                </td>
                <td class="px-4 py-3">
                    ${issue.impact ? '<span class="text-red-600 text-sm">⚠️ Oui</span>' : '<span class="text-gray-400 text-sm">Non</span>'}
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs rounded-full ${severity.color}">${severity.icon} ${severity.label}</span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500">${formatDate(issue.dateCreation)}</td>
            </tr>
        `;
    }

    // Rendu du panel de détail
    function renderDetailPanel(issue) {
        if (!issue) return '';
        
        const status = statusConfig[issue.status];
        const severity = severityConfig[issue.severity];
        
        return `
            <div class="space-y-6">
                <!-- En-tête -->
                <div>
                    <h4 class="text-lg font-semibold text-gray-900 mb-2">${issue.title}</h4>
                    <div class="flex items-center gap-2 mb-3">
                        <span class="px-2 py-1 text-xs rounded-full ${status.color}">${status.icon} ${status.label}</span>
                        <span class="px-2 py-1 text-xs rounded-full ${severity.color}">${severity.icon} ${severity.label}</span>
                    </div>
                </div>
                
                <!-- Infos rapides -->
                <div class="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <span class="text-gray-500">Responsable</span>
                        <div class="font-medium">${issue.responsable}</div>
                    </div>
                    <div>
                        <span class="text-gray-500">Créé le</span>
                        <div class="font-medium">${formatDate(issue.dateCreation)}</div>
                    </div>
                    <div>
                        <span class="text-gray-500">Tâche liée</span>
                        <div class="font-medium">${issue.taskName}</div>
                    </div>
                    <div>
                        <span class="text-gray-500">Phase</span>
                        <div class="font-medium">${issue.phase}</div>
                    </div>
                    ${issue.dateResolution ? `
                        <div>
                            <span class="text-gray-500">Résolu le</span>
                            <div class="font-medium">${formatDate(issue.dateResolution)}</div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Description -->
                <div>
                    <h5 class="text-sm font-medium text-gray-700 mb-2">Description</h5>
                    <p class="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">${issue.description}</p>
                </div>
                
                <!-- Correction (si résolu) -->
                ${issue.status === 'resolu' && issue.resolutionComment ? `
                    <div>
                        <h5 class="text-sm font-medium text-gray-700 mb-2">Correction apportée</h5>
                        <p class="text-sm text-gray-600 bg-green-50 rounded-lg p-3">${issue.resolutionComment}</p>
                    </div>
                ` : ''}
                
                <!-- Historique -->
                <div>
                    <h5 class="text-sm font-medium text-gray-700 mb-2">Historique</h5>
                    <div class="space-y-3">
                        ${issue.history.map(event => `
                            <div class="text-sm">
                                <div class="flex items-center gap-2 text-gray-500">
                                    <span class="font-medium text-gray-700">${event.user}</span>
                                    <span>•</span>
                                    <span>${formatDate(event.date)}</span>
                                </div>
                                <p class="text-gray-600 mt-1">${event.action} : ${event.comment}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Commentaires -->
                <div>
                    <h5 class="text-sm font-medium text-gray-700 mb-2">Commentaires</h5>
                    <div class="space-y-3 mb-4">
                        ${issue.comments.map(comment => `
                            <div class="bg-gray-50 rounded-lg p-3">
                                <div class="flex items-center justify-between mb-1">
                                    <span class="font-medium text-sm">${comment.user}</span>
                                    <span class="text-xs text-gray-500">${formatDate(comment.date)}</span>
                                </div>
                                <p class="text-sm text-gray-600">${comment.text}</p>
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- Ajouter un commentaire -->
                    <div class="mt-3">
                        <textarea id="newComment" rows="2" placeholder="Ajouter un commentaire..." 
                                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                        <button id="addCommentBtn" class="mt-2 px-3 py-1.5 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800 transition">
                            Ajouter
                        </button>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="pt-4 border-t border-gray-200 space-y-2">
                    ${issue.status !== 'resolu' ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Changer le statut</label>
                            <select id="changeStatus" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="ouvert" ${issue.status === 'ouvert' ? 'selected' : ''}>Ouvert</option>
                                <option value="en_cours" ${issue.status === 'en_cours' ? 'selected' : ''}>En cours</option>
                                <option value="resolu">Résolu</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Réassigner à</label>
                            <select id="reassignResponsable" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                ${responsables.map(r => `
                                    <option value="${r}" ${r === issue.responsable ? 'selected' : ''}>${r}</option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Date résolution prévue</label>
                            <input type="date" id="resolutionDate" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    ` : ''}
                    
                    <button id="saveIssueChanges" class="w-full px-4 py-2 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800 transition mt-4">
                        Enregistrer les modifications
                    </button>
                </div>
            </div>
        `;
    }

    // Formulaire d'ajout de problème
    function showAddIssueDialog(issues) {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Nouveau problème</h3>
                        <button class="close-dialog text-gray-400 hover:text-gray-600">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    
                    <form id="newIssueForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                            <input type="text" name="title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Description détaillée</label>
                            <textarea name="description" rows="3" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Tâche liée</label>
                                <select name="taskId" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Sélectionner une tâche</option>
                                    ${getAllTasks().map(task => `
                                        <option value="${task.id}">${task.title}</option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                                <select name="responsable" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    ${responsables.map(r => `<option value="${r}">${r}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Gravité</label>
                                <select name="severity" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="faible">Faible</option>
                                    <option value="moyenne">Moyenne</option>
                                    <option value="critique">Critique</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Impact sur planning</label>
                                <select name="impact" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="false">Non</option>
                                    <option value="true">Oui</option>
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Date de signalement</label>
                            <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Pièces jointes</label>
                            <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                <input type="file" multiple class="hidden" id="fileInput">
                                <button type="button" id="selectFilesBtn" class="text-blue-900 hover:text-blue-700">Cliquez pour ajouter des fichiers</button>
                                <p class="text-xs text-gray-500 mt-1">PNG, JPG, PDF jusqu'à 10MB</p>
                            </div>
                        </div>
                        
                        <div class="flex justify-end gap-3 pt-4">
                            <button type="button" class="cancel-btn px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Annuler</button>
                            <button type="submit" class="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">Créer le problème</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Gestionnaires
        dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.remove());
        dialog.querySelector('.cancel-btn').addEventListener('click', () => dialog.remove());
        
        dialog.querySelector('#selectFilesBtn').addEventListener('click', () => {
            dialog.querySelector('#fileInput').click();
        });
        
        dialog.querySelector('#newIssueForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            const newIssue = {
                id: `issue${Date.now()}`,
                title: formData.get('title'),
                description: formData.get('description'),
                taskId: formData.get('taskId'),
                taskName: getTaskName(formData.get('taskId')),
                phase: getTaskPhase(formData.get('taskId')),
                responsable: formData.get('responsable'),
                status: 'ouvert',
                severity: formData.get('severity'),
                impact: formData.get('impact') === 'true',
                dateCreation: formData.get('date'),
                dateResolution: null,
                createdBy: 'Martin', // Utilisateur connecté
                attachments: [],
                history: [{
                    date: formData.get('date'),
                    user: 'Martin',
                    action: 'Création',
                    comment: 'Problème signalé'
                }],
                comments: []
            };
            
            issues.push(newIssue);
            dialog.remove();
            renderIssuesTab(appState.currentProjectId);
        });
    }

    // Fonctions d'aide pour les tâches
    function getAllTasks() {
        // Cette fonction devrait récupérer les tâches depuis le module planning
        // Pour l'instant, on retourne un mock
        return [
            { id: '1', title: 'Installation chantier', phase: 'Installation' },
            { id: '1-1', title: 'Base vie', phase: 'Installation' },
            { id: '2', title: 'Terrassement', phase: 'Terrassement' },
            { id: '2-2', title: 'Déblais VRD', phase: 'Terrassement' },
            { id: '3', title: 'Réseaux humides', phase: 'Réseaux' },
            { id: '3-2-1', title: 'Pose EU', phase: 'Réseaux' },
            { id: '4', title: 'Voirie', phase: 'Voirie' },
            { id: '4-1', title: 'Couche de fondation', phase: 'Voirie' }
        ];
    }

    function getTaskName(taskId) {
        const task = getAllTasks().find(t => t.id === taskId);
        return task ? task.title : '';
    }

    function getTaskPhase(taskId) {
        const task = getAllTasks().find(t => t.id === taskId);
        return task ? task.phase : '';
    }

    // ==================== ÉVÉNEMENTS ====================

    function initEventListeners(issues) {
        // Filtres
        document.getElementById('filterStatus')?.addEventListener('change', (e) => {
            state.filters.status = e.target.value;
            renderIssuesTab(appState.currentProjectId);
        });
        
        document.getElementById('filterSeverity')?.addEventListener('change', (e) => {
            state.filters.severity = e.target.value;
            renderIssuesTab(appState.currentProjectId);
        });
        
        document.getElementById('filterImpact')?.addEventListener('change', (e) => {
            state.filters.impact = e.target.value;
            renderIssuesTab(appState.currentProjectId);
        });
        
        document.getElementById('filterResponsable')?.addEventListener('change', (e) => {
            state.filters.responsable = e.target.value;
            renderIssuesTab(appState.currentProjectId);
        });
        
        document.getElementById('searchIssues')?.addEventListener('input', (e) => {
            // Implémenter la recherche
        });
        
        // Tri
        document.querySelectorAll('[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const sortBy = th.dataset.sort;
                if (state.sortBy === sortBy) {
                    state.sortOrder = state.sortOrder === 'desc' ? 'asc' : 'desc';
                } else {
                    state.sortBy = sortBy;
                    state.sortOrder = 'desc';
                }
                renderIssuesTab(appState.currentProjectId);
            });
        });
        
        // Clic sur une ligne pour ouvrir le détail
        document.querySelectorAll('[data-issue-id]').forEach(row => {
            row.addEventListener('click', (e) => {
                const issueId = row.dataset.issueId;
                const issue = issues.find(i => i.id === issueId);
                if (issue) {
                    state.selectedIssueId = issueId;
                    
                    // Mettre à jour le panel
                    const panel = document.getElementById('issueDetailPanel');
                    const content = document.getElementById('issueDetailContent');
                    const overlay = document.getElementById('panelOverlay');
                    
                    content.innerHTML = renderDetailPanel(issue);
                    panel.classList.remove('translate-x-full');
                    overlay.classList.remove('hidden');
                    
                    // Réinitialiser les événements du panel
                    initPanelEvents(issue);
                }
            });
        });
        
        // Ajouter un problème
        document.getElementById('addIssueBtn')?.addEventListener('click', () => {
            showAddIssueDialog(issues);
        });
        
        // Fermer le panel
        document.getElementById('closeDetailPanel')?.addEventListener('click', () => {
            document.getElementById('issueDetailPanel').classList.add('translate-x-full');
            document.getElementById('panelOverlay').classList.add('hidden');
        });
        
        document.getElementById('panelOverlay')?.addEventListener('click', () => {
            document.getElementById('issueDetailPanel').classList.add('translate-x-full');
            document.getElementById('panelOverlay').classList.add('hidden');
        });
    }

    function initPanelEvents(issue) {
        // Ajouter un commentaire
        document.getElementById('addCommentBtn')?.addEventListener('click', () => {
            const commentText = document.getElementById('newComment')?.value;
            if (commentText && commentText.trim()) {
                const newComment = {
                    date: new Date().toISOString().split('T')[0],
                    user: 'Martin', // Utilisateur connecté
                    text: commentText
                };
                issue.comments.push(newComment);
                issue.history.push({
                    date: new Date().toISOString().split('T')[0],
                    user: 'Martin',
                    action: 'Commentaire',
                    comment: commentText
                });
                
                // Re-rendre le panel
                document.getElementById('issueDetailContent').innerHTML = renderDetailPanel(issue);
                initPanelEvents(issue);
            }
        });
        
        // Changer le statut
        document.getElementById('changeStatus')?.addEventListener('change', (e) => {
            // Sera appliqué lors du clic sur Enregistrer
        });
        
        // Réassigner
        document.getElementById('reassignResponsable')?.addEventListener('change', (e) => {
            // Sera appliqué lors du clic sur Enregistrer
        });
        
        // Enregistrer les modifications
        document.getElementById('saveIssueChanges')?.addEventListener('click', () => {
            const newStatus = document.getElementById('changeStatus')?.value;
            const newResponsable = document.getElementById('reassignResponsable')?.value;
            const resolutionDate = document.getElementById('resolutionDate')?.value;
            
            let changes = false;
            
            if (newStatus && newStatus !== issue.status) {
                issue.status = newStatus;
                issue.history.push({
                    date: new Date().toISOString().split('T')[0],
                    user: 'Martin',
                    action: 'Changement statut',
                    comment: `Nouveau statut : ${newStatus}`
                });
                changes = true;
                
                if (newStatus === 'resolu') {
                    issue.dateResolution = resolutionDate || new Date().toISOString().split('T')[0];
                }
            }
            
            if (newResponsable && newResponsable !== issue.responsable) {
                issue.responsable = newResponsable;
                issue.history.push({
                    date: new Date().toISOString().split('T')[0],
                    user: 'Martin',
                    action: 'Réassignation',
                    comment: `Nouveau responsable : ${newResponsable}`
                });
                changes = true;
            }
            
            if (changes) {
                // Re-rendre le panel
                document.getElementById('issueDetailContent').innerHTML = renderDetailPanel(issue);
                initPanelEvents(issue);
                
                // Re-rendre le tableau
                renderIssuesTab(appState.currentProjectId);
            }
        });
    }

    // API publique
    return {
        render: renderIssuesTab
    };
})();

window.renderIssuesTab = IssuesModule.render;