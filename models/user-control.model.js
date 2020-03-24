module.exports = function (sequelize, Sequelize) {
    const UserControl = sequelize.define('userControl', {
        // attributes
        isChecked: {
            type: Sequelize.BOOLEAN
        },
    }, {
        // options
    });
    return UserControl;
}

