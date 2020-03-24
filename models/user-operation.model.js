module.exports = function (sequelize, Sequelize) {
    const UserOperation = sequelize.define('user-operation', {
        // attributes
        isSeen: {
            type: Sequelize.DATE
        },
    }, {
        // options
    });
    return UserOperation;
}

