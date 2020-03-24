module.exports = function (sequelize, Sequelize) {
    const Message = sequelize.define('message', {
        // attributes
        titre: {
            type: Sequelize.STRING,
            allowNull: false
        },  
        contenu: {
            type: Sequelize.TEXT,
            allowNull: false
        },    
        deletedAt: {
            type: Sequelize.DATE,
        }
    }, {
        // options
    });
    return Message;
}

