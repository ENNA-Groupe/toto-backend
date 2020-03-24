module.exports = function (sequelize, Sequelize) {
    const TarifColis = sequelize.define('tarif-coli', {
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
    return TarifColis;
}