module.exports = function (sequelize, Sequelize) {
    const Emplacement = sequelize.define('emplacement', {
        // attributes
        nom: {
            type: Sequelize.STRING,
            allowNull: false
        },
        longitude: {
            type: Sequelize.INTEGER,
        },
        latitude: {
            type: Sequelize.INTEGER,
        },
        deletedAt: {
            type: Sequelize.DATE,
        }
    }, {
        // options
    });
    return Emplacement;
}