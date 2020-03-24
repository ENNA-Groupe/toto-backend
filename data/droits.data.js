module.exports = function () {
    const droits = [
        {
            nom: 'auth',
            description: 'Authentification',
            operations: [
                { operation: 'login', description: 'Connexion' },
                // { operation: 'logout', description: 'Déconnexion' },
                { operation: 'changePassword', description: 'Changer son mot de passe' },
                { operation: 'changeIdentifiant', description: 'Changer son identifiant' }
            ]
        },
        {
            nom: 'user',
            description: 'Utilisateurs',
            operations: [
                { operation: 'all', description: 'Access à la liste d\'utilisateurs' },
                { operation: 'trash', description: 'Acces à la corbeille d\'utilisateurs' },
                { operation: 'getControls', description: 'Acces à aux droits des utilisateurs' },
                { operation: 'activites', description: 'Acces à aux activités des utilisateurs' },
                { operation: 'add', description: 'Ajouter des utilisateurs' },
                { operation: 'edit', description: 'Modifier des utilisateurs' },
                { operation: 'setPhoto', description: 'Modifier les photos de profil des utilisateurs' },
                { operation: 'setControls', description: 'parametrer les droits des utilisateurs' },
                { operation: 'delete', description: 'Supprimer des utilisateurs' },
                { operation: 'restore', description: 'Restorer des utilisateurs' }
            ]
        },
        {
            nom: 'coursier',
            description: 'Coursiers',
            operations: [
                { operation: 'all', description: 'Access à la liste' },
                { operation: 'trash', description: 'Acces à la corbeille' },
                { operation: 'activites', description: 'Acces à aux activités des coursiers' },
                { operation: 'add', description: 'Ajouter des coursiers' },
                { operation: 'edit', description: 'Modifier des coursiers' },
                { operation: 'setPhoto', description: 'Modifier les photos de profil des coursiers' },
                { operation: 'delete', description: 'Supprimer des coursiers' },
                { operation: 'restore', description: 'Restorer des coursiers' }
            ]
        },
        {
            nom: 'client',
            description: 'Clients',
            operations: [
                { operation: 'all', description: 'Access à la liste de clients' },
                { operation: 'trash', description: 'Acces à la corbeille de clients' },
                { operation: 'activites', description: 'Acces à aux activités des clients' },
                { operation: 'add', description: 'Ajouter des clients' },
                { operation: 'edit', description: 'Modifier des clients' },
                { operation: 'setPhoto', description: 'Modifier les photos de profil des clients' },
                { operation: 'delete', description: 'Supprimer des clients' },
                { operation: 'restore', description: 'Restorer des clients' }
            ]
        },
        {
            nom: 'engin',
            description: 'Engins',
            operations: [
                { operation: 'all', description: 'Access à la liste d\'engins' },
                { operation: 'trash', description: 'Acces à la corbeille d\'engins' },
                { operation: 'add', description: 'Ajouter des engins' },
                { operation: 'edit', description: 'Modifier des engins' },
                { operation: 'delete', description: 'Supprimer des engins' },
                { operation: 'restore', description: 'Restorer des engins' }
            ]
        }
    ];
    return droits;
}

