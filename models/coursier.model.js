module.exports = function (sequelize, Sequelize) {
    const Coursier = sequelize.define('coursier', { 
        // attributes
        nom: {
            type: Sequelize.STRING,
            allowNull: false
        },
        prenom: {
            type: Sequelize.STRING
            // allowNull defaults to true
        },
        identifiant: {
            type: Sequelize.STRING,
            allowNull: false
        },
        password: {
            type: Sequelize.STRING,
            allowNull: false
        },
        salt: {
            type: Sequelize.STRING,
            allowNull: false
        },
        contact1: {
            type: Sequelize.STRING,
            allowNull: false
        },
        contact2: {
            type: Sequelize.STRING,
            allowNull: false
        },
        adresse: {
            type: Sequelize.STRING,
        },
        numeroPermis: {
            type: Sequelize.STRING,
        },
        numeroIdentite: {
            type: Sequelize.STRING,
        },
        photo: {
            type: Sequelize.TEXT('long'),
        },
        isOnline: {
            type: Sequelize.BOOLEAN,
        },
        connexionSince: {
            type: Sequelize.DATE
        },
        longitude: {
            type: Sequelize.STRING
        },
        latitude: {
            type: Sequelize.STRING
        }
    }, {
        // options
        paranoid: true
    });
    return Coursier;
}

