const server = require('http').createServer();
const io = require('socket.io')(server);
io.origins('*:*');
const Sequelize = require('sequelize');
const crypto = require('crypto');
const moment = require('moment');
const cron = require('node-cron');

//const sequelize = new Sequelize('ennagrou_hotel', 'ennagrou_aro', 'azertyui', {
//host: 'mysql1008.mochahost.com',
// host: 'localhost',
//dialect: 'mysql',
//logging: false
//});
const sequelize = new Sequelize('toto', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});

const Op = Sequelize.Op;

//Models
const Operation = require('./models/operation.model')(sequelize, Sequelize);

// const Fonction = require('./models/fonction.model')(sequelize, Sequelize);
const User = require('./models/user.model')(sequelize, Sequelize);
const Client = require('./models/client.model')(sequelize, Sequelize);
const Coursier = require('./models/coursier.model')(sequelize, Sequelize);
const UserOperation = require('./models/user-operation.model')(sequelize, Sequelize);

Operation.belongsToMany(User, { through: UserOperation });
User.belongsToMany(Operation, { through: UserOperation });

// const Categorie = require('./models/categorie.model')(sequelize, Sequelize);
// const Colis = require('./models/colis.model')(sequelize, Sequelize);
const TypeEngin = require('./models/type.model')(sequelize, Sequelize);
const Engin = require('./models/engin.model')(sequelize, Sequelize);

Coursier.hasOne(Engin, { as: 'utilisateur', foreignkey: 'utilisateurId' });
// TypeEngin.hasOne(Engin, {foreignKey: 'typeEnginngin', sourceKey: 'nom'});

// const Emplacement = require('./models/emplacement.model')(sequelize, Sequelize);

// const Groupe = require('./models/groupe.model')(sequelize, Sequelize);
const Control = require('./models/control.model')(sequelize, Sequelize);
// Groupe.hasMany(Control);
// Control.belongsTo(Groupe);

const UserControl = require('./models/user-control.model')(sequelize, Sequelize);

Control.belongsToMany(User, { through: UserControl });
User.belongsToMany(Control, { through: UserControl });

// const ModePaiement = require('./models/mode-paiement.model')(sequelize, Sequelize);
// const TarifColis = require('./models/tarif-colis.model')(sequelize, Sequelize);
// const TarifDistance = require('./models/tarif-distance.model')(sequelize, Sequelize);

// const Salaire = require('./models/salaire.model')(sequelize, Sequelize);
// const Livraison = require('./models/livraison.model')(sequelize, Sequelize);
// const Compte = require('./models/compte.model')(sequelize, Sequelize);
// const Message = require('./models/message.model')(sequelize, Sequelize);

//fonctions
function dateFormat(date) {
    let y = date.getFullYear();
    let m = date.getMonth() + 1;
    if (m < 10) m = "0" + m;
    let d = date.getDate();

    return y + '-' + m + '-' + d;
}

function heureFormat(date) {
    let h = date.getHours();
    let m = date.getMinutes();
    let s = date.getSeconds();

    return h + ':' + m + ':' + s;
}

function hash(password) {
    // Hashing user's salt and password with 1000 iterations, 64 length and sha512 digest 
    var salt = crypto.randomBytes(16).toString('hex');
    var password = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);
    return { salt: salt, password: password };
};

function verif(password, hash, salt) {
    password = crypto.pbkdf2Sync(password,
        salt, 1000, 64, `sha512`).toString(`hex`);
    return hash === password;
};


//Initialisation sequelize
sequelize.authenticate().then(() => {
    console.log('Connection has been established successfully.');
    sequelize.sync({ force: false }).then(() => {
        // Now the `users` tarifColis in the database corresponds to the model definition
        console.log('tables created succesfull')
        Control.findOne().then(
            (res) => {
                if (!res) {
                    console.log('Définition des droits!');
                    const droits = require('./data/droits.data');
                    droits().forEach(
                        (item) => {
                            item.operations.forEach(
                                elem => {
                                    Control.create({ model: item.nom, typeOperation: elem.operation, description: elem.description });
                                }
                            );
                        }
                    );
                    console.log('Fin de définition des droits!');
                } else console.log('Les droits sont dejà définis');

                User.findOne().then(
                    (res) => {
                        if (!res) {
                            let key = hash('azertyui');
                            password = key.password;
                            salt = key.salt;
                            User.create({ nom: 'Admin', prenom: '', photo: './assets/img/user.png', identifiant: 'admin', password: password, salt: salt, contact1: '929242601' }).then(
                                (res2) => {
                                    Control.findAll().then(ctrl => {
                                        ctrl.forEach((item) => {
                                            UserControl.create({ userId: res2.id, controlId: item.id, isChecked: true });
                                        });
                                    });
                                }
                            );
                        }

                        TypeEngin.findOne().then(
                            (res) => {
                                if (!res) {
                                    const typeEngins = require('./data/type-engin.data');
                                    TypeEngin.bulkCreate(typeEngins());
                                }
                            }
                        )
                    }
                );
            }
        );
    });
}).catch(err => {
    console.error('UnarifColis to connect to the database:', err);
});



io.on('connection', socket => {
    Operation.findOne({ order: [['id', 'DESC']] }).then(
        res => {
            if (!res) {
                res = { id: 0 };
            }
            console.log(res.id);
            socket.lastId = res.id
        }
    );

    function registrer(model, idInTable, typeOperation, description) {
        console.log('idINTable: ', idInTable)
        return Operation.create({ userId: socket.uid, platform: socket.platform, model: model, idInTable: idInTable, typeOperation: typeOperation, description: description }).then(
            (res) => {

                User.findAll({
                    where: {
                        id: {
                            [Op.ne]: socket.uid
                        }
                    },
                    attributes: ['id']
                }).then(
                    (users) => {
                        users.forEach(item => {
                            UserOperation.create({ userId: item.id, operationId: res.id });
                        });
                        res.userOperation = { isSeen: null };
                        socket.broadcast.emit('newData', res);
                    }
                );
            }
        );
    }

    function canDo(evt) {
        let item = socket.controls.find(item => {
            return item.model + ':' + item.typeOperation === evt;
        });
        return item.userControl.isChecked;
    }

    socket.on('hello', data => {
        console.log(data);
        socket.platform = data;
    });
    /**
     * LOGIN
     */
    socket.on('auth:login', data => {
        console.log(data);
        let res;

        if (socket.platform === 'admin') {
            User.findOne({
                where: {
                    identifiant: data.identifiant,
                    deletedAt: null
                },
                include: [
                    {
                        model: Control,
                        through: {
                            attributes: ['isChecked']
                        }
                    }
                ]
            }).then(user => {
                if (user) {
                    if (user.isOnline) {
                        res = { infos: { type: 'danger', message: 'Ce compte est dejà connecté!' }, data: { isAuth: false } };
                        socket.emit('auth:login', res);
                    } else {
                        if (verif(data.password, user.password, user.salt)) {
                            socket.uid = user.id;
                            socket.controls = user.controls;
                            socket.nom = user.nom + ' ' + user.prenom;
                            if (canDo('auth:login')) {
                                socket.isAuth = true;
                                user.isOnline = true;
                                let now = new Date();
                                now = dateFormat(now) + ' ' + heureFormat(now);
                                User.update({ isOnline: true, connexionSince: now }, {
                                    where: {
                                        id: user.id
                                    }
                                }).then(
                                    () => {
                                        res = { infos: { type: 'success', message: 'Vous etes connecté!' }, data: { isAuth: true, user: user } };
                                        socket.emit('auth:login', res);
                                        registrer('User', user.id, 'connexion', socket.nom + ' s\'est connecté!');
                                    }
                                );
                            } else {
                                res = { infos: { type: 'danger', message: 'Vous n\'avez pas les droits!' }, data: { isAuth: false } };
                                socket.emit('auth:login', res);
                            }
                        } else {
                            res = { infos: { type: 'danger', message: 'Mot de passe incorrect!' }, data: { isAuth: false } };
                            socket.emit('auth:login', res);
                        }
                    }
                } else {
                    res = { infos: { type: 'danger', message: 'Identifiant inconnu!' }, data: { isAuth: false } };
                    socket.emit('auth:login', res);
                }
            });
        } else if (socket.platform === 'coursier') {
            Coursier.findOne({
                where: {
                    identifiant: data.identifiant,
                    deletedAt: null
                }
            }).then(coursier => {
                if (coursier) {
                    if (coursier.isOnline) {
                        res = { infos: { type: 'danger', message: 'Ce compte est dejà connecté!' }, data: { isAuth: false } };
                        socket.emit('auth:login', res);
                    } else {
                        if (verif(data.password, coursier.password, coursier.salt)) {
                            socket.uid = coursier.id;
                            socket.nom = coursier.nom + ' ' + coursier.prenom;
                            socket.isAuth = true;
                            coursier.isOnline = true;
                            let now = new Date();
                            now = dateFormat(now) + ' ' + heureFormat(now);
                            coursier.update({ isOnline: true, connexionSince: now }, {
                                where: {
                                    id: coursier.id
                                }
                            }).then(
                                () => {
                                    res = { infos: { type: 'success', message: 'Vous etes connecté!' }, data: { isAuth: true, coursier: coursier } };
                                    socket.emit('auth:login', res);
                                    registrer('Coursier', coursier.id, 'connexion', 'Le coursier ' + socket.nom + ' s\'est connecté!');
                                }
                            );
                        } else {
                            res = { infos: { type: 'danger', message: 'Mot de passe incorrect!' }, data: { isAuth: false } };
                            socket.emit('auth:login', res);
                        }
                    }
                } else {
                    res = { infos: { type: 'danger', message: 'Identifiant inconnu!' }, data: { isAuth: false } };
                    socket.emit('auth:login', res);
                }
            });
        }

        // 

    });

    socket.on('auth:changeIdentifiant', data => {
        console.log(data);
        if (canDo('auth:changeIdentifiant')) {
            coursier.update({ identifiant: data.identifiant }, {
                where: {
                    id: socket.uid
                }
            }).then(
                () => {
                    socket.emit('auth:changeIdentifiant', { infos: { type: 'success', message: 'Vous avez changé votre mot de passe!' }, data: true })
                }
            );
        } else {
            socket.emit('auth:changeIdentifiant', { infos: { type: 'success', message: 'Vous n\'avez pas les droits!' } })
        }

    });

    socket.on('auth:changePassword', password => {
        console.log(password);
        if (canDo('auth:changePassword')) {
            let key = hash(password);
            User.update({ password: key.password, salt: key.salt }, {
                where: {
                    id: socket.uid
                }
            }).then(
                () => {
                    socket.emit('auth:changePassword', { infos: { type: 'success', message: 'Vous avez changé votre mot de passe!' }, data: true })
                }
            );
        } else {
            socket.emit('auth:changePassword', { infos: { type: 'success', message: 'Vous n\'avez pas les droits!' } })
        }

    });

    socket.on('auth:logout', () => {
        console.log(socket.uid);
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        User.update({ isOnline: false, connexionSince: now }, {
            where: {
                id: socket.uid
            }
        }).then(
            (id) => {
                socket.isAuth = false;
                socket.emit('auth:logout', { infos: { type: 'success', message: 'Vous etes deconnecté!' }, data: true });
                registrer('User', socket.uid, 'deconnexion', socket.nom + ' s\'est deconnecté!');
            }
        );
    });

    /**
     * Clouding
     */
    socket.on('cloud', () => {
        console.log(socket.lastId);
        Operation.findAll({
            where: {
                id: {
                    [Op.gt]: socket.lastId
                }
            }
        }).then(
            (operations) => {
                console.log('operations: ' + operations.length)
                let res = [];
                if (operations.length > 0) {
                    socket.lastId = operations[(operations.length - 1)].id;
                    operations.forEach(operation => {
                        let model = operation.model;
                        switch (model) {
                            case 'Employe':
                                User.findOne({
                                    where: {
                                        id: {
                                            [Op.or]: [
                                                [operation.idInTable],
                                                { [Op.ne]: 1 }
                                            ]
                                        }

                                    }
                                }).then(
                                    (item) => {
                                        if (item) res.push({ operation: operation, data: item });
                                    }
                                );
                                break;
                        }
                    });
                }
                setTimeout(() => socket.emit('cloud', res), 5000)
            }
        )
    });

    /**
     * Notifications
     */

    socket.on('notification:all', (data) => {
        console.log(data);
        User.findOne({
            where: {
                id: socket.uid
            },
            include: [
                {
                    model: Operation,
                    through: {
                        attributes: ['isSeen'],
                        where: {
                            isSeen: null
                        }
                    },
                    order: [
                        ['id', 'DESC']
                    ]
                }
            ]
        }).then(res => {
            socket.emit('notification:all', { data: res });
        });
    });


    socket.on('notification:setSeen', (data) => {
        console.log(data);
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        data.forEach(item => {
            UserOperation.update({ isSeen: now }, {
                where: {
                    userId: socket.uid,
                    operationId: item.id
                }
            });
        });
        socket.emit('notification:setSeen', { data: true });
    });


    /**
     * USER METHODS
     */

    //get All
    socket.on('user:all', data => {
        console.log(data);
        if (canDo('user:all')) {
            User.findAll({
                where: {
                    id: {
                        [Op.ne]: 1
                    }
                }
            }).then(res => {
                socket.emit('user:all', { data: res });
            });
        }
    });

    //get deleteditems
    socket.on('user:trash', data => {
        console.log(data);
        if (canDo('user:trash')) {
            User.findAll({ paranoid: false }).then(res => {
                socket.emit('user:trash', { data: res });
            });
        }
    });

    //get user controls
    socket.on('user:getControls', data => {
        console.log(data);
        if (canDo('user:getControls')) {
            User.findOne({
                where: {
                    id: data.id
                },
                include: [
                    {
                        model: Control,
                        through: {
                            attributes: ['isChecked']
                        }
                    }
                ]
            }).then(res => {
                // console.log("All res:", JSON.stringify(res, null, 4));
                socket.emit('user:getControls', { data: res.controls });
            });
        }
    });

    //get activites
    socket.on('user:activites', data => {
        console.log(data);
        if (canDo('user:activites')) {
            Operation.findAll({
                order: [
                    ['id', 'DESC']
                ],
                where: {
                    userId: data.id
                },
                limit: 10,
                offset: data.lastId
            }).then(res => {
                // console.log("All res:", JSON.stringify(res, null, 4));
                socket.emit('user:activites', { data: res });
            });
        }
    });

    //add item
    socket.on('user:add', data => {
        console.log(data);
        if (canDo('user:add')) {
            let key = hash('password');
            data.password = key.password;
            data.salt = key.salt;
            let now = new Date();
            now = dateFormat(now) + ' ' + heureFormat(now);
            data.isOffline = true;
            data.connexionSince = now;
            User.create(data).then(res => {
                socket.emit('user:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('User', socket.uid, 'add', socket.nom + ' a ajouté l\'utilisateur ' + res.nom + ' ' + res.prenom).then(
                    () => {
                        Control.findAll().then(ctrl => {
                            ctrl.forEach((item) => {
                                UserControl.create({ userId: res.id, controlId: item.id });
                            });
                        });
                    });
            });
        } else {
            socket.emit('user:add', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    //edit item
    socket.on('user:edit', data => {
        console.log(data);
        if (canDo('user:edit')) {
            User.update(data, {
                where: {
                    id: data.id
                }
            }).then(() => {
                User.findOne({
                    where: { id: data.id }
                }).then(res => {
                    socket.emit('user:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                    registrer('User', res.id, 'edit', socket.nom + ' a modifié les informations de l\'utilisateur ' + res.nom + ' ' + res.prenom);
                });
            });
        } else {
            socket.emit('user:edit', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    //edit item photo
    socket.on('user:setPhoto', data => {
        console.log(data);
        if (canDo('user:setPhoto')) {
            User.update({ photo: data.photo }, {
                where: {
                    id: data.userId
                }
            }).then(() => {
                User.findOne({
                    where: { id: data.userId }
                }).then(res => {
                    socket.emit('user:setPhoto', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                    registrer('User', res.id, 'edit', socket.nom + ' a modifié la photo de profil de l\'utilisateur ' + res.nom + ' ' + res.prenom);
                });
            });
        } else {
            socket.emit('user:setPhoto', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    //edit user controls 
    socket.on('user:setControls', data => {
        console.log(data);
        if (canDo('user:setControls')) {
            data.controls.forEach(
                item => {
                    UserControl.update({ isChecked: item.userControl.isChecked }, {
                        where: {
                            userId: data.userId,
                            controlId: item.id
                        }
                    });
                }
            );
            socket.emit('user:setControls', { infos: { type: 'success', message: 'Enregistré avec success!' }, data: null });
        } else {
            socket.emit('user:setControls', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    //delete item
    socket.on('user:delete', data => {
        console.log(data);
        if (canDo('user:delete')) {
            User.destroy({
                where: {
                    id: data.id
                }
            }).then(() => {
                socket.emit('user:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: true });
                registrer('User', data.id, 'delete', socket.nom + ' a supprimé  l\'utilisateur ' + data.nom + ' ' + data.prenom);
            });
        } else {
            socket.emit('user:delete', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    //restore item
    socket.on('user:restore', data => {
        console.log(data);
        if (canDo('user:restore')) {
            User.restore({
                where: {
                    id: data.id
                }
            }).then(() => {
                socket.emit('user:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: true });
                registrer('User', data.id, 'restore', socket.nom + ' a restauré les informations de l\'utilisateur ' + data.nom + ' ' + data.prenom);
            });
        } else {
            socket.emit('user:restore', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    /**
     * Coursier
     */

    //get All
    socket.on('coursier:all', data => {
        console.log(data);
        if (canDo('coursier:all')) {
            Coursier.findAll().then(res => {
                socket.emit('coursier:all', { data: res });
            });
        }
    });

    //get deleteditems
    socket.on('coursier:trash', data => {
        console.log(data);
        if (canDo('coursier:trash')) {
            Coursier.findAll({ paranoid: false }).then(res => {
                socket.emit('coursier:trash', { data: res });
            });
        }
    });

    //get activites
    socket.on('coursier:activites', data => {
        console.log(data);
        if (canDo('coursier:activites')) {
            Operation.findAll({
                order: [
                    ['id', 'DESC']
                ],
                where: {
                    platform: 'coursier',
                    userId: data.id
                },
                limit: 10,
                offset: data.lastId
            }).then(res => {
                // console.log("All res:", JSON.stringify(res, null, 4));
                socket.emit('coursier:activites', { data: res });
            });
        }
    });

    //add item
    socket.on('coursier:add', data => {
        console.log(data);
        if (canDo('coursier:add')) {
            let key = hash('password');
            data.password = key.password;
            data.salt = key.salt;
            let now = new Date();
            now = dateFormat(now) + ' ' + heureFormat(now);
            data.connexionSince = now;
            data.isOffline = true;
            Coursier.create(data).then(res => {
                socket.emit('coursier:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Coursier', res.id, 'add', socket.nom + ' a ajouté le coursier ' + res.nom);
            });
        } else {
            socket.emit('coursier:add', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }

    });

    //edit item
    socket.on('coursier:edit', data => {
        console.log(data);
        if (canDo('coursier:edit')) {
            Coursier.update(data, {
                where: {
                    id: data.id
                }
            }).then(() => {
                Coursier.findOne({
                    where: { id: data.id }
                }).then(res => {
                    socket.emit('coursier:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                    registrer('Coursier', res.id, 'edit', socket.nom + ' a modifié les informations du coursier ' + res.nom);
                });
            });
        } else {
            socket.emit('coursier:edit', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }

    });

    //edit photo
    socket.on('coursier:setPhoto', data => {
        console.log(data);
        if (canDo('coursier:setPhoto')) {
            Coursier.update({ photo: data.photo }, {
                where: {
                    id: data.coursierId
                }
            }).then(() => {
                Coursier.findOne({
                    where: { id: data.coursierId }
                }).then(res => {
                    socket.emit('coursier', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                    registrer('Coursier', res.id, 'edit', socket.nom + ' a modifié la photo de profil du coursier' + res.nom + ' ' + res.prenom);
                });
            });
        } else {
            socket.emit('coursier:setPhoto', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    //delete item
    socket.on('coursier:delete', data => {
        console.log(data);
        if (canDo('coursier:delete')) {
            Coursier.destroy({
                where: {
                    id: data.id
                }
            }).then(() => {
                socket.emit('coursier:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: true });
                registrer('Coursier', data.id, 'delete', socket.nom + ' a supprimé  le coursier  ' + data.nom + ' ' + data.prenom);
            });
        } else {
            socket.emit('coursier:delete', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    //restore item
    socket.on('coursier:restore', data => {
        console.log(data);
        if (canDo('coursier:restore')) {
            Coursier.restore({
                where: {
                    id: data.id
                }
            }).then(() => {
                socket.emit('coursier:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: true });
                registrer('Coursier', data.id, 'restore', socket.nom + ' a restoré  le coursier  ' + data.nom + ' ' + data.prenom);
            });
        } else {
            socket.emit('coursier:restore', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    /**
        * client METHODE
        */
    //get All
    socket.on('client:all', data => {
        console.log(data);
        if (canDo('client:all')) {
            Client.findAll().then(res => {
                socket.emit('client:all', { data: res });
            });
        }
    });

    //get deleteditems
    socket.on('client:trash', data => {
        console.log(data);
        if (canDo('client:tarsh')) {
            Client.findAll({ polaroid: false }).then(res => {
                socket.emit('client:trash', { data: res });
            });
        }
    });

    //get activites
    socket.on('client:activites', data => {
        console.log(data);
        if (canDo('client:activites')) {
            Operation.findAll({
                order: [
                    ['id', 'DESC']
                ],
                where: {
                    platform: 'client',
                    userId: data.id
                },
                limit: 10,
                offset: data.lastId
            }).then(res => {
                socket.emit('client:activites', { data: res });
            });
        }
    });

    //add item
    socket.on('client:add', data => {
        console.log(data);
        if (canDo('client:add')) {
            let key = hash(data.password);
            data.password = key.password;
            data.salt = key.salt;
            let now = new Date();
            now = dateFormat(now) + ' ' + heureFormat(now);
            data.isLineSince = now;
            data.isOffline = false;
            Client.create(data).then(res => {
                socket.emit('client:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Client', res.id, 'add', socket.nom + ' a ajouté le client' + res.nom + ' ' + res.prenom);
            });
        } else {
            socket.emit('client:add', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    //edit item
    socket.on('client:edit', data => {
        console.log(data);
        if (canDo('client:edit')) {
            Client.update(data, {
                where: {
                    id: data.id
                }
            }).then(() => {
                Client.findOne({
                    where: { id: data.id }
                }).then(res => {
                    socket.emit('client:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                    registrer('Client', res.id, 'edit', socket.nom + ' a modifié les informations du client' + res.nom);
                });
            });
        } else {
            socket.emit('client:edit', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    //edit photo
    socket.on('client:setPhoto', data => {
        console.log(data);
        if (canDo('client:setPhoto')) {
            Client.update({ photo: data.photo }, {
                where: {
                    id: data.clientId
                }
            }).then(() => {
                Client.findOne({
                    where: { id: data.clientId }
                }).then(res => {
                    socket.emit('client', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                    registrer('Client', res.id, 'edit', socket.nom + ' a modifié la photo de profil du client' + res.nom + ' ' + res.prenom);
                });
            });
        } else {
            socket.emit('client:setPhoto', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    //delete item
    socket.on('client:delete', data => {
        console.log(data);
        if (canDo('client:delete')) {
            Client.destroy({
                where: {
                    id: data.id
                }
            }).then(() => {
                socket.emit('client:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: true });
                registrer('Client', data.id, 'delete', socket.nom + ' a supprimé  le client ' + data.nom + ' ' + data.prenom);
            });
        } else {
            socket.emit('client:delete', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    //restore item
    socket.on('client:restore', data => {
        console.log(data);
        if (canDo('client:restore')) {
            Client.restore({
                where: {
                    id: data.id
                }
            }).then(() => {
                socket.emit('client:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: true });
                registrer('Client', data.id, 'restore', socket.nom + ' a restoré le client ' + data.nom + ' ' + data.prenom);
            });
        } else {
            socket.emit('client:restore', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }

    });


    /**
    * ENGIN METHODE
    */
    //get All
    socket.on('engin:all', data => {
        console.log(data);
        if (canDo('engin:all')) {
            Engin.findAll().then(res => {
                socket.emit('engin:all', { data: res });
            });
        }
    });

    //get deleteditems
    socket.on('engin:trash', data => {
        console.log(data);
        if (canDo('engin:trash')) {
            Engin.findAll({ polaroid: false }).then(res => {
                socket.emit('engin:trash', { data: res });
            });
        }
    });

    //add item
    socket.on('engin:add', data => {
        console.log(data);
        if (canDo('engin:add')) {
            Engin.create(data).then(res => {
                socket.emit('engin:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Engin', res.id, 'add', socket.nom + ' a ajouté l\'engin de type ' + res.typeEngin + ' ' + res.pays + ' ' + res.serie + ' ' + res.matricule);
            });
        } else {
            socket.emit('engin:add', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }

    });

    //edit item
    socket.on('engin:edit', data => {
        console.log(data);
        if (canDo('engin:edit')) {
            Engin.update(data, {
                where: {
                    id: data.id
                }
            }).then(() => {
                Engin.findOne({
                    where: { id: data.id }
                }).then(res => {
                    socket.emit('engin:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                    registrer('Engin', res.id, 'edit', socket.nom + ' a modifié les informations de l\'engin ' + res.typeEngin + ' ' + res.pays + ' ' + res.serie + ' ' + data.matricule);
                });
            });
        } else {
            socket.emit('engin:edit', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    //delete item
    socket.on('engin:delete', data => {
        console.log(data);
        if (canDo('engin:delete')) {
            Engin.destroy({
                where: {
                    id: data.id
                }
            }).then(() => {
                socket.emit('engin:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: true });
                registrer('Engin', data.id, 'delete', socket.nom + ' a supprimé  l\'engin ' + data.typeEngin + ' ' + data.pays + ' ' + data.serie + ' ' + data.matricule);
            });
        } else {
            socket.emit('engin:delete', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });

    //restore item
    socket.on('engin:restore', data => {
        console.log(data);
        if (canDo('engin:restore')) {
            Engin.restore({
                where: {
                    id: data.id
                }
            }).then(() => {
                socket.emit('engin:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: true });
                registrer('Engin', data.id, 'restore', socket.nom + ' a restoré l\'engin ' + data.typeEngin + ' ' + data.pays + ' ' + data.serie + ' ' + data.matricule);
            });
        } else {
            socket.emit('engin:restore', { infos: { type: 'warning', message: 'Vous n\'avez pas les droits!' } });
        }
    });




    /**
     * ModePaiement METHODE
     */
    //get All
    socket.on('modePaiement:all', data => {
        console.log(data);
        ModePaiement.findAll({
            where: {
                deletedAt: null
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('modePaiement:all', { data: res });
        });
    });


    //get deleteditems
    socket.on('modePaiement:trash', data => {
        console.log(data);
        ModePaiement.findAll({
            where: {
                deletedAt: {
                    [Op.ne]: null
                }
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('modePaiement:trash', { data: res });
        });
    });

    //add item
    socket.on('modePaiement:add', data => {
        console.log(data);
        ModePaiement.create(data).then(res => {
            socket.emit('modePaiement:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
            registrer('ModePaiement', res.id, 'add', socket.nom + ' a ajouté la ModePaiement ' + res.nom).then(
                () => socket.broadcast.emit('newData')
            );
        });
    });

    //edit item
    socket.on('modePaiement:edit', data => {
        console.log(data);
        ModePaiement.update(data, {
            where: {
                id: data.id
            }
        }).then(() => {
            ModePaiement.findOne({
                where: { id: data.id }
            }).then(res => {
                socket.emit('modePaiement:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('ModePaiement', res.id, 'edit', socket.nom + ' a modifié les informations de la ModePaiement ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    //delete item
    socket.on('modePaiement:delete', id => {
        console.log(id);
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        ModePaiement.update({ deletedAt: now }, {
            where: {
                id: id
            }
        }).then(() => {
            ModePaiement.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('modePaiement:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('ModePaiement', res.id, 'delete', socket.nom + ' a supprimé  la ModePaiement ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });

        });
    });

    //restore item
    socket.on('modePaiement:restore', id => {
        console.log(id);
        ModePaiement.update({ deletedAt: null }, {
            where: {
                id: id
            }
        }).then(() => {
            ModePaiement.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('modePaiement:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('ModePaiement', res.id, 'restore', socket.nom + ' a restauré la modePaiement ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    /**
     * CATEGORIE METHODE
     */
    //get All
    socket.on('categorie:all', data => {
        console.log(data);
        Categorie.findAll({
            where: {
                deletedAt: null
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('categorie:all', { data: res });
        });
    });


    //get deleteditems
    socket.on('categorie:trash', data => {
        console.log(data);
        Categorie.findAll({
            where: {
                deletedAt: {
                    [Op.ne]: null
                }
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('categorie:trash', { data: res });
        });
    });

    //add item
    socket.on('categorie:add', data => {
        console.log(data);
        Categorie.create(data).then(res => {
            socket.emit('categorie:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
            registrer('Categorie', res.id, 'add', socket.nom + ' a ajouté la categorie ' + res.nom).then(
                () => socket.broadcast.emit('newData')
            );
        });
    });

    //edit item
    socket.on('categorie:edit', data => {
        console.log(data);
        Categorie.update(data, {
            where: {
                id: data.id
            }
        }).then(() => {
            Categorie.findOne({
                where: { id: data.id }
            }).then(res => {
                socket.emit('categorie:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Categorie', res.id, 'edit', socket.nom + ' a modifié les informations de la categorie ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    //delete item
    socket.on('categorie:delete', id => {
        console.log(id);
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        Categorie.update({ deletedAt: now }, {
            where: {
                id: id
            }
        }).then(() => {
            Categorie.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('categorie:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Categorie', res.id, 'delete', socket.nom + ' a supprimé  la categorie ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });

        });
    });

    //restore item
    socket.on('categorie:restore', id => {
        console.log(id);
        Categorie.update({ deletedAt: null }, {
            where: {
                id: id
            }
        }).then(() => {
            Categorie.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('categorie:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Categorie', res.id, 'restore', socket.nom + ' a restauré la categorie ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });


    /**
      * Colis METHODE
      */
    //get All
    socket.on('colis:all', data => {
        console.log(data);
        Colis.findAll({
            where: {
                deletedAt: null
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('colis:all', { data: res });
        });
    });


    //get deleteditems
    socket.on('colis:trash', data => {
        console.log(data);
        Colis.findAll({
            where: {
                deletedAt: {
                    [Op.ne]: null
                }
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('colis:trash', { data: res });
        });
    });

    //add item
    socket.on('colis:add', data => {
        console.log(data);
        Colis.create(data).then(res => {
            socket.emit('colis:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
            registrer('Colis', res.id, 'add', socket.nom + ' a ajouté la colis ' + res.nom).then(
                () => socket.broadcast.emit('newData')
            );
        });
    });

    //edit item
    socket.on('colis:edit', data => {
        console.log(data);
        Colis.update(data, {
            where: {
                id: data.id
            }
        }).then(() => {
            Colis.findOne({
                where: { id: data.id }
            }).then(res => {
                socket.emit('colis:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Colis', res.id, 'edit', socket.nom + ' a modifié les informations de la colis ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    //delete item
    socket.on('colis:delete', id => {
        console.log(id);
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        Colis.update({ deletedAt: now }, {
            where: {
                id: id
            }
        }).then(() => {
            Colis.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('colis:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Colis', res.id, 'delete', socket.nom + ' a supprimé  la colis ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });

        });
    });

    //restore item
    socket.on('colis:restore', id => {
        console.log(id);
        Colis.update({ deletedAt: null }, {
            where: {
                id: id
            }
        }).then(() => {
            Colis.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('colis:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Colis', res.id, 'restore', socket.nom + ' a restauré la colis ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    /**
    * TYPE METHODE
    */
    //get All
    socket.on('typeEngin:all', data => {
        console.log(data);
        TypeEngin.findAll({
            where: {
                deletedAt: null
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('typeEngin:all', { data: res });
        });
    });

    //get deleteditems
    socket.on('typeEngin:trash', data => {
        console.log(data);
        TypeEngin.findAll({
            where: {
                deletedAt: {
                    [Op.ne]: null
                }
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('typeEngin:trash', { data: res });
        });
    });

    //add item
    socket.on('typeEngin:add', data => {
        console.log(data);
        TypeEngin.create(data).then(res => {
            socket.emit('typeEngin:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
            registrer('Type', res.id, 'add', socket.nom + ' a ajouté le type de chambre ' + res.nom).then(
                () => socket.broadcast.emit('newData')
            );
        });
    });

    //edit item
    socket.on('typeEngin:edit', data => {
        console.log(data);
        TypeEngin.update(data, {
            where: {
                id: data.id
            }
        }).then(() => {
            TypeEngin.findOne({
                where: { id: data.id }
            }).then(res => {
                socket.emit('typeEngin:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Type', res.id, 'edit', socket.nom + ' a modifié les informations de le type de chambre ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    //delete item
    socket.on('typeEngin:delete', id => {
        console.log(id);
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        TypeEngin.update({ deletedAt: now }, {
            where: {
                id: id
            }
        }).then(() => {
            TypeEngin.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('typeEngin:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Type', res.id, 'delete', socket.nom + ' a supprimé  le type e chambre ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });

        });
    });

    //restore item
    socket.on('typeEngin:restore', id => {
        console.log(id);
        TypeEngin.update({ deletedAt: null }, {
            where: {
                id: id
            }
        }).then(() => {
            TypeEngin.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('typeEngin:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Type', res.id, 'restore', socket.nom + ' a restauré le type de chambre ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });


    /**
     * TarifColis METHODE
     */
    //get All
    socket.on('tarifColis:all', data => {
        console.log(data);
        TarifColis.findAll({
            where: {
                deletedAt: null
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('tarifColis:all', { data: res });
        });
    });


    //get deleteditems
    socket.on('tarifColis:trash', data => {
        console.log(data);
        TarifColis.findAll({
            where: {
                deletedAt: {
                    [Op.ne]: null
                }
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('tarifColis:trash', { data: res });
        });
    });

    //add item
    socket.on('tarifColis:add', data => {
        console.log(data);
        TarifColis.create(data).then(res => {
            socket.emit('tarifColis:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
            registrer('TarifColis', res.id, 'add', socket.nom + ' a ajouté la tarifColis ' + res.nom).then(
                () => socket.broadcast.emit('newData')
            );
        });
    });

    //edit item
    socket.on('tarifColis:edit', data => {
        console.log(data);
        TarifColis.update(data, {
            where: {
                id: data.id
            }
        }).then(() => {
            TarifColis.findOne({
                where: { id: data.id }
            }).then(res => {
                socket.emit('tarifColis:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('TarifColis', res.id, 'edit', socket.nom + ' a modifié les informations de la tarifColis ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    //delete item
    socket.on('tarifColis:delete', id => {
        console.log(id);
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        TarifColis.update({ deletedAt: now }, {
            where: {
                id: id
            }
        }).then(() => {
            TarifColis.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('tarifColis:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('TarifColis', res.id, 'delete', socket.nom + ' a supprimé  la tarifColis ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });

        });
    });

    //restore item
    socket.on('tarifColis:restore', id => {
        console.log(id);
        TarifColis.update({ deletedAt: null }, {
            where: {
                id: id
            }
        }).then(() => {
            TarifColis.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('tarifColis:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('TarifColis', res.id, 'restore', socket.nom + ' a restauré la tarifColis ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });


    /**
     * TarifDistance METHODE
     */
    //get All
    socket.on('tarifDistance:all', data => {
        console.log(data);
        TarifDistance.findAll({
            where: {
                deletedAt: null
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('tarifDistance:all', { data: res });
        });
    });


    //get deleteditems
    socket.on('tarifDistance:trash', data => {
        console.log(data);
        TarifDistance.findAll({
            where: {
                deletedAt: {
                    [Op.ne]: null
                }
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('tarifDistance:trash', { data: res });
        });
    });

    //add item
    socket.on('tarifDistance:add', data => {
        console.log(data);
        TarifDistance.create(data).then(res => {
            socket.emit('tarifDistance:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
            registrer('TarifDistance', res.id, 'add', socket.nom + ' a ajouté la tarifDistance ' + res.nom).then(
                () => socket.broadcast.emit('newData')
            );
        });
    });

    //edit item
    socket.on('tarifDistance:edit', data => {
        console.log(data);
        TarifDistance.update(data, {
            where: {
                id: data.id
            }
        }).then(() => {
            TarifDistance.findOne({
                where: { id: data.id }
            }).then(res => {
                socket.emit('tarifDistance:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('TarifDistance', res.id, 'edit', socket.nom + ' a modifié les informations de la tarifDistance ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    //delete item
    socket.on('tarifDistance:delete', id => {
        console.log(id);
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        TarifDistance.update({ deletedAt: now }, {
            where: {
                id: id
            }
        }).then(() => {
            TarifDistance.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('tarifDistance:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('TarifDistance', res.id, 'delete', socket.nom + ' a supprimé  la tarifDistance ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });

        });
    });

    //restore item
    socket.on('tarifDistance:restore', id => {
        console.log(id);
        TarifDistance.update({ deletedAt: null }, {
            where: {
                id: id
            }
        }).then(() => {
            TarifDistance.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('tarifDistance:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('TarifDistance', res.id, 'restore', socket.nom + ' a restauré la tarifDistance ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });


    /**
    * Message METHODE
    */
    //get All
    socket.on('message:all', data => {
        console.log(data);
        Message.findAll({
            where: {
                deletedAt: null
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('message:all', { data: res });
        });
    });


    //get deleteditems
    socket.on('message:trash', data => {
        console.log(data);
        Message.findAll({
            where: {
                deletedAt: {
                    [Op.ne]: null
                }
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('message:trash', { data: res });
        });
    });

    //add item
    socket.on('message:add', data => {
        console.log(data);
        Message.create(data).then(res => {
            socket.emit('message:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
            registrer('Message', res.id, 'add', socket.nom + ' a ajouté le message ' + res.nom).then(
                () => socket.broadcast.emit('newData')
            );
        });
    });

    //edit item
    socket.on('message:edit', data => {
        console.log(data);
        Message.update(data, {
            where: {
                id: data.id
            }
        }).then(() => {
            Message.findOne({
                where: { id: data.id }
            }).then(res => {
                socket.emit('message:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Message', res.id, 'edit', socket.nom + ' a modifié les informations de le message ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    //delete item
    socket.on('message:delete', id => {
        console.log(id);
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        Message.update({ deletedAt: now }, {
            where: {
                id: id
            }
        }).then(() => {
            Message.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('message:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Message', res.id, 'delete', socket.nom + ' a supprimé le message ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });

        });
    });

    //restore item
    socket.on('message:restore', id => {
        console.log(id);
        Message.update({ deletedAt: null }, {
            where: {
                id: id
            }
        }).then(() => {
            Message.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('message:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Message', res.id, 'restore', socket.nom + ' a restauré le message ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });


    /**
     * Control METHODE
     */
    //get All
    socket.on('control:all', data => {
        console.log(data);
        Control.findAll({
            where: {
                deletedAt: null
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('control:all', { data: res });
        });
    });

    socket.on('control:user', data => {
        console.log(data);
        UserControl.findAll({
            where: {
                userId: data
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('control:user', { data: res });
        });
    });

    socket.on('control:save', data => {
        console.log(data);
        data.forEach(
            item => {
                if (item.id) {
                    UserControl.update({ isChecked: item.isChecked }, {
                        where: {
                            userId: item.userId,
                            controlId: item.controlId
                        }
                    });
                } else {
                    UserControl.create(item);
                }
            }
        );
        socket.emit('control:save', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: true })
    });

    //get deleteditems
    socket.on('control:trash', data => {
        console.log(data);
        Control.findAll({
            where: {
                deletedAt: {
                    [Op.ne]: null
                }
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('control:trash', { data: res });
        });
    });

    //add item
    socket.on('control:add', data => {
        console.log(data);
        Control.create(data).then(res => {
            socket.emit('control:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
            registrer('Control', res.id, 'add', socket.nom + ' a ajouté la control ' + res.nom).then(
                () => socket.broadcast.emit('newData')
            );
        });
    });

    //edit item
    socket.on('control:edit', data => {
        console.log(data);
        Control.update(data, {
            where: {
                id: data.id
            }
        }).then(() => {
            Control.findOne({
                where: { id: data.id }
            }).then(res => {
                socket.emit('control:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Control', res.id, 'edit', socket.nom + ' a modifié les informations de la control ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    //delete item
    socket.on('control:delete', id => {
        console.log(id);
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        Control.update({ deletedAt: now }, {
            where: {
                id: id
            }
        }).then(() => {
            Control.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('control:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Control', res.id, 'delete', socket.nom + ' a supprimé  la control ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });

        });
    });

    //restore item
    socket.on('control:restore', id => {
        console.log(id);
        Control.update({ deletedAt: null }, {
            where: {
                id: id
            }
        }).then(() => {
            Control.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('control:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Control', res.id, 'restore', socket.nom + ' a restauré le control ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });





    /**
     * Emplacement
     */

    //get All
    socket.on('emplacement:all', data => {
        console.log(data);
        Emplacement.findAll({
            order: [
                ['id', 'DESC']
            ],
            where: {
                deletedAt: null
            },
            limit: 10,
            offset: data
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('emplacement:all', { data: res });
        });
    });

    //get deleteditems
    socket.on('emplacement:trash', data => {
        console.log(data);
        Emplacement.findAll({
            where: {
                deletedAt: {
                    [Op.ne]: null
                }
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('emplacement:trash', { data: res });
        });
    });

    //add item
    socket.on('emplacement:add', data => {
        console.log(data);
        Emplacement.create(data.emplacement).then(res => {
            data.produits.forEach(prod => {
                prod.emplacementId = res.id;
                EmplacementProduit.create(prod).then(
                    (x) => {
                        addStock(prod.produitId, prod.quantite);
                    }
                );
            });
            socket.emit('emplacement:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
            registrer('Emplacement', res.id, 'add', socket.nom + ' a ajouté l\' emplacement ' + res.nom).then(
                () => socket.broadcast.emit('newData')
            );
        });
    });

    //edit item
    socket.on('emplacement:edit', data => {
        console.log(data);
        Emplacement.update(data.emplacement, {
            where: {
                id: data.emplacement.id
            }
        }).then(() => {

            Emplacement.findOne({
                where: { id: data.emplacement.id, deletedAt: null }
            }).then(res => {
                EmplacementProduit.findAll({
                    where: { emplacementId: data.emplacement.id, deletedAt: null }
                }).then(
                    (elems) => {
                        data.produits.forEach(prod => {
                            if (!prod.id) {
                                prod.emplacementId = res.id;
                                EmplacementProduit.create(prod).then(
                                    (x) => {
                                        addStock(prod.produitId, prod.quantite);
                                    }
                                );
                            } else {
                                let entity = elems.find(elem => elem.produitId === prod.produitId);
                                if (entity) {
                                    EmplacementProduit.update(prod, {
                                        where: { produitId: prod.produitId, emplacementId: prod.emplacementId }
                                    }).then(
                                        (x) => {
                                            addStock(prod.produitId, prod.quantite - entity.quantite);
                                        }
                                    );
                                } else {
                                    let now = new Date();
                                    now = dateFormat(now) + ' ' + heureFormat(now);
                                    EmplacementProduit.update({ deletedAt: now }, {
                                        where: { produitId: entity.produitId, emplacementId: entity.emplacementId }
                                    }).then(
                                        (x) => {
                                            addStock(entity.produitId, -entity.quantite);
                                        }
                                    );
                                }

                            }
                        });
                    }
                );
                socket.emit('emplacement:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Emplacement', res.id, 'edit', socket.nom + ' a modifié les informations de l\' emplacement ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    //delete item
    socket.on('emplacement:delete', id => {
        console.log(id);
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        Emplacement.update({ deletedAt: now }, {
            where: {
                id: id
            }
        }).then(() => {
            EntreeProduit.findAll({ where: { entreeId: data.id, deletedAt: null } }.then(
                (elems) => {
                    elems.forEach(
                        elem => {
                            let now = new Date();
                            now = dateFormat(now) + ' ' + heureFormat(now);
                            EntreeProduit.update({ deletedAt: now }, {
                                where: { produitId: elem.produitId, entreeId: elem.entreeId }
                            }).then(
                                (x) => {
                                    addStock(elem.produitId, -elem.quantite);
                                }
                            );
                        }
                    );
                })
            );
            Entree.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('entree:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Entree', res.id, 'delete', socket.nom + ' a supprimé l\' entree ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });

        });
    });

    //restore item
    socket.on('emplacement:restore', id => {
        console.log(id);
        Emplacement.update({ deletedAt: null }, {
            where: {
                id: id
            }
        }).then(() => {
            Emplacement.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('emplacement:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Emplacement', res.id, 'restore', socket.nom + ' a restauré l\'emplacement ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    /**
    * SALAIRE
    */

    //get All
    socket.on('salaire:all', data => {
        console.log(data);
        Salaire.findAll({
            order: [
                ['id', 'DESC']
            ],
            where: {
                deletedAt: null
            },
            limit: 10,
            offset: data
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('salaire:all', { data: res });
        });
    });

    socket.on('salaire:produits', data => {
        console.log(data);
        SalaireProduit.findAll({
            where: {
                salaireId: data,
                deletedAt: null
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('salaire:produits', { data: res });
        });
    });


    //get deleteditems
    socket.on('salaire:trash', data => {
        console.log(data);
        Salaire.findAll({
            where: {
                deletedAt: {
                    [Op.ne]: null
                }
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('salaire:trash', { data: res });
        });
    });

    //add item
    socket.on('salaire:add', data => {
        console.log(data);
        Salaire.create(data.salaire).then(res => {
            data.produits.forEach(prod => {
                prod.salaireId = res.id;
                SalaireProduit.create(prod).then(
                    (x) => {
                        addStock(prod.produitId, -prod.quantite);
                    }
                );
            });
            socket.emit('salaire:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
            registrer('Salaire', res.id, 'add', socket.nom + ' a ajouté la salaire ' + res.nom).then(
                () => socket.broadcast.emit('newData')
            );
        });
    });

    //edit item
    socket.on('salaire:edit', data => {
        console.log(data);
        Salaire.update(data.salaire, {
            where: {
                id: data.salaire.id
            }
        }).then(() => {

            Salaire.findOne({
                where: { id: data.salaire.id, deletedAt: null }
            }).then(res => {
                SalaireProduit.findAll({
                    where: { salaireId: data.salaire.id, deletedAt: null }
                }).then(
                    (elems) => {
                        data.produits.forEach(prod => {
                            if (!prod.id) {
                                prod.salaireId = res.id;
                                SalaireProduit.create(prod).then(
                                    (x) => {
                                        addStock(prod.produitId, -prod.quantite);
                                    }
                                );
                            } else {
                                let entity = elems.find(elem => elem.produitId === prod.produitId);
                                if (entity) {
                                    SalaireProduit.update(prod, {
                                        where: { produitId: prod.produitId, salaireId: prod.salaireId }
                                    }).then(
                                        (x) => {
                                            addStock(prod.produitId, entity.quantite - prod.quantite);
                                        }
                                    );
                                } else {
                                    let now = new Date();
                                    now = dateFormat(now) + ' ' + heureFormat(now);
                                    SalaireProduit.update({ deletedAt: now }, {
                                        where: { produitId: entity.produitId, salaireId: entity.salaireId }
                                    }).then(
                                        (x) => {
                                            addStock(entity.produitId, entity.quantite);
                                        }
                                    );
                                }

                            }
                        });
                    }
                );
                socket.emit('salaire:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Salaire', res.id, 'edit', socket.nom + ' a modifié les informations de la salaire ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    //delete item
    socket.on('salaire:delete', id => {
        console.log(id);
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        Salaire.update({ deletedAt: now }, {
            where: {
                id: id
            }
        }).then(() => {
            SalaireProduit.findAll({ where: { salaireId: data.id, deletedAt: null } }.then(
                (elems) => {
                    elems.forEach(
                        elem => {
                            let now = new Date();
                            now = dateFormat(now) + ' ' + heureFormat(now);
                            SalaireProduit.update({ deletedAt: now }, {
                                where: { produitId: elem.produitId, salaireId: elem.salaireId }
                            }).then(
                                (x) => {
                                    addStock(elem.produitId, -elem.quantite);
                                }
                            );
                        }
                    );
                })
            );
            Salaire.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('salaire:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Salaire', res.id, 'delete', socket.nom + ' a supprimé la salaire ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });

        });
    });

    //restore item
    socket.on('salaire:restore', id => {
        console.log(id);
        Salaire.update({ deletedAt: null }, {
            where: {
                id: id
            }
        }).then(() => {
            Salaire.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('salaire:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Salaire', res.id, 'restore', socket.nom + ' a restauré la salaire ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    /**
    * Compte
    */

    //get All
    socket.on('compte:all', data => {
        console.log(data);
        Compte.findAll({
            where: {
                deletedAt: null,
                stoppedAt: null
            },
            include: [{
                model: Produit,
                through: {
                    attributes: ['prixUnitaire', 'quantite'],
                    where: {
                        deletedAt: null
                    }
                }
            }]
        }).then(res => {
            socket.emit('compte:all', { data: res });
        });
    });

    //add item
    socket.on('compte:add', data => {
        console.log(data);
        Compte.create(data.compte).then(res => {
            data.produits.forEach(prod => {
                prod.compteId = res.id;
                CompteProduit.create(prod);
            });
            Compte.findOne({
                where: { id: res.id, deletedAt: null, stoppedAt: null },
                include: [{
                    model: Produit,
                    through: {
                        attributes: ['prixUnitaire', 'quantite'],
                        where: {
                            deletedAt: null
                        }
                    }
                }]
            }).then(res3 => {
                socket.emit('compte:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res3 })
            });
            socket.emit('compte:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
            registrer('Compte', res.id, 'add', socket.nom + ' a ajouté la compte ' + res.nom).then(
                () => socket.broadcast.emit('newData')
            );
        });
    });

    //edit item
    socket.on('compte:edit', data => {
        console.log(data);
        Compte.update(data.compte, {
            where: {
                id: data.compte.id
            }
        }).then(() => {

            Compte.findOne({
                where: { id: data.compte.id, deletedAt: null }
            }).then(res => {
                CompteProduit.findAll({
                    where: { compteId: data.compte.id, deletedAt: null }
                }).then(
                    (elems) => {
                        data.produits.forEach(prod => {
                            if (!prod.id) {
                                prod.compteId = res.id;
                                CompteProduit.create(prod).then(
                                    (x) => {
                                        addStock(prod.produitId, -prod.quantite);
                                    }
                                );
                            } else {
                                let entity = elems.find(elem => elem.produitId === prod.produitId);
                                if (entity) {
                                    CompteProduit.update(prod, {
                                        where: { produitId: prod.produitId, compteId: prod.compteId }
                                    }).then(
                                        (x) => {
                                            addStock(prod.produitId, entity.quantite - prod.quantite);
                                        }
                                    );
                                } else {
                                    let now = new Date();
                                    now = dateFormat(now) + ' ' + heureFormat(now);
                                    CompteProduit.update({ deletedAt: now }, {
                                        where: { produitId: entity.produitId, compteId: entity.compteId }
                                    }).then(
                                        (x) => {
                                            addStock(entity.produitId, entity.quantite);
                                        }
                                    );
                                }

                            }
                        });
                    }
                );
                socket.emit('compte:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Compte', res.id, 'edit', socket.nom + ' a modifié les informations de la compte ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    //delete item
    socket.on('compte:delete', id => {
        console.log(id);
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        Compte.update({ deletedAt: now }, {
            where: {
                id: id
            }
        }).then(() => {
            CompteProduit.findAll({ where: { compteId: data.id, deletedAt: null } }.then(
                (elems) => {
                    elems.forEach(
                        elem => {
                            let now = new Date();
                            now = dateFormat(now) + ' ' + heureFormat(now);
                            CompteProduit.update({ deletedAt: now }, {
                                where: { produitId: elem.produitId, compteId: elem.compteId }
                            }).then(
                                (x) => {
                                    addStock(elem.produitId, -elem.quantite);
                                }
                            );
                        }
                    );
                })
            );
            Compte.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('compte:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Compte', res.id, 'delete', socket.nom + ' a supprimé la compte ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });

        });
    });

    //restore item
    socket.on('compte:restore', id => {
        console.log(id);
        Compte.update({ deletedAt: null }, {
            where: {
                id: id
            }
        }).then(() => {
            Compte.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('compte:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Compte', res.id, 'restore', socket.nom + ' a restauré la compte ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    /**
     * Livraison
     */

    socket.on('livraison:all', data => {
        console.log(data);
        Livraison.findAll({
            where: {
                deletedAt: null
            },
            //     include: [{
            //         model: Client,
            //         where: {
            //             deletedAt: null
            //         }
            //     },
            //     {
            //         model: Chambre,
            //         where: {
            //             deletedAt: null
            //         }
            //     }
            // ]
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('livraison:all', { data: res });
        });
    });


    //get deleteditems
    socket.on('livraison:trash', data => {
        console.log(data);
        Livraison.findAll({
            where: {
                deletedAt: {
                    [Op.ne]: null
                }
            }
        }).then(res => {
            // console.log("All res:", JSON.stringify(res, null, 4));
            socket.emit('livraison:trash', { data: res });
        });
    });

    socket.on('livraison:proprietes', data => {
        console.log(data);
        LivraisonPropriete.findAll({
            where: {
                livraisonId: data.livraisonId
            }
        }).then(
            res => {
                socket.emit('livraison:proprietes', { data: res });
            }
        );
    });

    //add item
    socket.on('livraison:add', data => {
        console.log(data);
        data.nbreJours = 0;
        data.montantTotal = data.prixJournalier;
        Livraison.create(data.livraison).then(res => {
            socket.emit('livraison:add', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
            registrer('Livraison', res.id, 'add', socket.nom + ' a ajouté la livraison' + res.nom).then(
                () => socket.broadcast.emit('newData')
            );
            data.options.forEach(
                option => LivraisonPropriete.create({
                    proprieteId: option.id,
                    livraisonId: res.id,
                    coutAdditionnel: option.coutAdditionnel,
                    isChecked: option.isChecked
                })
            );
        });
    });

    //edit item
    socket.on('livraison:edit', data => {
        console.log(data);
        Livraison.update(data, {
            where: {
                id: data.id
            }
        }).then(() => {
            Livraison.findOne({
                where: { id: data.id }
            }).then(res => {
                socket.emit('livraison:edit', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Livraison', res.id, 'edit', socket.nom + ' a modifié les informations de la livraison' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });

    //delete item
    socket.on('livraison:delete', id => {
        console.log(id);
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        Livraison.update({ deletedAt: now }, {
            where: {
                id: id
            }
        }).then(() => {
            Livraison.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('livraison:delete', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Livraison', res.id, 'delete', socket.nom + ' a supprimé  la livraison ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });

        });
    });

    //restore item
    socket.on('livraison:restore', id => {
        console.log(id);
        Livraison.update({ deletedAt: null }, {
            where: {
                id: id
            }
        }).then(() => {
            Livraison.findOne({
                where: { id: id }
            }).then(res => {
                socket.emit('livraison:restore', { infos: { type: 'success', message: 'Operation effectuée avec success' }, data: res });
                registrer('Livraison', res.id, 'restore', socket.nom + ' a restauré la livraison ' + res.nom).then(
                    () => socket.broadcast.emit('newData')
                );
            });
        });
    });


    /**
     * DECONNEXION
     */

    socket.on('disconnect', () => {
        let now = new Date();
        now = dateFormat(now) + ' ' + heureFormat(now);
        if (socket.isAuth) {
            User.update({ isOnline: false, connexionSince: now }, {
                where: {
                    id: socket.uid
                }
            }).then(
                (id) => {
                    socket.isAuth = false;
                    socket.emit('auth:logout', { infos: { type: 'success', message: 'Vous etes deconnecté!' }, data: true });
                    registrer('User', id, 'deconnexion', socket.nom + ' s\'est deconnecté!').then(
                        (notification) => socket.broadcast.emit('newData', notification)
                    );
                }
            );
        }
    });

});

server.listen(3000, () => {
    console.log('server listen on port 3000');
});
