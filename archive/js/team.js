// Module Gestion d'équipe
const TeamModule = (function() {
    // État du module
    let state = {
        selectedUserId: null,
        selectedGroupId: null,
        viewMode: 'members', // 'members', 'groups', 'roles'
        filters: {
            role: 'all',
            group: 'all',
            status: 'all'
        }
    };

    // Données mockées pour les utilisateurs (prédéfinies au niveau entreprise)
    const mockUsers = [
        {
            id: 'user1',
            firstName: 'Pierre',
            lastName: 'Martin',
            email: 'pierre.martin@entreprise.com',
            phone: '06 12 34 56 78',
            role: 'Chef de projet',
            groups: ['direction', 'projet-zac'],
            avatar: 'PM',
            status: 'actif',
            joinedAt: '2023-01-15',
            projects: ['ZAC Les Hauts', 'Résidence du Parc']
        },
        {
            id: 'user2',
            firstName: 'Jean',
            lastName: 'Dupont',
            email: 'jean.dupont@entreprise.com',
            phone: '06 23 45 67 89',
            role: 'Conducteur de travaux',
            groups: ['terrassement', 'projet-zac'],
            avatar: 'JD',
            status: 'actif',
            joinedAt: '2023-02-01',
            projects: ['ZAC Les Hauts']
        },
        {
            id: 'user3',
            firstName: 'Sophie',
            lastName: 'Martin',
            email: 'sophie.martin@entreprise.com',
            phone: '06 34 56 78 90',
            role: 'Architecte',
            groups: ['etudes', 'projet-zac'],
            avatar: 'SM',
            status: 'actif',
            joinedAt: '2023-01-20',
            projects: ['ZAC Les Hauts', 'Centre commercial']
        },
        {
            id: 'user4',
            firstName: 'Lucas',
            lastName: 'Bernard',
            email: 'lucas.bernard@entreprise.com',
            phone: '06 45 67 89 01',
            role: 'Chef de chantier',
            groups: ['terrassement', 'projet-zac'],
            avatar: 'LB',
            status: 'actif',
            joinedAt: '2023-03-10',
            projects: ['ZAC Les Hauts']
        },
        {
            id: 'user5',
            firstName: 'Marie',
            lastName: 'Lambert',
            email: 'marie.lambert@entreprise.com',
            phone: '06 56 78 90 12',
            role: 'Ingénieur structure',
            groups: ['etudes', 'bet'],
            avatar: 'ML',
            status: 'inactif',
            joinedAt: '2023-02-15',
            projects: []
        },
        {
            id: 'user6',
            firstName: 'Thomas',
            lastName: 'Petit',
            email: 'thomas.petit@entreprise.com',
            phone: '06 67 89 01 23',
            role: 'Conducteur de travaux',
            groups: ['voirie', 'projet-zac'],
            avatar: 'TP',
            status: 'actif',
            joinedAt: '2023-04-01',
            projects: ['ZAC Les Hauts']
        },
        {
            id: 'user7',
            firstName: 'Julie',
            lastName: 'Moreau',
            email: 'julie.moreau@entreprise.com',
            phone: '06 78 90 12 34',
            role: 'Coordinateur HSE',
            groups: ['securite', 'direction'],
            avatar: 'JM',
            status: 'actif',
            joinedAt: '2023-02-20',
            projects: ['ZAC Les Hauts', 'Résidence du Parc']
        },
        {
            id: 'user8',
            firstName: 'Nicolas',
            lastName: 'Leroy',
            email: 'nicolas.leroy@entreprise.com',
            phone: '06 89 01 23 45',
            role: 'Géomètre',
            groups: ['etudes', 'terrassement'],
            avatar: 'NL',
            status: 'actif',
            joinedAt: '2023-03-05',
            projects: ['ZAC Les Hauts']
        }
    ];

    // Rôles prédéfinis au niveau entreprise
    const mockRoles = [
        {
            id: 'role1',
            name: 'Chef de projet',
            description: 'Responsable global du projet, coordination et reporting',
            permissions: ['all'],
            color: '#3B82F6',
            icon: '🎯'
        },
        {
            id: 'role2',
            name: 'Conducteur de travaux',
            description: 'Supervision des travaux sur le terrain, suivi d\'exécution',
            permissions: ['planning_write', 'issues_manage', 'docs_read'],
            color: '#10B981',
            icon: '🏗️'
        },
        {
            id: 'role3',
            name: 'Chef de chantier',
            description: 'Encadrement des équipes terrain, sécurité',
            permissions: ['planning_read', 'issues_report', 'photos_add'],
            color: '#F59E0B',
            icon: '👷'
        },
        {
            id: 'role4',
            name: 'Architecte',
            description: 'Conception et suivi architectural',
            permissions: ['docs_manage', 'planning_read'],
            color: '#8B5CF6',
            icon: '📐'
        },
        {
            id: 'role5',
            name: 'Ingénieur structure',
            description: 'Calculs et vérifications structurelles',
            permissions: ['docs_read', 'planning_read'],
            color: '#EC4899',
            icon: '📊'
        },
        {
            id: 'role6',
            name: 'Coordinateur HSE',
            description: 'Hygiène, sécurité, environnement',
            permissions: ['issues_manage', 'planning_read'],
            color: '#EF4444',
            icon: '🛡️'
        },
        {
            id: 'role7',
            name: 'Géomètre',
            description: 'Relevés et implantations',
            permissions: ['docs_read', 'photos_add'],
            color: '#14B8A6',
            icon: '📏'
        },
        {
            id: 'role8',
            name: 'Apprenti',
            description: 'En formation, accès limité',
            permissions: ['planning_read', 'photos_view'],
            color: '#6B7280',
            icon: '📚'
        }
    ];

    // Groupes prédéfinis
    const mockGroups = [
        {
            id: 'group1',
            name: 'Direction',
            description: 'Équipe de direction de projet',
            members: ['user1', 'user7'],
            color: '#3B82F6',
            icon: '🎯'
        },
        {
            id: 'group2',
            name: 'Terrassement',
            description: 'Équipe terrassement et VRD',
            members: ['user2', 'user4', 'user8'],
            color: '#F59E0B',
            icon: '🚜'
        },
        {
            id: 'group3',
            name: 'Études',
            description: 'Bureau d\'études techniques',
            members: ['user3', 'user5', 'user8'],
            color: '#8B5CF6',
            icon: '📐'
        },
        {
            id: 'group4',
            name: 'Voirie',
            description: 'Équipe voirie et réseaux',
            members: ['user6'],
            color: '#10B981',
            icon: '🛣️'
        },
        {
            id: 'group5',
            name: 'Sécurité',
            description: 'Équipe HSE',
            members: ['user7'],
            color: '#EF4444',
            icon: '🛡️'
        },
        {
            id: 'group6',
            name: 'BET',
            description: 'Bureau d\'études externe',
            members: ['user5'],
            color: '#EC4899',
            icon: '📊'
        },
        {
            id: 'group7',
            name: 'Projet ZAC',
            description: 'Équipe dédiée au projet ZAC Les Hauts',
            members: ['user1', 'user2', 'user3', 'user4', 'user6', 'user7', 'user8'],
            color: '#14B8A6',
            icon: '🏗️'
        }
    ];

    // Projets disponibles
    const projects = ['ZAC Les Hauts', 'Résidence du Parc', 'Centre commercial'];

    // ==================== FONCTIONS UTILITAIRES ====================

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }

    // Filtrer les utilisateurs
    function filterUsers(users) {
        let filtered = [...users];
        
        if (state.filters.role !== 'all') {
            filtered = filtered.filter(u => u.role === state.filters.role);
        }
        if (state.filters.group !== 'all') {
            filtered = filtered.filter(u => u.groups.includes(state.filters.group));
        }
        if (state.filters.status !== 'all') {
            filtered = filtered.filter(u => u.status === state.filters.status);
        }
        
        return filtered;
    }

    // Obtenir les membres d'un groupe
    function getGroupMembers(groupId) {
        const group = mockGroups.find(g => g.id === groupId);
        if (!group) return [];
        return mockUsers.filter(u => group.members.includes(u.id));
    }

    // ==================== RENDU ====================

    function renderTeamTab(projectId) {
        const tabContent = document.querySelectorAll('.project-tab-content')[7]; 
        if (!tabContent) return;
        
        const projectUsers = mockUsers.filter(u => u.projects.includes('ZAC Les Hauts') || u.projects.length === 0);
        const filteredUsers = filterUsers(projectUsers);
        
        tabContent.innerHTML = `
            <div class="flex flex-col h-full">
                <!-- Header -->
                <div class="bg-white border-b border-gray-200 px-6 py-3">
                    <div class="flex items-center justify-between">
                        <h2 class="text-xl font-semibold text-gray-900">Gestion d'équipe</h2>
                        <div class="flex items-center gap-3">
                            <button id="inviteMemberBtn" class="flex items-center gap-2 px-3 py-1.5 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800 transition">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                </svg>
                                Inviter un membre
                            </button>
                        </div>
                    </div>
                    
                    <!-- Vue switcher -->
                    <div class="flex items-center gap-4 mt-4">
                        <div class="flex bg-gray-100 rounded-lg p-1">
                            <button class="view-mode-btn px-3 py-1.5 text-sm rounded-md transition ${state.viewMode === 'members' ? 'bg-white shadow text-blue-900' : 'text-gray-600 hover:text-gray-900'}" data-view="members">
                                👥 Membres (${projectUsers.length})
                            </button>
                            <button class="view-mode-btn px-3 py-1.5 text-sm rounded-md transition ${state.viewMode === 'groups' ? 'bg-white shadow text-blue-900' : 'text-gray-600 hover:text-gray-900'}" data-view="groups">
                                📁 Groupes (${mockGroups.length})
                            </button>
                            <button class="view-mode-btn px-3 py-1.5 text-sm rounded-md transition ${state.viewMode === 'roles' ? 'bg-white shadow text-blue-900' : 'text-gray-600 hover:text-gray-900'}" data-view="roles">
                                🎯 Rôles (${mockRoles.length})
                            </button>
                        </div>
                        
                        ${state.viewMode === 'members' ? `
                            <div class="flex items-center gap-3">
                                <select id="filterRole" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="all">Tous les rôles</option>
                                    ${mockRoles.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}
                                </select>
                                
                                <select id="filterGroup" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="all">Tous les groupes</option>
                                    ${mockGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                                </select>
                                
                                <select id="filterStatus" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="all">Tous les statuts</option>
                                    <option value="actif">Actif</option>
                                    <option value="inactif">Inactif</option>
                                </select>
                            </div>
                        ` : ''}
                        
                        <input type="text" id="searchTeam" placeholder="Rechercher..." 
                               class="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                
                <!-- Contenu principal -->
                <div class="flex-1 bg-gray-50 p-4 overflow-auto">
                    ${state.viewMode === 'members' ? renderMembersView(filteredUsers) : 
                      state.viewMode === 'groups' ? renderGroupsView() : 
                      renderRolesView()}
                </div>
            </div>
            
            <!-- Panel de détail (caché par défaut) -->
            <div id="teamDetailPanel" class="fixed inset-y-0 right-0 w-96 bg-white shadow-xl transform transition-transform duration-300 translate-x-full z-50">
                <div class="h-full flex flex-col">
                    <div class="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
                        <h3 id="panelTitle" class="font-semibold text-gray-900">Détail</h3>
                        <button id="closeDetailPanel" class="p-1 text-gray-400 hover:text-gray-600">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div id="teamDetailContent" class="flex-1 overflow-y-auto p-4">
                        <!-- Le contenu sera injecté dynamiquement -->
                    </div>
                </div>
            </div>
            
            <!-- Overlay pour le panel -->
            <div id="panelOverlay" class="fixed inset-0 bg-black/50 hidden z-40"></div>
        `;
        
        initEventListeners();
    }

    // Vue Membres
    function renderMembersView(users) {
        return `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${users.map(user => renderMemberCard(user)).join('')}
            </div>
        `;
    }

    // Carte membre
    function renderMemberCard(user) {
        const userGroups = mockGroups.filter(g => user.groups.includes(g.id));
        const role = mockRoles.find(r => r.name === user.role);
        
        return `
            <div class="member-card bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all p-4 cursor-pointer" data-user-id="${user.id}">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-lg">
                            ${user.avatar}
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-900">${user.firstName} ${user.lastName}</h3>
                            <p class="text-sm text-gray-600">${user.role}</p>
                        </div>
                    </div>
                    <span class="px-2 py-1 text-xs rounded-full ${user.status === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                        ${user.status === 'actif' ? '● Actif' : '○ Inactif'}
                    </span>
                </div>
                
                <div class="space-y-2 text-sm text-gray-600 mb-3">
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        <span>${user.email}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                        </svg>
                        <span>${user.phone}</span>
                    </div>
                </div>
                
                <div class="flex flex-wrap gap-2 mb-3">
                    ${userGroups.map(group => `
                        <span class="px-2 py-1 text-xs rounded-full" style="background-color: ${group.color}20; color: ${group.color}">
                            ${group.icon} ${group.name}
                        </span>
                    `).join('')}
                </div>
                
                <div class="text-xs text-gray-400">
                    Membre depuis ${formatDate(user.joinedAt)}
                </div>
            </div>
        `;
    }

    // Vue Groupes
    function renderGroupsView() {
        return `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${mockGroups.map(group => renderGroupCard(group)).join('')}
            </div>
        `;
    }

    // Carte groupe
    function renderGroupCard(group) {
        const members = getGroupMembers(group.id);
        
        return `
            <div class="group-card bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all p-4 cursor-pointer" data-group-id="${group.id}">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl" style="background-color: ${group.color}">
                            ${group.icon}
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-900">${group.name}</h3>
                            <p class="text-sm text-gray-600">${group.description}</p>
                        </div>
                    </div>
                    <span class="text-sm font-medium text-gray-600">${members.length} membres</span>
                </div>
                
                <div class="mt-3">
                    <div class="text-xs text-gray-500 mb-2">Membres</div>
                    <div class="flex flex-wrap gap-2">
                        ${members.slice(0, 5).map(member => `
                            <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-700" title="${member.firstName} ${member.lastName}">
                                ${member.avatar}
                            </div>
                        `).join('')}
                        ${members.length > 5 ? `
                            <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-600">
                                +${members.length - 5}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Vue Rôles
    function renderRolesView() {
        return `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${mockRoles.map(role => renderRoleCard(role)).join('')}
            </div>
        `;
    }

    // Carte rôle
    function renderRoleCard(role) {
        const membersWithRole = mockUsers.filter(u => u.role === role.name);
        
        return `
            <div class="role-card bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all p-4 cursor-pointer" data-role-id="${role.id}">
                <div class="flex items-start gap-3 mb-3">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl" style="background-color: ${role.color}">
                        ${role.icon}
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-900">${role.name}</h3>
                        <p class="text-sm text-gray-600 mt-1">${role.description}</p>
                    </div>
                </div>
                
                <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-500">${membersWithRole.length} membre(s)</span>
                    <span class="text-blue-600 hover:text-blue-800">Voir les permissions →</span>
                </div>
            </div>
        `;
    }

    // Panel de détail - Membre
    function renderMemberDetail(user) {
        const userGroups = mockGroups.filter(g => user.groups.includes(g.id));
        const role = mockRoles.find(r => r.name === user.role);
        const availableGroups = mockGroups.filter(g => !user.groups.includes(g.id));
        const availableRoles = mockRoles.filter(r => r.name !== user.role);
        
        return `
            <div class="space-y-6">
                <!-- En-tête -->
                <div class="flex items-center gap-3">
                    <div class="w-16 h-16 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-2xl">
                        ${user.avatar}
                    </div>
                    <div>
                        <h4 class="text-xl font-semibold text-gray-900">${user.firstName} ${user.lastName}</h4>
                        <p class="text-gray-600">${user.role}</p>
                    </div>
                </div>
                
                <!-- Statut -->
                <div class="flex items-center gap-2">
                    <span class="px-3 py-1 text-sm rounded-full ${user.status === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                        ${user.status === 'actif' ? '● Actif' : '○ Inactif'}
                    </span>
                    <span class="text-sm text-gray-500">Membre depuis ${formatDate(user.joinedAt)}</span>
                </div>
                
                <!-- Coordonnées -->
                <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div class="flex items-center gap-2 text-sm">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                        <span>${user.email}</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm">
                        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                        </svg>
                        <span>${user.phone}</span>
                    </div>
                </div>
                
                <!-- Rôle -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
                    <select id="editRole" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="${role?.name}">${role?.name}</option>
                        ${availableRoles.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}
                    </select>
                </div>
                
                <!-- Groupes -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Groupes</label>
                    <div class="space-y-2">
                        ${userGroups.map(group => `
                            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full" style="background-color: ${group.color}"></span>
                                    <span class="text-sm">${group.name}</span>
                                </div>
                                <button class="remove-group text-red-500 hover:text-red-700" data-group-id="${group.id}">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                        `).join('')}
                        
                        <select id="addGroup" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Ajouter un groupe...</option>
                            ${availableGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <!-- Projets -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Projets</label>
                    <div class="space-y-2">
                        ${user.projects.map(project => `
                            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <span class="text-sm">${project}</span>
                                <button class="remove-project text-red-500 hover:text-red-700">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                        `).join('')}
                        
                        <select id="addProject" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Ajouter un projet...</option>
                            ${projects.map(p => `<option value="${p}">${p}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="pt-4 border-t border-gray-200 space-y-2">
                    <button id="saveMemberChanges" class="w-full px-4 py-2 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800 transition">
                        Enregistrer les modifications
                    </button>
                    <button id="toggleMemberStatus" class="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                        ${user.status === 'actif' ? 'Désactiver le compte' : 'Activer le compte'}
                    </button>
                    <button id="removeFromProject" class="w-full px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition">
                        Retirer du projet
                    </button>
                </div>
            </div>
        `;
    }

    // Panel de détail - Groupe
    function renderGroupDetail(group) {
        const members = getGroupMembers(group.id);
        const availableUsers = mockUsers.filter(u => !group.members.includes(u.id));
        
        return `
            <div class="space-y-6">
                <!-- En-tête -->
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl" style="background-color: ${group.color}">
                        ${group.icon}
                    </div>
                    <div>
                        <h4 class="text-xl font-semibold text-gray-900">${group.name}</h4>
                        <p class="text-gray-600">${group.description}</p>
                    </div>
                </div>
                
                <!-- Stats -->
                <div class="grid grid-cols-2 gap-3 text-center">
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-2xl font-bold text-gray-900">${members.length}</div>
                        <div class="text-xs text-gray-500">Membres</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-2xl font-bold text-gray-900">${group.members.length}</div>
                        <div class="text-xs text-gray-500">Assignés</div>
                    </div>
                </div>
                
                <!-- Membres -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Membres du groupe</label>
                    <div class="space-y-2 max-h-60 overflow-y-auto">
                        ${members.map(member => `
                            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div class="flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-white text-xs font-bold">
                                        ${member.avatar}
                                    </div>
                                    <div>
                                        <span class="text-sm font-medium">${member.firstName} ${member.lastName}</span>
                                        <span class="text-xs text-gray-500 ml-2">${member.role}</span>
                                    </div>
                                </div>
                                <button class="remove-member text-red-500 hover:text-red-700" data-user-id="${member.id}">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    
                    <select id="addMemberToGroup" class="w-full mt-3 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Ajouter un membre...</option>
                        ${availableUsers.map(u => `<option value="${u.id}">${u.firstName} ${u.lastName} (${u.role})</option>`).join('')}
                    </select>
                </div>
                
                <!-- Actions -->
                <div class="pt-4 border-t border-gray-200 space-y-2">
                    <button id="saveGroupChanges" class="w-full px-4 py-2 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800 transition">
                        Enregistrer les modifications
                    </button>
                    <button id="deleteGroup" class="w-full px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition">
                        Supprimer le groupe
                    </button>
                </div>
            </div>
        `;
    }

    // Panel de détail - Rôle
    function renderRoleDetail(role) {
        const membersWithRole = mockUsers.filter(u => u.role === role.name);
        
        return `
            <div class="space-y-6">
                <!-- En-tête -->
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-lg flex items-center justify-center text-white text-2xl" style="background-color: ${role.color}">
                        ${role.icon}
                    </div>
                    <div>
                        <h4 class="text-xl font-semibold text-gray-900">${role.name}</h4>
                        <p class="text-gray-600">${role.description}</p>
                    </div>
                </div>
                
                <!-- Stats -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="text-2xl font-bold text-gray-900 text-center">${membersWithRole.length}</div>
                    <div class="text-xs text-gray-500 text-center">Membres avec ce rôle</div>
                </div>
                
                <!-- Membres -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Membres</label>
                    <div class="space-y-2">
                        ${membersWithRole.map(member => `
                            <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                <div class="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-white text-xs font-bold">
                                    ${member.avatar}
                                </div>
                                <div>
                                    <span class="text-sm font-medium">${member.firstName} ${member.lastName}</span>
                                    <span class="text-xs text-gray-500 ml-2">${member.email}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Permissions -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                    <div class="space-y-2">
                        <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                            <input type="checkbox" checked disabled class="rounded text-blue-900">
                            <span class="text-sm">Accès planning (lecture)</span>
                        </div>
                        <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                            <input type="checkbox" ${role.permissions.includes('planning_write') ? 'checked' : ''} disabled class="rounded text-blue-900">
                            <span class="text-sm">Modification planning</span>
                        </div>
                        <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                            <input type="checkbox" ${role.permissions.includes('issues_manage') ? 'checked' : ''} disabled class="rounded text-blue-900">
                            <span class="text-sm">Gestion des problèmes</span>
                        </div>
                        <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                            <input type="checkbox" ${role.permissions.includes('docs_manage') ? 'checked' : ''} disabled class="rounded text-blue-900">
                            <span class="text-sm">Gestion des documents</span>
                        </div>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="pt-4 border-t border-gray-200 space-y-2">
                    <button id="editRole" class="w-full px-4 py-2 bg-blue-900 text-white text-sm rounded-lg hover:bg-blue-800 transition">
                        Modifier le rôle
                    </button>
                    <button id="deleteRole" class="w-full px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition">
                        Supprimer le rôle
                    </button>
                </div>
            </div>
        `;
    }

    // Dialogue d'invitation
    function showInviteDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Inviter un membre</h3>
                    <button class="close-dialog text-gray-400 hover:text-gray-600">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form id="inviteForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" name="email" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                        <select name="role" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            ${mockRoles.map(r => `<option value="${r.name}">${r.name}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Groupes</label>
                        <select name="groups" multiple class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" size="4">
                            ${mockGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                        </select>
                        <p class="text-xs text-gray-500 mt-1">Maintenez Ctrl pour sélectionner plusieurs groupes</p>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Message (optionnel)</label>
                        <textarea name="message" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ajoutez un message personnel..."></textarea>
                    </div>
                    
                    <div class="flex justify-end gap-3 pt-4">
                        <button type="button" class="cancel-btn px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Annuler</button>
                        <button type="submit" class="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">Envoyer l'invitation</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.remove());
        dialog.querySelector('.cancel-btn').addEventListener('click', () => dialog.remove());
        
        dialog.querySelector('#inviteForm').addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Invitation envoyée ! (simulation)');
            dialog.remove();
        });
    }

    // ==================== ÉVÉNEMENTS ====================

    function initEventListeners() {
        // Changement de vue
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.viewMode = btn.dataset.view;
                renderTeamTab(appState.currentProjectId);
            });
        });
        
        // Filtres
        document.getElementById('filterRole')?.addEventListener('change', (e) => {
            state.filters.role = e.target.value;
            renderTeamTab(appState.currentProjectId);
        });
        
        document.getElementById('filterGroup')?.addEventListener('change', (e) => {
            state.filters.group = e.target.value;
            renderTeamTab(appState.currentProjectId);
        });
        
        document.getElementById('filterStatus')?.addEventListener('change', (e) => {
            state.filters.status = e.target.value;
            renderTeamTab(appState.currentProjectId);
        });
        
        // Clic sur une carte membre
        document.querySelectorAll('.member-card').forEach(card => {
            card.addEventListener('click', () => {
                const userId = card.dataset.userId;
                const user = mockUsers.find(u => u.id === userId);
                if (user) {
                    state.selectedUserId = userId;
                    
                    const panel = document.getElementById('teamDetailPanel');
                    const content = document.getElementById('teamDetailContent');
                    const overlay = document.getElementById('panelOverlay');
                    const title = document.getElementById('panelTitle');
                    
                    title.textContent = 'Détail du membre';
                    content.innerHTML = renderMemberDetail(user);
                    panel.classList.remove('translate-x-full');
                    overlay.classList.remove('hidden');
                    
                    initPanelEvents('member', user);
                }
            });
        });
        
        // Clic sur une carte groupe
        document.querySelectorAll('.group-card').forEach(card => {
            card.addEventListener('click', () => {
                const groupId = card.dataset.groupId;
                const group = mockGroups.find(g => g.id === groupId);
                if (group) {
                    state.selectedGroupId = groupId;
                    
                    const panel = document.getElementById('teamDetailPanel');
                    const content = document.getElementById('teamDetailContent');
                    const overlay = document.getElementById('panelOverlay');
                    const title = document.getElementById('panelTitle');
                    
                    title.textContent = 'Détail du groupe';
                    content.innerHTML = renderGroupDetail(group);
                    panel.classList.remove('translate-x-full');
                    overlay.classList.remove('hidden');
                    
                    initPanelEvents('group', group);
                }
            });
        });
        
        // Clic sur une carte rôle
        document.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('click', () => {
                const roleId = card.dataset.roleId;
                const role = mockRoles.find(r => r.id === roleId);
                if (role) {
                    const panel = document.getElementById('teamDetailPanel');
                    const content = document.getElementById('teamDetailContent');
                    const overlay = document.getElementById('panelOverlay');
                    const title = document.getElementById('panelTitle');
                    
                    title.textContent = 'Détail du rôle';
                    content.innerHTML = renderRoleDetail(role);
                    panel.classList.remove('translate-x-full');
                    overlay.classList.remove('hidden');
                    
                    initPanelEvents('role', role);
                }
            });
        });
        
        // Inviter un membre
        document.getElementById('inviteMemberBtn')?.addEventListener('click', () => {
            showInviteDialog();
        });
        
        // Fermer le panel
        document.getElementById('closeDetailPanel')?.addEventListener('click', () => {
            document.getElementById('teamDetailPanel').classList.add('translate-x-full');
            document.getElementById('panelOverlay').classList.add('hidden');
        });
        
        document.getElementById('panelOverlay')?.addEventListener('click', () => {
            document.getElementById('teamDetailPanel').classList.add('translate-x-full');
            document.getElementById('panelOverlay').classList.add('hidden');
        });
    }

    function initPanelEvents(type, data) {
        if (type === 'member') {
            // Ajouter au groupe
            const addGroup = document.getElementById('addGroup');
            if (addGroup) {
                addGroup.addEventListener('change', (e) => {
                    if (e.target.value) {
                        const groupId = e.target.value;
                        if (!data.groups.includes(groupId)) {
                            data.groups.push(groupId);
                            document.getElementById('teamDetailContent').innerHTML = renderMemberDetail(data);
                            initPanelEvents('member', data);
                        }
                        e.target.value = '';
                    }
                });
            }
            
            // Retirer d'un groupe
            document.querySelectorAll('.remove-group').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const groupId = btn.dataset.groupId;
                    data.groups = data.groups.filter(g => g !== groupId);
                    document.getElementById('teamDetailContent').innerHTML = renderMemberDetail(data);
                    initPanelEvents('member', data);
                });
            });
            
            // Ajouter un projet
            const addProject = document.getElementById('addProject');
            if (addProject) {
                addProject.addEventListener('change', (e) => {
                    if (e.target.value) {
                        const project = e.target.value;
                        if (!data.projects.includes(project)) {
                            data.projects.push(project);
                            document.getElementById('teamDetailContent').innerHTML = renderMemberDetail(data);
                            initPanelEvents('member', data);
                        }
                        e.target.value = '';
                    }
                });
            }
            
            // Sauvegarder
            document.getElementById('saveMemberChanges')?.addEventListener('click', () => {
                const newRole = document.getElementById('editRole')?.value;
                if (newRole && newRole !== data.role) {
                    data.role = newRole;
                }
                alert('Modifications enregistrées !');
                renderTeamTab(appState.currentProjectId);
            });
            
            // Changer statut
            document.getElementById('toggleMemberStatus')?.addEventListener('click', () => {
                data.status = data.status === 'actif' ? 'inactif' : 'actif';
                document.getElementById('teamDetailContent').innerHTML = renderMemberDetail(data);
                initPanelEvents('member', data);
            });
            
            // Retirer du projet
            document.getElementById('removeFromProject')?.addEventListener('click', () => {
                if (confirm('Retirer ce membre du projet ?')) {
                    data.projects = data.projects.filter(p => p !== 'ZAC Les Hauts');
                    alert('Membre retiré du projet');
                    document.getElementById('teamDetailPanel').classList.add('translate-x-full');
                    document.getElementById('panelOverlay').classList.add('hidden');
                    renderTeamTab(appState.currentProjectId);
                }
            });
        }
        
        if (type === 'group') {
            // Ajouter un membre
            const addMember = document.getElementById('addMemberToGroup');
            if (addMember) {
                addMember.addEventListener('change', (e) => {
                    if (e.target.value) {
                        const userId = e.target.value;
                        if (!data.members.includes(userId)) {
                            data.members.push(userId);
                            document.getElementById('teamDetailContent').innerHTML = renderGroupDetail(data);
                            initPanelEvents('group', data);
                        }
                        e.target.value = '';
                    }
                });
            }
            
            // Retirer un membre
            document.querySelectorAll('.remove-member').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const userId = btn.dataset.userId;
                    data.members = data.members.filter(m => m !== userId);
                    document.getElementById('teamDetailContent').innerHTML = renderGroupDetail(data);
                    initPanelEvents('group', data);
                });
            });
            
            // Sauvegarder
            document.getElementById('saveGroupChanges')?.addEventListener('click', () => {
                alert('Modifications enregistrées !');
                renderTeamTab(appState.currentProjectId);
            });
            
            // Supprimer le groupe
            document.getElementById('deleteGroup')?.addEventListener('click', () => {
                if (confirm('Supprimer ce groupe ?')) {
                    const index = mockGroups.findIndex(g => g.id === data.id);
                    if (index !== -1) {
                        mockGroups.splice(index, 1);
                        document.getElementById('teamDetailPanel').classList.add('translate-x-full');
                        document.getElementById('panelOverlay').classList.add('hidden');
                        renderTeamTab(appState.currentProjectId);
                    }
                }
            });
        }
    }

    // API publique
    return {
        render: renderTeamTab
    };
})();

window.renderTeamTab = TeamModule.render;