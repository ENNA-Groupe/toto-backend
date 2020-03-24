module.exports = function (sequelize, Sequelize) {
    const ModePaiement = sequelize.define('mode_paiement', {
        // attributes
        nom: {
            type: Sequelize.STRING,
            allowNull: false
        },
        numero: {
            type: Sequelize.STRING,
            allowNull: false
        },
        compagnie: {
            type: Sequelize.STRING,
            allowNull: false
        }
    }, {
        // options
        paranoid: true

    });
    return ModePaiement;
}