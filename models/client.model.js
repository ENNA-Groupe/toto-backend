module.exports = function (sequelize, Sequelize) {
    const Client = sequelize.define('client', {
        // attributes
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
            allowNull: false
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
    }, {
        // options
        paranoid: true
    });
    return Client;
}

