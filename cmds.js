const Sequelize = require('sequelize');
const {log, biglog, errorlog, colorize}=require('./out');
const {models} =require('./model');

/**
 * Muestra ayuda.
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.helpCmd= rl => {
    log("Comandos:");
    log("   h|help - Muestra esta ayuda.");
    log("   list - Listar los quizzes existentes.");
    log("   show <id> - Muestra la pregunta y la respuesta del quiz indicado.");
    log("   add - Muestra esta ayuda.");
    log("   delete <id> - Borrar el quiz indicado.");
    log("   edit <id> - Editar el quiz indicado.");
    log("   test <id> - Probar el quiz indicado.");
    log("   p|play - Jugar a preguntar aleatoriamnete todos los quizzes.");
    log("   credits - Créditos.");
    log("   q|quit - Salir del programa.");
    rl.prompt();
};
/**
 * Terminar el programa.
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.quitCmd=rl => {
    rl.close();
};
/**
 * Esta función devuleve una promesa que cuando se cumple, proporciona el texto intro
 * Entonces la llamada a then que hay que hacer la promsea de vuelta
 *          .then(answer => {...})
 *
 * También colorea en rojo el texto de la pregunta, elimina espacios al principio y final
 *
 * @param rl     Objeto readline usado apra implementar el CLI.
 * @param text   Pregunta que hay que hacerle al usuario.
 */

const makeQuestion = (rl,text) => {
    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer =>{
            resolve(answer.trim());
        });
    });
};


/**
 * Añade un nuevo quiz al módelo.
 * Pregunta interactivamente por la pregunta y por la respuesta.
 *
 * Hay que recordar qeu el funcionamiento de la función rl.question es asíncrono
 * El prompt hay qur sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.addCmd=rl => {
    makeQuestion(rl, 'Introduzca una pregunta: ')
        .then (q => { //lo anido para poder tener acceso a a y a q a la vez
            return makeQuestion(rl, 'Introduzca la respuesta ')
                .then(a => {
                    return {question: q, answer: a};
                });
        })
        .then(quiz => {
            return models.quiz.create(quiz);
        })
        .then((quiz) => {
            log(`${colorize('Se ha añadido', 'magenta')}: ${quiz.question}${colorize('=> ', 'magenta')}${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => { //si hay error de validación: preguntas vacías,...
            errorlog('El quiz es erroneo: ');
            error.errors.forEach(({message})=> errorlog (message));
        })
        .catch(error => {
            errorlog (error.message);
        })
        .then (() => {
            rl.prompt();
        });
};
/**
 * Lista todos los quizzes existentes en el modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.listCmd=rl => {
    models.quiz.findAll()
        .each(quiz =>{
            log(`[${colorize(quiz.id, 'magenta')}]:  ${quiz.question}`);
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(()=> {
            rl.prompt();
        });
    // models.quiz.findAll() //promesa y dentro de un rato devuelve todos los quizzes existentes
    //     .then(quizzes => { //quizzes array con todos los quizzes que devuelve la promesa
    //        quizzes.forEach(quiz =>{
    //             log(`[${colorize(quiz.id, 'magenta')}]:  ${quiz.question}`);
    //        });
    //  })
    // .catch(error => {
    //     errorlog(error.message);
    //  })
    //  .then(()=> {
    //      rl.prompt();
    //  });
};

/**
 * Esta funcion devuelve una promesa que:
 *  - Valida que se ha introducido un valor para el parámetro.
 *  - Convierte el parámetro en un número entero.
 * Si todo va bien, la promesa se satisface y devuelve el valor de id a usar
 *
 * @param rl Parámetro con el índice a validar
 */
const validateId = id => {
    return new Sequelize.Promise ((resolve, reject) => {
        if (typeof id === "undefined") {
            reject(new Error(`Falta el parámetro <id>.`));
        }else{
            id = parseInt(id); //coge la parte entera y descarta lo demás
            if(Number.isNaN(id)){
                reject(new Error(`El valor del parámetro <id> no es un número.`));
            }else{
                resolve(id);
            }
        }
    });
};


/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param rl Objeto readline usado para implementar el CLI
 * @param id  Clave del quiz a mostrar.
 */
exports.showCmd=(rl,id) => {
    validateId(id) //devuleve una promesa
        .then(id => models.quiz.findById(id)) //si la promesa funciona bien hace el then, sino va al catch
        .then (quiz => { //con el quiz que devuelve el then de arriba
            if (!quiz){
                throw new Error (`No existe un quiz asociado al id=${id}.`);
            }
            log(`[${colorize(quiz.id, 'magenta')}]: ${quiz.question}${colorize(' =>', 'magenta')} ${quiz.answer}`);
        })
        .catch (error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};
/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 *
 * @param rl Objeto readline usado para implementar el CLI
 * @param id  Clave del quiz probar.
 */
exports.testCmd=(rl,id) => {
    validateId(id)
        .then( id => models.quiz.findById(id))
        .then( quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`)
            }
            return makeQuestion(rl, `${quiz.question} `)
                .then(a => {
                    if((quiz.answer.toLowerCase().trim())===(a.toLowerCase().trim())){
                        log(' Su respuesta es: ');
                        log (' Correcta');
                        biglog('CORRECTO', 'green');
                    }else{
                        log(' Su respuesta es: ');
                        log (' Incorrecta');
                        biglog('INCORRECTO', 'red');
                    }
                    return quiz;
                });
        })
        .catch(Sequelize.ValidationError, error => {
                errorlog('El quiz es erróneo: ');
                error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
                    errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};
/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.playCmd = rl => {
    let score = 0;
    let toBeResolved = [];

    const playOne = () => {
        return Promise.resolve()
            .then(() => {
                if (toBeResolved.length <= 0){
                    log(`No hay nada más que preguntar.`);
                    log(`Fin del examen. Aciertos: `);
                    biglog(`${score}`, 'cyan');
                    rl.prompt();
                    return;
                }

                let id = Math.floor(Math.random() * toBeResolved.length);
                let quiz = toBeResolved[id];
                toBeResolved.splice(id,1);

                makeQuestion(rl, `${quiz.question}:`)
                    .then(a => {
                        if((quiz.answer.toLowerCase().trim()) === (answer.toLowerCase().trim())){
                            score++;
                            log(`CORRECTO - Lleva ${score} aciertos`);
                            return playOne();
                        } else {
                            log(`INCORRECTO.`);
                            log(`Fin del examen. Aciertos:`);
                            biglog(`${score}`, 'cyan');
                            rl.prompt();
                        }
                    })
            })
    }
    models.quiz.findAll({raw: true})
        .then(quizzes => {
            toBeResolved = quizzes;
        })
        .then(() => {
            return playOne();
        })
        .catch(e => {
            console.log("Error: " +e);
        })
        .then(() => {
            rl.prompt();
        })
};

/**
 * Edita un quiz del modelo.
 *
 * Hay que recordar qeu el funcionamiento de la función rl.question es asíncrono
 * El prompt hay qur sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question
 *
 * @param rl Objeto readline usado para implementar el CLI
 * @param id  Clave del quiz a editar en el modelo.
 */
exports.editCmd=(rl,id) => {
    validateId(id)
        .then( id => models.quiz.findById(id))
        .then( quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`)
            }
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
            return makeQuestion(rl, ' Introduzca la pregunta: ')
                .then(q => {
                    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
                    return makeQuestion(rl, ' Introduzca la respuesta ')
                        .then(a => {
                            quiz.question = q;
                            quiz.answer = a;
                            return quiz;
                        });
                });
        })
        .then (quiz => {
            return quiz.save();
        })
        .then(quiz => {
            log(`Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question}${colorize('=> ', 'magenta')}${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog('El quiz es erróneo: ');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};
/**
 * Borra un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI
 * @param id  Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd=(rl,id) => {
    validateId(id)
        .then(id => models.quiz.destroy({where: {id}}))
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};
/**
 * Muestra los nombres de los autores de la práctica
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.creditsCmd=rl => {
    log('Autores de la práctica:');
    log('Virginia Blanco Rávena','green');
    log('Andrea Pérez Isla','green');
    rl.prompt();
};
