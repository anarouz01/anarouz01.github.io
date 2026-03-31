// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser la date du jour
    const currentDateElement = document.getElementById('currentDate');
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateElement.textContent = now.toLocaleDateString('fr-FR', options);
    
    // Initialiser les données du dashboard
    renderProjectCards();
    renderAlerts();
    renderPhotos();
    renderValidations();
    renderDocuments();
    
    // Initialiser les écouteurs d'événements
    initEventListeners();
    
    // Initialiser la barre de recherche mobile
    initMobileSearch();
    
    console.log('SiteSync Core initialisé avec succès');
});

// Initialiser les écouteurs d'événements principaux
function initEventListeners() {
    document.getElementById('hamburgerBtn').addEventListener('click', toggleSidebar);
    document.getElementById('mobileSearchBtn').addEventListener('click', toggleMobileSearch);
    document.getElementById('notificationsBtn').addEventListener('click', toggleNotifications);
    document.getElementById('userMenuBtn').addEventListener('click', toggleUserMenu);
    
    document.getElementById('searchInput').addEventListener('input', function(e) {
        appState.searchQuery = e.target.value;
        renderProjectCards();
    });
    
    document.getElementById('filterBtn').addEventListener('click', toggleFilterDropdown);
    
    document.querySelectorAll('.filter-option').forEach(option => {
        option.addEventListener('click', function() {
            appState.activeFilter = this.dataset.filter;
            renderProjectCards();
            closeAllDropdowns();
        });
    });
    
    document.getElementById('newProjectBtn').addEventListener('click', function() {
        alert('Fonctionnalité "Nouveau chantier" à implémenter');
    });
    
    document.getElementById('exportBtn').addEventListener('click', openExportModal);
    document.getElementById('fabBtn').addEventListener('click', openFabModal);
    
    document.addEventListener('click', function(event) {
        if (!event.target.closest('#notificationsBtn') && !event.target.closest('#notificationsDropdown')) {
            document.getElementById('notificationsDropdown').classList.add('hidden');
        }
        if (!event.target.closest('#userMenuBtn') && !event.target.closest('#userDropdown')) {
            document.getElementById('userDropdown').classList.add('hidden');
        }
        if (!event.target.closest('#filterBtn') && !event.target.closest('#filterDropdown')) {
            document.getElementById('filterDropdown').classList.add('hidden');
        }
    });
    
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('view-project-btn') || event.target.closest('.view-project-btn')) {
            const btn = event.target.classList.contains('view-project-btn') ? event.target : event.target.closest('.view-project-btn');
            const projectId = btn.dataset.projectId;
            openProjectDetail(projectId);
        }
        
        if (event.target.id === 'backToDashboardBtn' || event.target.closest('#backToDashboardBtn')) {
            closeProjectDetail();
        }
        
        if (event.target.classList.contains('project-tab')) {
            const tabs = document.querySelectorAll('.project-tab');
            const tabContents = document.querySelectorAll('.project-tab-content');
            
            tabs.forEach(tab => tab.classList.remove('active', 'text-blue-900', 'border-blue-900'));
            tabs.forEach(tab => tab.classList.add('text-gray-500', 'border-transparent'));
            
            event.target.classList.remove('text-gray-500', 'border-transparent');
            event.target.classList.add('active', 'text-blue-900', 'border-blue-900');
            
            const tabIndex = Array.from(tabs).indexOf(event.target);
            tabContents.forEach(content => content.classList.add('hidden'));
            
            if (tabContents[tabIndex]) {
                tabContents[tabIndex].classList.remove('hidden');
                 if (tabIndex === 1 && appState.currentProjectId) {
                    renderPlanningTab(appState.currentProjectId);
                } 
                else if (tabIndex === 2 && appState.currentProjectId) {
                    renderDiscussionsTab(appState.currentProjectId);
                }
                else if (tabIndex === 3 && appState.currentProjectId) {
                    renderDocumentsTab(appState.currentProjectId);
                }
                else if (tabIndex === 4 && appState.currentProjectId) { 
                    renderPhotosTab(appState.currentProjectId);                    
                }
                else if (tabIndex === 5 && appState.currentProjectId) {
                    renderIssuesTab(appState.currentProjectId);
                }
                else if (tabIndex === 6 && appState.currentProjectId) {
                    renderIssuesMapTab(appState.currentProjectId);
                }
                else if (tabIndex === 7 && appState.currentProjectId) {
                    renderTeamTab(appState.currentProjectId);
                }
            }
        }
        
        if (event.target.classList.contains('validate-btn')) {
            const validationId = event.target.dataset.validationId;
            validateDocument(validationId);
        }
        
        if (event.target.classList.contains('fab-option') || event.target.closest('.fab-option')) {
            const option = event.target.classList.contains('fab-option') ? event.target : event.target.closest('.fab-option');
            handleFabOption(option);
        }
    });
    
    document.getElementById('closeFabModalBtn').addEventListener('click', closeFabModal);
    document.getElementById('closeDocumentModalBtn').addEventListener('click', closeDocumentModal);
    document.getElementById('cancelDocumentBtn').addEventListener('click', closeDocumentModal);
    document.getElementById('documentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleDocumentSubmit();
    });
    
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                const file = this.files[0];
                handleFileSelect(file);
            }
        });
        
        dropZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drop-zone-active');
        });
        
        dropZone.addEventListener('dragleave', function() {
            this.classList.remove('drop-zone-active');
        });
        
        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drop-zone-active');
            
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                handleFileSelect(file);
            }
        });
    }
    
    document.getElementById('closeExportModalBtn').addEventListener('click', closeExportModal);
    document.getElementById('cancelExportBtn').addEventListener('click', closeExportModal);
    document.getElementById('confirmExportBtn').addEventListener('click', handleExport);
}

function initMobileSearch() {
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    const mobileSearchBar = document.getElementById('mobileSearchBar');
    
    mobileSearchBtn.addEventListener('click', function() {
        mobileSearchBar.classList.toggle('hidden');
        if (!mobileSearchBar.classList.contains('hidden')) {
            mobileSearchBar.querySelector('input').focus();
        }
    });
    
    const mobileSearchInput = mobileSearchBar.querySelector('input');
    if (mobileSearchInput) {
        mobileSearchInput.addEventListener('input', function(e) {
            appState.searchQuery = e.target.value;
            renderProjectCards();
        });
    }
}

function openProjectDetail(projectId) {
    const project = mockData.chantiers.find(p => p.id == projectId);
    if (!project) return;
    
    appState.currentProjectId = projectId;
    appState.currentView = 'projectDetail';
    appState.discussions.replyingTo = null;
    
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('projectDetailView').classList.remove('hidden');
    
    document.getElementById('projectDetailTitle').textContent = project.nom;
    document.getElementById('projectName').textContent = project.nom;
    document.getElementById('projectAddress').textContent = `📍 ${project.adresse}`;
    document.getElementById('projectDescription').textContent = project.description;
    document.getElementById('projectStartDate').textContent = project.dateDebut;
    document.getElementById('projectEndDate').textContent = project.dateFin;
    document.getElementById('projectBudget').textContent = project.budget;
    document.getElementById('projectStatus').textContent = project.badge;
    document.getElementById('projectStatus').className = `px-2 py-1 text-xs font-medium rounded-full ${project.badgeColor}`;
    document.getElementById('projectProgressText').textContent = `${project.avancement}%`;
    document.getElementById('projectProgressBar').style.width = `${project.avancement}%`;
    document.getElementById('projectProgressBar').style.setProperty('--progress', `${project.avancement}%`);
    document.getElementById('projectAlerts').textContent = project.alertes;
    document.getElementById('projectPhotos').textContent = project.nouvellesPhotos;
    document.getElementById('projectDocuments').textContent = project.documents;
    
    const tabs = document.querySelectorAll('.project-tab');
    const tabContents = document.querySelectorAll('.project-tab-content');
    
    tabs.forEach((tab, index) => {
        if (index === 0) {
            tab.classList.add('active', 'text-blue-900', 'border-blue-900');
            tab.classList.remove('text-gray-500', 'border-transparent');
        } else {
            tab.classList.remove('active', 'text-blue-900', 'border-blue-900');
            tab.classList.add('text-gray-500', 'border-transparent');
        }
    });
    
    tabContents.forEach((content, index) => {
        if (index === 0) {
            content.classList.remove('hidden');
            content.classList.add('active');
        } else {
            content.classList.add('hidden');
            content.classList.remove('active');
        }
    });
}

function closeProjectDetail() {
    appState.currentView = 'dashboard';
    document.getElementById('dashboardView').classList.remove('hidden');
    document.getElementById('projectDetailView').classList.add('hidden');
}