// Données mockées
const mockData = {
    user: { 
        name: "Pierre Martin", 
        role: "Chef de projet", 
        initiales: "PM",
        id: "user1",
        avatar: "PM"
    },
    chantiers: [
        {
            id: 1,
            nom: "ZAC Les Hauts",
            type: "VRD",
            adresse: "12 Rue Construction, Lyon 7",
            avancement: 65,
            statut: "en-cours",
            badge: "En cours",
            badgeColor: "bg-blue-100 text-blue-800",
            alertes: 2,
            nouvellesPhotos: 15,
            dernierAcces: "Aujourd'hui 10:30",
            couleur: "#3B82F6",
            dateDebut: "15/02/2023",
            dateFin: "30/11/2023",
            budget: "€2,450,000",
            description: "Chantier de voirie et réseaux divers (VRD) pour la nouvelle ZAC des Hauts de Lyon. Travaux d'infrastructure complète.",
            documents: 42,
            messages: [
                {
                    id: "msg1",
                    userId: "user2",
                    userName: "Jean Dupont",
                    userRole: "Conducteur de travaux",
                    userAvatar: "JD",
                    content: "J'ai terminé l'analyse du terrain pour le lot A4. Les relevés sont disponibles dans les documents.",
                    timestamp: "2024-02-15T09:30:00",
                    reactions: [
                        { emoji: "👍", count: 2, users: ["user1", "user3"] },
                        { emoji: "👏", count: 1, users: ["user4"] }
                    ],
                    attachments: [
                        { type: "document", name: "Analyse_terrain_A4.pdf", size: "2.4 MB", url: "#" }
                    ],
                    mentions: ["user1"]
                },
                {
                    id: "msg2",
                    userId: "user3",
                    userName: "Sophie Martin",
                    userRole: "Architecte",
                    userAvatar: "SM",
                    content: "@Pierre Martin Peux-tu valider le plan modifié pour la façade ? J'ai intégré les dernières modifications suite à la réunion.",
                    timestamp: "2024-02-15T10:15:00",
                    reactions: [
                        { emoji: "👍", count: 1, users: ["user1"] }
                    ],
                    attachments: [
                        { type: "image", name: "facade_v3.jpg", url: "#", thumbnail: "#" },
                        { type: "image", name: "facade_detail.jpg", url: "#", thumbnail: "#" }
                    ],
                    mentions: ["user1"]
                },
                {
                    id: "msg3",
                    userId: "user1",
                    userName: "Pierre Martin",
                    userRole: "Chef de projet",
                    userAvatar: "PM",
                    content: "Super travail ! J'ai validé le plan. @Sophie Martin, peux-tu aussi vérifier le planning des interventions pour la semaine prochaine ?",
                    timestamp: "2024-02-15T11:45:00",
                    reactions: [
                        { emoji: "❤️", count: 3, users: ["user2", "user3", "user4"] },
                        { emoji: "🎉", count: 1, users: ["user2"] }
                    ],
                    attachments: [],
                    mentions: ["user3"]
                },
                {
                    id: "msg4",
                    userId: "user4",
                    userName: "Lucas Bernard",
                    userRole: "Chef de chantier",
                    userAvatar: "LB",
                    content: "Petite question technique : pour le raccordement électrique, on suit bien le plan version 3 ?",
                    timestamp: "2024-02-15T13:20:00",
                    reactions: [
                        { emoji: "❓", count: 1, users: ["user1"] }
                    ],
                    attachments: [
                        { type: "video", name: "raccordement.mp4", duration: "0:45", url: "#" }
                    ],
                    mentions: []
                },
                {
                    id: "msg5",
                    userId: "user5",
                    userName: "Marie Lambert",
                    userRole: "Ingénieur structure",
                    userAvatar: "ML",
                    content: "J'ai ajouté les notes de calcul dans le dossier technique. @Pierre Martin, peux-tu jeter un oeil quand tu auras un moment ?",
                    timestamp: "2024-02-15T14:50:00",
                    reactions: [
                        { emoji: "👀", count: 2, users: ["user1", "user2"] }
                    ],
                    attachments: [
                        { type: "document", name: "notes_calcul_v2.pdf", size: "3.1 MB", url: "#" },
                        { type: "document", name: "schema_structures.dwg", size: "5.8 MB", url: "#" }
                    ],
                    mentions: ["user1"]
                }
            ],
            discussionsParticipants: [
                { id: "user1", name: "Pierre Martin", role: "Chef de projet", avatar: "PM" },
                { id: "user2", name: "Jean Dupont", role: "Conducteur de travaux", avatar: "JD" },
                { id: "user3", name: "Sophie Martin", role: "Architecte", avatar: "SM" },
                { id: "user4", name: "Lucas Bernard", role: "Chef de chantier", avatar: "LB" },
                { id: "user5", name: "Marie Lambert", role: "Ingénieur structure", avatar: "ML" }
            ]
        },
        {
            id: 2,
            nom: "Résidence du Parc",
            type: "Bâtiment",
            adresse: "45 Avenue des Tilleuls, Villeurbanne",
            avancement: 42,
            statut: "retard",
            badge: "En retard",
            badgeColor: "bg-red-100 text-red-800",
            alertes: 5,
            nouvellesPhotos: 8,
            dernierAcces: "Hier 16:45",
            couleur: "#EF4444",
            dateDebut: "10/01/2023",
            dateFin: "15/12/2023",
            budget: "€1,850,000",
            description: "Construction d'une résidence de 24 logements avec parkings souterrains.",
            documents: 28,
            messages: [
                {
                    id: "msg2-1",
                    userId: "user1",
                    userName: "Pierre Martin",
                    userRole: "Chef de projet",
                    userAvatar: "PM",
                    content: "Important : réunion de chantier demain à 9h pour discuter du retard accumulé.",
                    timestamp: "2024-02-14T16:30:00",
                    reactions: [],
                    attachments: [],
                    mentions: []
                }
            ],
            discussionsParticipants: [
                { id: "user1", name: "Pierre Martin", role: "Chef de projet", avatar: "PM" }
            ]
        },
        {
            id: 3,
            nom: "Centre commercial Les Portes",
            type: "Tertiaire",
            adresse: "Rue du Commerce, Bron",
            avancement: 88,
            statut: "bon",
            badge: "Dans les temps",
            badgeColor: "bg-green-100 text-green-800",
            alertes: 1,
            nouvellesPhotos: 3,
            dernierAcces: "Aujourd'hui 09:15",
            couleur: "#10B981",
            dateDebut: "05/03/2023",
            dateFin: "20/10/2023",
            budget: "€3,200,000",
            description: "Rénovation et extension d'un centre commercial existant.",
            documents: 67,
            messages: [],
            discussionsParticipants: []
        }
    ],
    alertes: [
        { 
            id: 1, 
            titre: "Décalage réseau fibre", 
            type: "urgent", 
            chantierId: 1, 
            chantierNom: "ZAC Les Hauts",
            temps: "Il y a 2h",
            description: "Retard d'approvisionnement des fournitures"
        },
        { 
            id: 2, 
            titre: "Problème sécurité échafaudage", 
            type: "urgent", 
            chantierId: 2, 
            chantierNom: "Résidence du Parc",
            temps: "Il y a 4h",
            description: "Échafaudage non conforme aux normes"
        },
        { 
            id: 3, 
            titre: "Plan électrique à valider", 
            type: "verifier", 
            chantierId: 3, 
            chantierNom: "Centre commercial Les Portes",
            temps: "Il y a 1 jour",
            description: "Attente validation du bureau d'études"
        }
    ],
    photos: [
        { 
            id: 1, 
            nom: "Lot B2 - Voirie", 
            chantierId: 1, 
            timestamp: "Aujourd'hui 15:30", 
            auteur: "P. Martin",
            couleur: "bg-blue-200",
            url: "#"
        },
        { 
            id: 2, 
            nom: "Façade principale", 
            chantierId: 2, 
            timestamp: "Hier 14:20", 
            auteur: "L. Dubois",
            couleur: "bg-red-200",
            url: "#"
        },
        { 
            id: 3, 
            nom: "Parking niveau -2", 
            chantierId: 3, 
            timestamp: "Aujourd'hui 11:45", 
            auteur: "M. Leroy",
            couleur: "bg-green-200",
            url: "#"
        },
        { 
            id: 4, 
            nom: "Réseaux pluviaux", 
            chantierId: 1, 
            timestamp: "Hier 16:10", 
            auteur: "P. Martin",
            couleur: "bg-blue-200",
            url: "#"
        }
    ],
    validations: [
        { 
            id: 1, 
            document: "Plan implantation VRD", 
            demandeur: "J. Dupont", 
            date: "12/04", 
            chantierId: 1 
        },
        { 
            id: 2, 
            document: "Devis aciers", 
            demandeur: "S. Martin", 
            date: "11/04", 
            chantierId: 2 
        },
        { 
            id: 3, 
            document: "Note calcul structure", 
            demandeur: "Bureau d'études", 
            date: "10/04", 
            chantierId: 3 
        },
        { 
            id: 4, 
            document: "Planning détaillé semaine 16", 
            demandeur: "A. Petit", 
            date: "09/04", 
            chantierId: 1 
        },
        { 
            id: 5, 
            document: "Fiche sécurité chantier", 
            demandeur: "HSE", 
            date: "08/04", 
            chantierId: 2 
        }
    ],
    documents: [
        { 
            id: 1, 
            nom: "CR_Reunion_1204.pdf", 
            taille: "2.4 MB", 
            date: "Modifié il y a 1h",
            type: "pdf"
        },
        { 
            id: 2, 
            nom: "Liste_matériaux.xlsx", 
            taille: "1.8 MB", 
            date: "Ajouté aujourd'hui",
            type: "excel"
        },
        { 
            id: 3, 
            nom: "Photos_chantier_1104.zip", 
            taille: "24.5 MB", 
            date: "Ajouté hier",
            type: "archive"
        },
        { 
            id: 4, 
            nom: "Plan_implantation_V3.dwg", 
            taille: "8.2 MB", 
            date: "Modifié il y a 2 jours",
            type: "cad"
        }
    ]
};

// Émoticônes disponibles
const emojis = ["👍", "❤️", "😂", "😮", "😢", "👏", "🎉", "🔥", "✅", "❓", "👀", "💡", "📌", "⚠️"];

// Arborescence des documents
const documentsArborescence = {
    "ZAC Les Hauts": {
        id: "folder1",
        name: "ZAC Les Hauts",
        type: "folder",
        children: [
            {
                id: "folder1-1",
                name: "Plans",
                type: "folder",
                children: [
                    {
                        id: "doc1",
                        name: "Plan de masse",
                        type: "document",
                        icon: "📄",
                        versions: [
                            {
                                version: "v1.0",
                                date: "2024-02-10",
                                size: "2.4 MB",
                                author: "J. Dupont",
                                comments: "Version initiale",
                                url: "#",
                                pages: 12
                            },
                            {
                                version: "v1.1",
                                date: "2024-02-15",
                                size: "2.5 MB",
                                author: "J. Dupont",
                                comments: "Correction des cotes",
                                url: "#",
                                pages: 12
                            },
                            {
                                version: "v2.0",
                                date: "2024-02-20",
                                size: "2.8 MB",
                                author: "M. Leroy",
                                comments: "Mise à jour après réunion",
                                url: "#",
                                pages: 14,
                                isCurrent: true
                            }
                        ]
                    },
                    {
                        id: "doc2",
                        name: "Plan de coupe A-A",
                        type: "document",
                        icon: "📄",
                        versions: [
                            {
                                version: "v1.0",
                                date: "2024-02-12",
                                size: "1.8 MB",
                                author: "J. Dupont",
                                comments: "Version initiale",
                                url: "#",
                                pages: 8,
                                isCurrent: true
                            }
                        ]
                    }
                ]
            },
            {
                id: "folder1-2",
                name: "Comptes-rendus",
                type: "folder",
                children: [
                    {
                        id: "doc3",
                        name: "CR Réunion 12-02-2024",
                        type: "document",
                        icon: "📄",
                        versions: [
                            {
                                version: "v1.0",
                                date: "2024-02-12",
                                size: "0.8 MB",
                                author: "P. Martin",
                                comments: "Version approuvée",
                                url: "#",
                                pages: 4,
                                isCurrent: true
                            }
                        ]
                    },
                    {
                        id: "doc4",
                        name: "CR Réunion 19-02-2024",
                        type: "document",
                        icon: "📄",
                        versions: [
                            {
                                version: "v1.0",
                                date: "2024-02-19",
                                size: "0.9 MB",
                                author: "P. Martin",
                                comments: "Brouillon",
                                url: "#",
                                pages: 5
                            },
                            {
                                version: "v1.1",
                                date: "2024-02-20",
                                size: "1.0 MB",
                                author: "P. Martin",
                                comments: "Version finale avec annexes",
                                url: "#",
                                pages: 7,
                                isCurrent: true
                            }
                        ]
                    }
                ]
            },
            {
                id: "folder1-3",
                name: "Devis",
                type: "folder",
                children: [
                    {
                        id: "doc5",
                        name: "Devis terrassement",
                        type: "document",
                        icon: "📄",
                        versions: [
                            {
                                version: "v1.0",
                                date: "2024-02-05",
                                size: "1.2 MB",
                                author: "S. Martin",
                                comments: "Offre initiale",
                                url: "#",
                                pages: 6,
                                isCurrent: true
                            }
                        ]
                    }
                ]
            }
        ]
    },
    "Résidence du Parc": {
        id: "folder2",
        name: "Résidence du Parc",
        type: "folder",
        children: [
            {
                id: "folder2-1",
                name: "Plans architecte",
                type: "folder",
                children: [
                    {
                        id: "doc6",
                        name: "Façades",
                        type: "document",
                        icon: "📄",
                        versions: [
                            {
                                version: "v1.0",
                                date: "2024-02-08",
                                size: "3.2 MB",
                                author: "S. Martin",
                                comments: "Version validée",
                                url: "#",
                                pages: 10,
                                isCurrent: true
                            }
                        ]
                    }
                ]
            }
        ]
    }
};