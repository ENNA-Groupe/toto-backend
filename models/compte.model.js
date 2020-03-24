module.exports = function (sequelize, Sequelize) {
    const Compte = sequelize.define('compte', {
        // attributes    
        solde: {
            type: Sequelize.INTEGER,
        },
        deletedAt: {
            type: Sequelize.DATE,
        }
    }, {
        // options
    });
    return Compte;
}

