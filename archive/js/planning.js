// Module Planning - Version avec toggle dans la vue Gantt
const PlanningModule = (function() {
    // État du module
    let state = {
        viewMode: 'gantt', // 'gantt' ou 'list'
        selectedTaskId: null,
        expandedTasks: new Set(['1', '2', '3', '4']), // Par défaut, tout est déplié
        filters: {
            phase: 'all',
            responsable: 'all',
            status: 'all'
        }
    };

    // Données mockées réalistes avec sous-tâches (3 niveaux max)
    const mockTasks = [
        {
            id: '1',
            title: 'Installation chantier',
            phase: 'Installation',
            description: 'Base vie, clôture, signalisation, raccordements provisoires',
            responsable: 'Dupont',
            startDate: '2024-03-01',
            duration: 10,
            endDate: '2024-03-11',
            status: 'done',
            progress: 100,
            parentId: null,
            dependencyId: null,
            children: ['1-1', '1-2', '1-3']
        },
        {
            id: '1-1',
            title: 'Base vie',
            phase: 'Installation',
            description: 'Installation des modules de vie (bureaux, vestiaires, réfectoire)',
            responsable: 'Dupont',
            startDate: '2024-03-01',
            duration: 4,
            endDate: '2024-03-05',
            status: 'done',
            progress: 100,
            parentId: '1',
            dependencyId: null,
            children: ['1-1-1', '1-1-2']
        },
        {
            id: '1-1-1',
            title: 'Modules bureaux',
            phase: 'Installation',
            description: 'Installation des modules de bureaux',
            responsable: 'Dupont',
            startDate: '2024-03-01',
            duration: 2,
            endDate: '2024-03-03',
            status: 'done',
            progress: 100,
            parentId: '1-1',
            dependencyId: null,
            children: []
        },
        {
            id: '1-1-2',
            title: 'Sanitaires',
            phase: 'Installation',
            description: 'Installation sanitaires et réfectoire',
            responsable: 'Dupont',
            startDate: '2024-03-03',
            duration: 2,
            endDate: '2024-03-05',
            status: 'done',
            progress: 100,
            parentId: '1-1',
            dependencyId: '1-1-1',
            children: []
        },
        {
            id: '1-2',
            title: 'Clôture chantier',
            phase: 'Installation',
            description: 'Pose des clôtures et portails',
            responsable: 'Bernard',
            startDate: '2024-03-05',
            duration: 3,
            endDate: '2024-03-08',
            status: 'done',
            progress: 100,
            parentId: '1',
            dependencyId: '1-1',
            children: ['1-2-1', '1-2-2']
        },
        {
            id: '1-2-1',
            title: 'Clôture périphérique',
            phase: 'Installation',
            description: 'Pose clôture grillagée',
            responsable: 'Bernard',
            startDate: '2024-03-05',
            duration: 2,
            endDate: '2024-03-07',
            status: 'done',
            progress: 100,
            parentId: '1-2',
            dependencyId: null,
            children: []
        },
        {
            id: '1-2-2',
            title: 'Portails',
            phase: 'Installation',
            description: 'Pose portails d\'accès',
            responsable: 'Bernard',
            startDate: '2024-03-07',
            duration: 1,
            endDate: '2024-03-08',
            status: 'done',
            progress: 100,
            parentId: '1-2',
            dependencyId: '1-2-1',
            children: []
        },
        {
            id: '1-3',
            title: 'Raccordements',
            phase: 'Installation',
            description: 'Eau, électricité, fibre provisoires',
            responsable: 'Martin',
            startDate: '2024-03-08',
            duration: 3,
            endDate: '2024-03-11',
            status: 'done',
            progress: 100,
            parentId: '1',
            dependencyId: '1-2',
            children: ['1-3-1', '1-3-2']
        },
        {
            id: '1-3-1',
            title: 'Raccordement eau',
            phase: 'Installation',
            description: 'Raccordement eau provisoire',
            responsable: 'Martin',
            startDate: '2024-03-08',
            duration: 1,
            endDate: '2024-03-09',
            status: 'done',
            progress: 100,
            parentId: '1-3',
            dependencyId: null,
            children: []
        },
        {
            id: '1-3-2',
            title: 'Raccordement électricité',
            phase: 'Installation',
            description: 'Raccordement électricité provisoire',
            responsable: 'Martin',
            startDate: '2024-03-09',
            duration: 2,
            endDate: '2024-03-11',
            status: 'done',
            progress: 100,
            parentId: '1-3',
            dependencyId: '1-3-1',
            children: []
        },
        {
            id: '2',
            title: 'Terrassement',
            phase: 'Terrassement',
            description: 'Déblais, remblais, nivellement général',
            responsable: 'Dupont',
            startDate: '2024-03-12',
            duration: 25,
            endDate: '2024-04-06',
            status: 'in_progress',
            progress: 60,
            parentId: null,
            dependencyId: '1',
            children: ['2-1', '2-2', '2-3']
        },
        {
            id: '2-1',
            title: 'Décapage',
            phase: 'Terrassement',
            description: 'Enlèvement terre végétale',
            responsable: 'Dupont',
            startDate: '2024-03-12',
            duration: 5,
            endDate: '2024-03-17',
            status: 'done',
            progress: 100,
            parentId: '2',
            dependencyId: null,
            children: ['2-1-1', '2-1-2']
        },
        {
            id: '2-1-1',
            title: 'Décapage zone A',
            phase: 'Terrassement',
            description: 'Décapage zone A',
            responsable: 'Dupont',
            startDate: '2024-03-12',
            duration: 3,
            endDate: '2024-03-15',
            status: 'done',
            progress: 100,
            parentId: '2-1',
            dependencyId: null,
            children: []
        },
        {
            id: '2-1-2',
            title: 'Décapage zone B',
            phase: 'Terrassement',
            description: 'Décapage zone B',
            responsable: 'Dupont',
            startDate: '2024-03-15',
            duration: 2,
            endDate: '2024-03-17',
            status: 'done',
            progress: 100,
            parentId: '2-1',
            dependencyId: '2-1-1',
            children: []
        },
        {
            id: '2-2',
            title: 'Déblais VRD',
            phase: 'Terrassement',
            description: 'Excavation pour réseaux',
            responsable: 'Bernard',
            startDate: '2024-03-17',
            duration: 12,
            endDate: '2024-03-29',
            status: 'in_progress',
            progress: 75,
            parentId: '2',
            dependencyId: '2-1',
            children: ['2-2-1', '2-2-2']
        },
        {
            id: '2-2-1',
            title: 'Tranchée EU',
            phase: 'Terrassement',
            description: 'Excavation pour EU',
            responsable: 'Bernard',
            startDate: '2024-03-17',
            duration: 4,
            endDate: '2024-03-21',
            status: 'done',
            progress: 100,
            parentId: '2-2',
            dependencyId: null,
            children: []
        },
        {
            id: '2-2-2',
            title: 'Tranchée EP',
            phase: 'Terrassement',
            description: 'Excavation pour EP',
            responsable: 'Bernard',
            startDate: '2024-03-21',
            duration: 8,
            endDate: '2024-03-29',
            status: 'in_progress',
            progress: 62,
            parentId: '2-2',
            dependencyId: '2-2-1',
            children: []
        },
        {
            id: '2-3',
            title: 'Nivellement',
            phase: 'Terrassement',
            description: 'Mise à niveau plateforme',
            responsable: 'Dupont',
            startDate: '2024-03-29',
            duration: 8,
            endDate: '2024-04-06',
            status: 'todo',
            progress: 0,
            parentId: '2',
            dependencyId: '2-2',
            children: ['2-3-1', '2-3-2']
        },
        {
            id: '2-3-1',
            title: 'Nivellement zone A',
            phase: 'Terrassement',
            description: 'Nivellement zone A',
            responsable: 'Dupont',
            startDate: '2024-03-29',
            duration: 4,
            endDate: '2024-04-02',
            status: 'todo',
            progress: 0,
            parentId: '2-3',
            dependencyId: null,
            children: []
        },
        {
            id: '2-3-2',
            title: 'Nivellement zone B',
            phase: 'Terrassement',
            description: 'Nivellement zone B',
            responsable: 'Dupont',
            startDate: '2024-04-02',
            duration: 4,
            endDate: '2024-04-06',
            status: 'todo',
            progress: 0,
            parentId: '2-3',
            dependencyId: '2-3-1',
            children: []
        },
        {
            id: '3',
            title: 'Réseaux humides',
            phase: 'Réseaux',
            description: 'EU, EP, AEP',
            responsable: 'Martin',
            startDate: '2024-04-07',
            duration: 20,
            endDate: '2024-04-27',
            status: 'todo',
            progress: 0,
            parentId: null,
            dependencyId: '2',
            children: ['3-1', '3-2', '3-3']
        },
        {
            id: '3-1',
            title: 'Tranchées EU/EP',
            phase: 'Réseaux',
            description: 'Ouverture des tranchées',
            responsable: 'Bernard',
            startDate: '2024-04-07',
            duration: 8,
            endDate: '2024-04-15',
            status: 'todo',
            progress: 0,
            parentId: '3',
            dependencyId: null,
            children: ['3-1-1', '3-1-2']
        },
        {
            id: '3-1-1',
            title: 'Tranchée EU',
            phase: 'Réseaux',
            description: 'Tranchée pour EU',
            responsable: 'Bernard',
            startDate: '2024-04-07',
            duration: 4,
            endDate: '2024-04-11',
            status: 'todo',
            progress: 0,
            parentId: '3-1',
            dependencyId: null,
            children: []
        },
        {
            id: '3-1-2',
            title: 'Tranchée EP',
            phase: 'Réseaux',
            description: 'Tranchée pour EP',
            responsable: 'Bernard',
            startDate: '2024-04-11',
            duration: 4,
            endDate: '2024-04-15',
            status: 'todo',
            progress: 0,
            parentId: '3-1',
            dependencyId: '3-1-1',
            children: []
        },
        {
            id: '3-2',
            title: 'Pose canalisations',
            phase: 'Réseaux',
            description: 'Pose EU, EP, AEP',
            responsable: 'Martin',
            startDate: '2024-04-15',
            duration: 10,
            endDate: '2024-04-25',
            status: 'todo',
            progress: 0,
            parentId: '3',
            dependencyId: '3-1',
            children: ['3-2-1', '3-2-2']
        },
        {
            id: '3-2-1',
            title: 'Pose EU',
            phase: 'Réseaux',
            description: 'Pose EU',
            responsable: 'Martin',
            startDate: '2024-04-15',
            duration: 4,
            endDate: '2024-04-19',
            status: 'todo',
            progress: 0,
            parentId: '3-2',
            dependencyId: null,
            children: []
        },
        {
            id: '3-2-2',
            title: 'Pose AEP',
            phase: 'Réseaux',
            description: 'Pose AEP',
            responsable: 'Martin',
            startDate: '2024-04-19',
            duration: 6,
            endDate: '2024-04-25',
            status: 'todo',
            progress: 0,
            parentId: '3-2',
            dependencyId: '3-2-1',
            children: []
        },
        {
            id: '3-3',
            title: 'Remblaiement',
            phase: 'Réseaux',
            description: 'Remblai et compactage',
            responsable: 'Bernard',
            startDate: '2024-04-25',
            duration: 2,
            endDate: '2024-04-27',
            status: 'todo',
            progress: 0,
            parentId: '3',
            dependencyId: '3-2',
            children: []
        },
        {
            id: '4',
            title: 'Voirie',
            phase: 'Voirie',
            description: 'Couches de forme et revêtement',
            responsable: 'Dupont',
            startDate: '2024-04-28',
            duration: 15,
            endDate: '2024-05-13',
            status: 'blocked',
            progress: 0,
            parentId: null,
            dependencyId: '3',
            children: ['4-1', '4-2', '4-3']
        },
        {
            id: '4-1',
            title: 'Couche de fondation',
            phase: 'Voirie',
            description: 'Mise en œuvre GNT',
            responsable: 'Dupont',
            startDate: '2024-04-28',
            duration: 6,
            endDate: '2024-05-04',
            status: 'blocked',
            progress: 0,
            parentId: '4',
            dependencyId: null,
            children: ['4-1-1', '4-1-2']
        },
        {
            id: '4-1-1',
            title: 'Fourniture GNT',
            phase: 'Voirie',
            description: 'Livraison grave non traitée',
            responsable: 'Dupont',
            startDate: '2024-04-28',
            duration: 1,
            endDate: '2024-04-29',
            status: 'blocked',
            progress: 0,
            parentId: '4-1',
            dependencyId: null,
            children: []
        },
        {
            id: '4-1-2',
            title: 'Mise en œuvre',
            phase: 'Voirie',
            description: 'Répandage et compactage',
            responsable: 'Dupont',
            startDate: '2024-04-29',
            duration: 5,
            endDate: '2024-05-04',
            status: 'blocked',
            progress: 0,
            parentId: '4-1',
            dependencyId: '4-1-1',
            children: []
        },
        {
            id: '4-2',
            title: 'Couche de base',
            phase: 'Voirie',
            description: 'Mise en œuvre grave bitume',
            responsable: 'Bernard',
            startDate: '2024-05-04',
            duration: 5,
            endDate: '2024-05-09',
            status: 'todo',
            progress: 0,
            parentId: '4',
            dependencyId: '4-1',
            children: []
        },
        {
            id: '4-3',
            title: 'Couche de roulement',
            phase: 'Voirie',
            description: 'Enrobé final',
            responsable: 'Dupont',
            startDate: '2024-05-09',
            duration: 4,
            endDate: '2024-05-13',
            status: 'todo',
            progress: 0,
            parentId: '4',
            dependencyId: '4-2',
            children: []
        }
    ];

    // Phases disponibles
    const phases = ['Installation', 'Terrassement', 'Réseaux', 'Voirie', 'Finitions'];

    // Responsables
    const responsables = ['Dupont', 'Martin', 'Bernard', 'Petit', 'Leroy'];

    // Statuts avec couleurs
    const statusConfig = {
        'todo': { label: 'À faire', color: 'bg-gray-200 text-gray-700', icon: '⭕' },
        'in_progress': { label: 'En cours', color: 'bg-blue-100 text-blue-700', icon: '🔄' },
        'blocked': { label: 'Bloqué', color: 'bg-red-100 text-red-700', icon: '⚠️' },
        'done': { label: 'Terminé', color: 'bg-green-100 text-green-700', icon: '✅' }
    };

    // ==================== FONCTIONS UTILITAIRES ====================

    // Format date JJ/MM
    function formatDateShort(dateStr) {
        const d = new Date(dateStr);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`;
    }

    // Format date complète
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }

    // Calcul date fin = date début + durée
    function calculateEndDate(startDate, duration) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + duration - 1);
        return d.toISOString().split('T')[0];
    }

    // Récupérer toutes les tâches (pour filtrage)
    function getAllTasks(tasks) {
        let result = [];
        tasks.forEach(task => {
            result.push(task);
            if (task.children && task.children.length > 0) {
                const children = tasks.filter(t => task.children.includes(t.id));
                result = result.concat(getAllTasks(children));
            }
        });
        return result;
    }

    // Filtrer les tâches
    function filterTasks(tasks) {
        let filtered = getAllTasks(tasks);
        
        if (state.filters.phase !== 'all') {
            filtered = filtered.filter(t => t.phase === state.filters.phase);
        }
        if (state.filters.responsable !== 'all') {
            filtered = filtered.filter(t => t.responsable === state.filters.responsable);
        }
        if (state.filters.status !== 'all') {
            filtered = filtered.filter(t => t.status === state.filters.status);
        }
        
        return filtered;
    }

    // Mise à jour des dates parents (récursif)
    function updateParentDates(taskId, tasks) {
        const task = tasks.find(t => t.id === taskId);
        if (!task || !task.parentId) return;
        
        const parent = tasks.find(t => t.id === task.parentId);
        if (!parent) return;
        
        // Récupérer tous les enfants du parent
        const children = tasks.filter(t => parent.children.includes(t.id));
        
        // Mise à jour startDate = min des enfants
        parent.startDate = children.reduce((min, child) => 
            child.startDate < min ? child.startDate : min, children[0].startDate);
        
        // Mise à jour endDate = max des enfants
        parent.endDate = children.reduce((max, child) => 
            child.endDate > max ? child.endDate : max, children[0].endDate);
        
        // Mise à jour durée
        const start = new Date(parent.startDate);
        const end = new Date(parent.endDate);
        parent.duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        // Mise à jour progression = moyenne pondérée par durée
        let totalProgress = 0;
        let totalDuration = 0;
        children.forEach(child => {
            totalProgress += child.progress * child.duration;
            totalDuration += child.duration;
        });
        parent.progress = Math.round(totalProgress / totalDuration);
        
        // Mise à jour statut automatique
        if (children.every(c => c.status === 'done')) {
            parent.status = 'done';
        } else if (children.some(c => c.status === 'blocked')) {
            parent.status = 'blocked';
        } else if (children.some(c => c.status === 'in_progress')) {
            parent.status = 'in_progress';
        } else {
            parent.status = 'todo';
        }
        
        // Remonter récursivement
        updateParentDates(parent.id, tasks);
    }

    // Calcul des KPIs globaux
    function calculateKPIs(tasks) {
        const rootTasks = tasks.filter(t => !t.parentId);
        const today = new Date();
        
        let totalProgress = 0;
        let totalDuration = 0;
        let delayed = 0;
        let blocked = 0;
        let minStart = '9999-12-31';
        let maxEnd = '0000-01-01';
        
        rootTasks.forEach(task => {
            // Progression globale
            totalProgress += task.progress * task.duration;
            totalDuration += task.duration;
            
            // Dates projet
            if (task.startDate < minStart) minStart = task.startDate;
            if (task.endDate > maxEnd) maxEnd = task.endDate;
            
            // Tâches en retard
            if (task.status !== 'done' && new Date(task.endDate) < today) {
                delayed++;
            }
            
            // Tâches bloquées
            if (task.status === 'blocked') blocked++;
        });
        
        return {
            globalProgress: totalDuration > 0 ? Math.round(totalProgress / totalDuration) : 0,
            projectStart: minStart,
            projectEnd: maxEnd,
            delayedCount: delayed,
            blockedCount: blocked,
            totalTasks: tasks.length
        };
    }

    // ==================== COMPOSANTS RENDU ====================

    // Header global avec contrôles de vue et filtres
    function renderHeader(tasks) {
        const kpis = calculateKPIs(tasks);
        
        return `
            <div class="bg-white border-b border-gray-200 px-6 py-3">
                <!-- Première ligne : titre et KPIs -->
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-8">
                        <div>
                            <h1 class="text-xl font-semibold text-gray-900">ZAC Les Hauts</h1>
                            <p class="text-xs text-gray-500">Chantier VRD</p>
                        </div>
                        
                        <div class="flex items-center gap-4 text-sm">
                            <div class="flex items-center gap-2">
                                <span class="text-gray-500">Début</span>
                                <span class="font-medium">${formatDate(kpis.projectStart)}</span>
                            </div>
                            <div class="w-px h-4 bg-gray-300"></div>
                            <div class="flex items-center gap-2">
                                <span class="text-gray-500">Fin prévue</span>
                                <span class="font-medium">${formatDate(kpis.projectEnd)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-6">
                        <div class="flex items-center gap-3">
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-gray-500">Avancement</span>
                                <div class="w-24 bg-gray-200 rounded-full h-2">
                                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${kpis.globalProgress}%"></div>
                                </div>
                                <span class="text-sm font-medium">${kpis.globalProgress}%</span>
                            </div>
                            
                            <div class="flex items-center gap-3">
                                ${kpis.delayedCount > 0 ? `
                                    <div class="flex items-center gap-1 text-xs">
                                        <span class="w-2 h-2 bg-red-500 rounded-full"></span>
                                        <span class="text-red-600">${kpis.delayedCount} retard</span>
                                    </div>
                                ` : ''}
                                
                                ${kpis.blockedCount > 0 ? `
                                    <div class="flex items-center gap-1 text-xs">
                                        <span class="w-2 h-2 bg-orange-500 rounded-full"></span>
                                        <span class="text-orange-600">${kpis.blockedCount} bloqué</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <button id="addTaskBtn" class="flex items-center gap-2 px-3 py-1.5 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800 transition">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                            </svg>
                            Ajouter tâche
                        </button>
                    </div>
                </div>
                
                <!-- Deuxième ligne : sélecteur de vue et filtres -->
                <div class="flex items-center gap-4">
                    <div class="flex bg-gray-100 rounded-lg p-1">
                        <button class="view-mode-btn px-3 py-1.5 text-sm rounded-md transition ${state.viewMode === 'gantt' ? 'bg-white shadow text-blue-900' : 'text-gray-600 hover:text-gray-900'}" data-view="gantt">
                            📊 Vue Gantt
                        </button>
                        <button class="view-mode-btn px-3 py-1.5 text-sm rounded-md transition ${state.viewMode === 'list' ? 'bg-white shadow text-blue-900' : 'text-gray-600 hover:text-gray-900'}" data-view="list">
                            📋 Vue Liste
                        </button>
                    </div>
                    
                    <div class="w-px h-6 bg-gray-300"></div>
                    
                    <div class="flex items-center gap-3">
                        <select id="filterPhase" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="all">Toutes phases</option>
                            ${phases.map(p => `<option value="${p}">${p}</option>`).join('')}
                        </select>
                        
                        <select id="filterResponsable" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="all">Tous responsables</option>
                            ${responsables.map(r => `<option value="${r}">${r}</option>`).join('')}
                        </select>
                        
                        <select id="filterStatus" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="all">Tous statuts</option>
                            <option value="todo">À faire</option>
                            <option value="in_progress">En cours</option>
                            <option value="blocked">Bloqué</option>
                            <option value="done">Terminé</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    // Arborescence des tâches pour la colonne gauche du Gantt
    function renderTaskTree(tasks, level = 0) {
        const filteredTasks = tasks.filter(t => !t.parentId);
        
        return filteredTasks.map(task => {
            const isExpanded = state.expandedTasks.has(task.id);
            const isSelected = state.selectedTaskId === task.id;
            const status = statusConfig[task.status];
            const children = tasks.filter(t => task.children.includes(t.id));
            
            return `
                <div class="task-tree-item">
                    <div class="flex items-center gap-1 py-1 px-2 rounded hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}" data-task-id="${task.id}">
                        <button class="task-toggle w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600" data-task-id="${task.id}">
                            ${children.length > 0 ? `
                                <svg class="w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                </svg>
                            ` : '<span class="w-4"></span>'}
                        </button>
                        
                        <div class="flex-1 flex items-center gap-2 cursor-pointer" data-task-id="${task.id}">
                            <span class="text-sm">${status.icon}</span>
                            <span class="text-sm font-medium truncate" style="max-width: 150px;">${task.title}</span>
                            <span class="text-xs text-gray-500">${task.progress}%</span>
                        </div>
                    </div>
                    
                    ${isExpanded && children.length > 0 ? `
                        <div class="ml-6">
                            ${renderTaskTree(children, level + 1)}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // Vue Gantt avec toggles
    function renderGanttView(tasks) {
        // Calculer la période totale
        const allTasks = getAllTasks(tasks);
        const allDates = allTasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));
        const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
        const today = new Date();
        const todayPosition = ((today - minDate) / (1000 * 60 * 60 * 24) / totalDays) * 100;
        
        // Générer les en-têtes de semaine
        const weeks = [];
        let currentWeek = new Date(minDate);
        while (currentWeek <= maxDate) {
            weeks.push(new Date(currentWeek));
            currentWeek.setDate(currentWeek.getDate() + 7);
        }
        
        // Fonction pour rendre une barre de tâche avec toggle
        function renderTaskBar(task, level = 0) {
            const start = new Date(task.startDate);
            const end = new Date(task.endDate);
            const startOffset = ((start - minDate) / (1000 * 60 * 60 * 24)) / totalDays * 100;
            const width = ((end - start) / (1000 * 60 * 60 * 24) + 1) / totalDays * 100;
            
            const statusColor = {
                'todo': 'bg-gray-300',
                'in_progress': 'bg-blue-500',
                'blocked': 'bg-red-500',
                'done': 'bg-green-500'
            }[task.status];
            
            const isExpanded = state.expandedTasks.has(task.id);
            const children = tasks.filter(t => task.children.includes(t.id));
            
            return `
                <div class="gantt-row-group">
                    <div class="gantt-row flex items-center h-8" data-task-id="${task.id}">
                        <div class="gantt-task-name w-64 flex-shrink-0 text-sm truncate flex items-center" style="padding-left: ${level * 16}px">
                            ${children.length > 0 ? `
                                <button class="task-toggle w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 mr-1" data-task-id="${task.id}">
                                    <svg class="w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                    </svg>
                                </button>
                            ` : '<span class="w-6"></span>'}
                            <span class="cursor-pointer" data-task-id="${task.id}">${task.title}</span>
                        </div>
                        <div class="gantt-bars flex-1 relative h-full">
                            <div class="absolute top-1 h-6 rounded ${statusColor} cursor-pointer hover:opacity-80 transition" 
                                 style="left: ${startOffset}%; width: ${width}%;"
                                 title="${task.title}\nDébut: ${formatDate(task.startDate)}\nFin: ${formatDate(task.endDate)}"
                                 data-task-id="${task.id}">
                                <div class="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium">
                                    ${task.duration}j
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${isExpanded && children.length > 0 ? 
                        children.map(child => renderTaskBar(child, level + 1)).join('') 
                    : ''}
                </div>
            `;
        }
        
        const rootTasks = tasks.filter(t => !t.parentId);
        
        return `
            <div class="gantt-container overflow-x-auto">
                <div class="gantt-header flex border-b border-gray-200 pb-2 mb-2" style="min-width: ${weeks.length * 80}px">
                    <div class="w-64 flex-shrink-0"></div>
                    ${weeks.map(week => `
                        <div class="text-center text-xs text-gray-500" style="width: 80px; flex-shrink: 0;">
                            S${week.getWeekNumber()}
                            <div class="text-[10px] text-gray-400">${formatDateShort(week.toISOString())}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="gantt-body relative" style="min-width: ${weeks.length * 80}px">
                    <!-- Ligne du jour actuel -->
                    <div class="absolute top-0 bottom-0 w-px bg-red-400 z-10" style="left: calc(256px + ${todayPosition}%);"></div>
                    
                    ${rootTasks.map(task => renderTaskBar(task, 0)).join('')}
                </div>
            </div>
        `;
    }

    // Vue Liste
    function renderListView(tasks) {
        return `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tâche</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phase</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsable</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Début</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durée</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fin</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${renderListRows(tasks.filter(t => !t.parentId), 0, tasks)}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderListRows(tasks, level, allTasks) {
        return tasks.map(task => {
            const status = statusConfig[task.status];
            const isExpanded = state.expandedTasks.has(task.id);
            const children = allTasks.filter(t => task.children.includes(t.id));
            
            return `
                <tr class="hover:bg-gray-50 cursor-pointer ${state.selectedTaskId === task.id ? 'bg-blue-50' : ''}" data-task-id="${task.id}">
                    <td class="px-4 py-3 text-sm" style="padding-left: ${level * 20 + 16}px">
                        <div class="flex items-center gap-2">
                            ${children.length > 0 ? `
                                <button class="task-toggle w-4 h-4 flex items-center justify-center" data-task-id="${task.id}">
                                    <svg class="w-4 h-4 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                    </svg>
                                </button>
                            ` : '<span class="w-4"></span>'}
                            <span>${task.title}</span>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-sm">${task.phase}</td>
                    <td class="px-4 py-3 text-sm">${task.responsable}</td>
                    <td class="px-4 py-3 text-sm">${formatDateShort(task.startDate)}</td>
                    <td class="px-4 py-3 text-sm">${task.duration}j</td>
                    <td class="px-4 py-3 text-sm">${formatDateShort(task.endDate)}</td>
                    <td class="px-4 py-3">
                        <span class="px-2 py-1 text-xs rounded-full ${status.color}">${status.label}</span>
                    </td>
                    <td class="px-4 py-3 text-sm">
                        <div class="flex items-center gap-2">
                            <span>${task.progress}%</span>
                            <div class="w-12 bg-gray-200 rounded-full h-1.5">
                                <div class="bg-blue-600 h-1.5 rounded-full" style="width: ${task.progress}%"></div>
                            </div>
                        </div>
                    </td>
                </tr>
                ${isExpanded && children.length > 0 ? 
                    renderListRows(children, level + 1, allTasks) 
                : ''}
            `;
        }).join('');
    }

    // Panneau de détail (1/3 de largeur)
    function renderDetailPanel(task, tasks) {
        if (!task) {
            return `
                <div class="h-full flex items-center justify-center text-gray-400">
                    <div class="text-center">
                        <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        <p class="text-sm">Sélectionnez une tâche</p>
                    </div>
                </div>
            `;
        }
        
        const allTasks = getAllTasks(tasks);
        const availableTasks = allTasks.filter(t => t.id !== task.id && !t.parentId);
        
        return `
            <div class="p-5 space-y-6 overflow-y-auto" style="max-height: calc(100vh - 180px);">
                <!-- Section 1 : Infos de base -->
                <div>
                    <h3 class="text-sm font-medium text-gray-700 mb-3">Informations</h3>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs text-gray-500 mb-1">Titre</label>
                            <input type="text" id="editTitle" value="${task.title}" 
                                   class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Phase</label>
                                <select id="editPhase" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    ${phases.map(p => `<option value="${p}" ${p === task.phase ? 'selected' : ''}>${p}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Responsable</label>
                                <select id="editResponsable" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    ${responsables.map(r => `<option value="${r}" ${r === task.responsable ? 'selected' : ''}>${r}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-xs text-gray-500 mb-1">Statut</label>
                            <select id="editStatus" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>À faire</option>
                                <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>En cours</option>
                                <option value="blocked" ${task.status === 'blocked' ? 'selected' : ''}>Bloqué</option>
                                <option value="done" ${task.status === 'done' ? 'selected' : ''}>Terminé</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Section 2 : Planning -->
                <div>
                    <h3 class="text-sm font-medium text-gray-700 mb-3">Planning</h3>
                    <div class="space-y-3">
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Date début</label>
                                <input type="date" id="editStartDate" value="${task.startDate}" 
                                       class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Durée (jours)</label>
                                <input type="number" id="editDuration" value="${task.duration}" min="1" 
                                       class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-xs text-gray-500 mb-1">Date fin (calculée)</label>
                            <input type="text" id="editEndDate" value="${formatDate(task.endDate)}" readonly disabled
                                   class="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-500">
                        </div>
                        
                        <div>
                            <label class="block text-xs text-gray-500 mb-1">Dépendance</label>
                            <select id="editDependency" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Aucune</option>
                                ${availableTasks.map(t => `
                                    <option value="${t.id}" ${t.id === task.dependencyId ? 'selected' : ''}>
                                        ${t.title}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Section 3 : Description -->
                <div>
                    <h3 class="text-sm font-medium text-gray-700 mb-3">Description</h3>
                    <textarea id="editDescription" rows="3" 
                              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Ajouter une description...">${task.description || ''}</textarea>
                </div>
                
                <!-- Section 4 : Documents et commentaires (simulation) -->
                <div>
                    <h3 class="text-sm font-medium text-gray-700 mb-3">Documents</h3>
                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-400 text-sm">
                        📎 Glissez des fichiers ou cliquez pour ajouter
                    </div>
                </div>
                
                <div>
                    <h3 class="text-sm font-medium text-gray-700 mb-3">Commentaires</h3>
                    <div class="space-y-2">
                        <div class="text-sm text-gray-500 italic">Aucun commentaire</div>
                        <textarea rows="2" placeholder="Ajouter un commentaire..."
                                  class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                    </div>
                </div>
                
                <!-- Boutons d'action -->
                <div class="pt-4 border-t border-gray-200 space-y-2">
                    <button id="saveTaskBtn" class="w-full px-4 py-2 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800 transition">
                        Enregistrer les modifications
                    </button>
                    <button id="deleteTaskBtn" class="w-full px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition">
                        Supprimer la tâche
                    </button>
                </div>
            </div>
        `;
    }

    // ==================== RENDU PRINCIPAL ====================

    function renderPlanningTab(projectId) {
        const tabContent = document.querySelectorAll('.project-tab-content')[1];
        if (!tabContent) return;
        
        const tasks = [...mockTasks]; // Copie pour modifications
        
        tabContent.innerHTML = `
            <div class="flex flex-col h-full">
                <!-- Header avec contrôles -->
                ${renderHeader(tasks)}
                
                <!-- Layout 2 colonnes : planning (2/3) + détail (1/3) -->
                <div class="flex flex-1 min-h-0">
                    <!-- Zone centrale - Planning (2/3) -->
                    <div class="flex-1 bg-gray-50 p-4 overflow-auto" style="width: 66.666%;">
                        ${state.viewMode === 'gantt' ? renderGanttView(tasks) : renderListView(tasks)}
                    </div>
                    
                    <!-- Panel droit - Détail (1/3) -->
                    <div class="w-1/3 bg-white border-l border-gray-200 overflow-y-auto">
                        ${renderDetailPanel(tasks.find(t => t.id === state.selectedTaskId), tasks)}
                    </div>
                </div>
            </div>
        `;
        
        initEventListeners(tasks);
    }

    // ==================== ÉVÉNEMENTS ====================

    function initEventListeners(tasks) {
        // Changement de vue
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.viewMode = btn.dataset.view;
                renderPlanningTab(appState.currentProjectId);
            });
        });
        
        // Filtres
        document.getElementById('filterPhase')?.addEventListener('change', (e) => {
            state.filters.phase = e.target.value;
            renderPlanningTab(appState.currentProjectId);
        });
        
        document.getElementById('filterResponsable')?.addEventListener('change', (e) => {
            state.filters.responsable = e.target.value;
            renderPlanningTab(appState.currentProjectId);
        });
        
        document.getElementById('filterStatus')?.addEventListener('change', (e) => {
            state.filters.status = e.target.value;
            renderPlanningTab(appState.currentProjectId);
        });
        
        // Sélection d'une tâche (sur le nom ou la barre)
        document.querySelectorAll('[data-task-id]').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('task-toggle')) return;
                const taskId = el.dataset.taskId;
                state.selectedTaskId = taskId;
                renderPlanningTab(appState.currentProjectId);
            });
        });
        
        // Expand/collapse
        document.querySelectorAll('.task-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = btn.dataset.taskId;
                
                if (state.expandedTasks.has(taskId)) {
                    state.expandedTasks.delete(taskId);
                } else {
                    state.expandedTasks.add(taskId);
                }
                
                renderPlanningTab(appState.currentProjectId);
            });
        });
        
        // Nouvelle tâche
        const addBtn = document.getElementById('addTaskBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => showTaskDialog(null, tasks));
        }
        
        // Sauvegarde des modifications
        const saveBtn = document.getElementById('saveTaskBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const task = tasks.find(t => t.id === state.selectedTaskId);
                if (!task) return;
                
                // Récupérer les valeurs
                task.title = document.getElementById('editTitle').value;
                task.phase = document.getElementById('editPhase').value;
                task.responsable = document.getElementById('editResponsable').value;
                task.status = document.getElementById('editStatus').value;
                
                const newStartDate = document.getElementById('editStartDate').value;
                const newDuration = parseInt(document.getElementById('editDuration').value);
                
                if (newStartDate !== task.startDate || newDuration !== task.duration) {
                    task.startDate = newStartDate;
                    task.duration = newDuration;
                    task.endDate = calculateEndDate(newStartDate, newDuration);
                }
                
                task.dependencyId = document.getElementById('editDependency').value || null;
                task.description = document.getElementById('editDescription').value;
                
                // Mettre à jour les parents
                if (task.parentId) {
                    updateParentDates(task.parentId, tasks);
                }
                
                renderPlanningTab(appState.currentProjectId);
                alert('Tâche mise à jour !');
            });
        }
        
        // Suppression
        const deleteBtn = document.getElementById('deleteTaskBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm('Supprimer cette tâche ?')) {
                    const taskId = state.selectedTaskId;
                    const index = tasks.findIndex(t => t.id === taskId);
                    
                    if (index !== -1) {
                        tasks.splice(index, 1);
                        state.selectedTaskId = null;
                        renderPlanningTab(appState.currentProjectId);
                    }
                }
            });
        }
    }

    // Dialogue nouvelle tâche
    function showTaskDialog(parentTask, tasks) {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">
                    ${parentTask ? 'Nouvelle sous-tâche' : 'Nouvelle tâche'}
                </h3>
                <form id="newTaskForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                        <input type="text" name="title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Phase</label>
                            <select name="phase" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                ${phases.map(p => `<option value="${p}">${p}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                            <select name="responsable" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                ${responsables.map(r => `<option value="${r}">${r}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                            <input type="date" name="startDate" required class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Durée (jours)</label>
                            <input type="number" name="duration" min="1" value="5" required class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea name="description" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-4">
                        <button type="button" class="cancel-btn px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Annuler</button>
                        <button type="submit" class="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">Créer</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        dialog.querySelector('.cancel-btn').addEventListener('click', () => dialog.remove());
        dialog.querySelector('#newTaskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            const startDate = formData.get('startDate');
            const duration = parseInt(formData.get('duration'));
            const endDate = calculateEndDate(startDate, duration);
            
            const newTask = {
                id: `task${Date.now()}`,
                title: formData.get('title'),
                phase: formData.get('phase'),
                description: formData.get('description'),
                responsable: formData.get('responsable'),
                startDate: startDate,
                duration: duration,
                endDate: endDate,
                status: 'todo',
                progress: 0,
                parentId: parentTask ? parentTask.id : null,
                dependencyId: null,
                children: []
            };
            
            tasks.push(newTask);
            
            if (parentTask) {
                parentTask.children.push(newTask.id);
                updateParentDates(parentTask.id, tasks);
            }
            
            dialog.remove();
            renderPlanningTab(appState.currentProjectId);
        });
    }

    // Extension pour numéro de semaine
    Date.prototype.getWeekNumber = function() {
        const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    // API publique
    return {
        render: renderPlanningTab
    };
})();

window.renderPlanningTab = PlanningModule.render;