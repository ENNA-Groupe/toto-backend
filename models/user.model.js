module.exports = function (sequelize, Sequelize) {
    const User = sequelize.define('user', {  
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
        salaire: {
            type: Sequelize.INTEGER,
            // allowNull: false
        }
    }, {
        // options
        paranoid: true
    });
    return User;
}

