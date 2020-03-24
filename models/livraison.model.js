module.exports = function (sequelize, Sequelize) {
    const Livraison = sequelize.define('livraison', {
         // attributes
         montant: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        startedAt: {
            type: Sequelize.DATE
        },
        stoppedAt: {
            type: Sequelize.DATE
        },
        deletedAt: {
            type: Sequelize.DATE,
        }
    }, {
        // options
    });
    return Livraison;
}