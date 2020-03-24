module.exports = function (sequelize, Sequelize) {
    const Groupe = sequelize.define('groupe', {
        // attributes
        nom: {
            type: Sequelize.STRING,
            allowNull: false
        },
        description: {
            type: Sequelize.TEXT,
        }
    }, {
        // options
    });
    return Groupe;
}

