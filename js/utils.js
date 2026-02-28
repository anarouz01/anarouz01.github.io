// État de l'application (déclaré globalement)
let appState = {
    currentView: 'dashboard',
    currentProjectId: null,
    notifications: 3,
    searchQuery: '',
    activeFilter: 'all',
    discussions: {
        showEmojiPicker: false,
        replyingTo: null,
        replyingToName: '',
        typingUsers: [],
        mentions: []
    }
};

// Fonctions utilitaires communes
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function closeAllDropdowns() {
    document.getElementById('notificationsDropdown')?.classList.add('hidden');
    document.getElementById('userDropdown')?.classList.add('hidden');
    document.getElementById('filterDropdown')?.classList.add('hidden');
}

// Gestion des modals
function openFabModal() {
    document.getElementById('fabModal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('fabModal').classList.add('modal-transition');
    }, 10);
}

function closeFabModal() {
    document.getElementById('fabModal').classList.add('hidden');
}

function openDocumentModal() {
    document.getElementById('documentModal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('documentModal').classList.add('modal-transition');
    }, 10);
}

function closeDocumentModal() {
    document.getElementById('documentModal').classList.add('hidden');
    document.getElementById('documentForm')?.reset();
    document.getElementById('fileInfo')?.classList.add('hidden');
    document.getElementById('dropZone')?.classList.remove('drop-zone-active');
}

function openExportModal() {
    document.getElementById('exportModal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('exportModal').classList.add('modal-transition');
    }, 10);
}

function closeExportModal() {
    document.getElementById('exportModal').classList.add('hidden');
}

// Gestion des toggles
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('hidden');
    sidebar.classList.toggle('transform');
    sidebar.classList.toggle('-translate-x-full');
    
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('fixed');
    } else {
        sidebar.classList.add('fixed');
    }
}

function toggleMobileSearch() {
    const mobileSearchBar = document.getElementById('mobileSearchBar');
    mobileSearchBar.classList.toggle('hidden');
}

function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    dropdown.classList.toggle('hidden');
    document.getElementById('userDropdown').classList.add('hidden');
    document.getElementById('filterDropdown').classList.add('hidden');
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('hidden');
    document.getElementById('notificationsDropdown').classList.add('hidden');
    document.getElementById('filterDropdown').classList.add('hidden');
}

function toggleFilterDropdown() {
    const dropdown = document.getElementById('filterDropdown');
    dropdown.classList.toggle('hidden');
    document.getElementById('notificationsDropdown').classList.add('hidden');
    document.getElementById('userDropdown').classList.add('hidden');
}

// Gestion des fichiers
function handleFileSelect(file) {
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
        alert('Le fichier est trop volumineux (max 10MB)');
        return;
    }
    
    fileName.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    fileInfo.classList.remove('hidden');
}

function handleDocumentSubmit() {
    const submitBtn = document.querySelector('#documentForm button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.textContent = 'Ajout en cours...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        alert('Document ajouté avec succès !');
        closeDocumentModal();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        mockData.documents.unshift({
            id: mockData.documents.length + 1,
            nom: 'Nouveau_document.pdf',
            taille: '1.2 MB',
            date: 'Ajouté à l\'instant',
            type: 'pdf'
        });
        
        if (typeof renderDocuments === 'function') {
            renderDocuments();
        }
    }, 1500);
}

function handleExport() {
    const exportBtn = document.getElementById('confirmExportBtn');
    const originalText = exportBtn.textContent;
    
    exportBtn.textContent = 'Génération...';
    exportBtn.disabled = true;
    
    setTimeout(() => {
        alert('Export PDF généré avec succès ! (simulation)');
        closeExportModal();
        exportBtn.textContent = originalText;
        exportBtn.disabled = false;
    }, 2000);
}

function validateDocument(validationId) {
    const btn = document.querySelector(`.validate-btn[data-validation-id="${validationId}"]`);
    if (btn) {
        btn.textContent = 'Validé ✓';
        btn.classList.remove('bg-green-600', 'hover:bg-green-700');
        btn.classList.add('bg-gray-300', 'text-gray-700', 'cursor-default');
        btn.disabled = true;
        
        appState.notifications = Math.max(0, appState.notifications - 1);
        document.getElementById('notificationBadge').textContent = appState.notifications;
        
        setTimeout(() => {
            alert(`Document ${validationId} validé avec succès !`);
        }, 300);
    }
}

function handleFabOption(option) {
    const optionText = option.querySelector('p.font-medium').textContent;
    closeFabModal();
    
    if (optionText.includes('Importer')) {
        openDocumentModal();
    } else if (optionText.includes('Prendre/uploader photo') && appState.currentProjectId) {
        setTimeout(() => {
            alert('Photo ajoutée au chantier !');
            
            mockData.photos.unshift({
                id: mockData.photos.length + 1,
                nom: "Nouvelle photo chantier",
                chantierId: appState.currentProjectId,
                timestamp: "À l'instant",
                auteur: mockData.user.name,
                couleur: "bg-purple-200",
                url: "#"
            });
            
            if (typeof renderPhotos === 'function') {
                renderPhotos();
            }
        }, 500);
    } else {
        alert(`Fonctionnalité "${optionText}" à implémenter`);
    }
}