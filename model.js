const Sequelize = require('sequelize');
const sequelize = new Sequelize("sqlite:quizzes.sqlite", {logging: false}); //entre paréntesis base de datos a la que quiero acceder
//al poner lo de {logging: false} te dejan de salir trazas

sequelize.define('quiz', {
    question: {
        type: Sequelize.STRING,
        unique: {msg: "Ya existe esta pregunta"},
        validate: {notEmpty: {msg: "La pregunta no puede estar vacía"}}
    },
    answer: {
        type: Sequelize.STRING,
        validate: {notEmpty: {msg: "La pregunta no puede estar vacía"}}
    }
});


sequelize.sync()
.then(() => sequelize.models.quiz.count()) //promesa
.then(count => { //si se termina la promesa creo
    if(!count){
        return sequelize.models.quiz.bulkCreate([ //promesa
            {question: "Capital de Italia", answer: "Roma"},
            {question: "Capital de Francia", answer: "París"},
            {question: "Capital de España", answer: "Madrid"},
            {question: "Capital de Portugal", answer: "Lisboa"}
        ]);
    }
})
.catch(error =>{
    console.log(error);
});

module.exports = sequelize;