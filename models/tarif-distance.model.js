module.exports = function (sequelize, Sequelize) {
    const TarifDistance = sequelize.define('tarif-distance', {
        // attributes
        montant: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        borneInferieur: {
            type: Sequelize.INTEGER
        },
        borneSuperieur: {
            type: Sequelize.INTEGER
        },
        deletedAt: {
            type: Sequelize.DATE,
        }
    }, {
        // options
    });
    return TarifDistance;
}