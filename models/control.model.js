module.exports = function (sequelize, Sequelize) {
    const Control = sequelize.define('control', {
        // attributes
        model: {
            type: Sequelize.STRING,
        },
        typeOperation: {
            type: Sequelize.STRING,
        },
        description: {
            type: Sequelize.TEXT,
        }
    }, {
        // options
    });
    return Control;
}

