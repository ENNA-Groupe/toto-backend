module.exports = function (sequelize, Sequelize) {
    const Colis = sequelize.define('coli', {
        // attributes
        quantite: {
            type: Sequelize.STRING,
            allowNull: false
        },
         // attributes
         poidsEstime: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        poids: {
            type: Sequelize.INTEGER
        },
        descriptionClient: {
            type: Sequelize.TEXT,
        },
        descriptionCoursier: {
            type: Sequelize.TEXT,
        },
        deletedAt: {
            type: Sequelize.DATE,
        }
    }, {
        // options
    });
    return Colis;
}

