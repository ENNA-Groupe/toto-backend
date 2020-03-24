module.exports = function (sequelize, Sequelize) {
    const TypeE = sequelize.define('type-engin', {
        // attributes
        nom: {
            type: Sequelize.STRING,
            allowNull: false
        },
        icone: {
            type: Sequelize.TEXT
        }
    }, {
        // options
        paranoid: true
    });
    return TypeE;
}

