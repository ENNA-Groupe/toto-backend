module.exports = function (sequelize, Sequelize) {
    const Engin = sequelize.define('engin', {
        // attributes
        typeEngin: {
            type: Sequelize.STRING,
            allowNull: false
        },
        marque: {
            type: Sequelize.STRING,
            allowNull: false
        },
        model: {
            type: Sequelize.STRING,
            allowNull: false
        },
        pays: {
            type: Sequelize.STRING,
            allowNull: false
        },
        serie: {
            type: Sequelize.STRING,
            allowNull: false
        },
        matricule: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        numeroChasis: {
            type: Sequelize.STRING,
            allowNull: false
        },
        couleur: {
            type: Sequelize.STRING,
            allowNull: false
        }
    }, {
        // options
        paranoid: true
    });
    return Engin;
}

