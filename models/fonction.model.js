module.exports = function (sequelize, Sequelize) {
    const Fonction = sequelize.define('fonction', {
        // attributes
        nom: {
            type: Sequelize.STRING,
            allowNull: false
        },
        description: {
            type: Sequelize.TEXT,
        },
        deletedAt: {
            type: Sequelize.DATE,
        }
    }, {
        // options
    });
    return Fonction;
}

