module.exports = function (sequelize, Sequelize) {
    const Operation = sequelize.define('operation', {
         //cle
        userId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        platform: {
            type: Sequelize.STRING,
            allowNull: false
        },
        // attributes
        model: {
            type: Sequelize.STRING,
            allowNull: false
        },
        idInTable: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        typeOperation: {
            type: Sequelize.STRING,
            allowNull: false
        },
        description: {
            type: Sequelize.TEXT,
        },
        
    }, {
        // options
    });
    return Operation;
}

