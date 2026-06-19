/**
 * 2C = Two of Clubs
 * 2D = Two of Diamonds
 * 2H = Two of Hearts
 * 2S = Two of Spades
 *
 * Blackjack con reglas oficiales:
 *  - El As vale 1 u 11 (lo que más convenga a la mano).
 *  - Reparto inicial de 2 cartas a cada uno; la banca muestra una carta
 *    boca arriba y deja una boca abajo (hole card).
 *  - La banca juega DESPUÉS de que el jugador se planta y pide hasta llegar a 17.
 *  - El Blackjack natural (As + carta de 10 en las dos primeras) gana al instante.
 */

let deck         = [];
const tipos      = ['C','D','H','S'];
const especiales = ['A','J','Q','K'];

// Manos como arreglos de cartas, p.ej. ['AS', '7D']
let cartasJugador     = [];
let cartasComputadora = [];

let imgHoleCard = null;   // referencia al <img> boca abajo de la banca
let enJuego     = false;  // bloquea clicks mientras la banca juega o tras terminar

// Referencias del HTML
const btnPedir   = document.querySelector('#btnPedir');
const btnDetener = document.querySelector('#btnDetener');
const btnNuevo   = document.querySelector('#btnNuevo');

const divCartasJugador     = document.querySelector('#jugador-cartas');
const divCartasComputadora = document.querySelector('#computadora-cartas');

const divResultado = document.querySelector('#resultado');

const puntosHTML = document.querySelectorAll('small');

const DORSO = 'assets/cartas/grey_back.png';

// Muestra el resultado en pantalla. tipo: 'gana' | 'pierde' | 'empate'
const mostrarResultado = ( texto, tipo ) => {
    divResultado.textContent = texto;
    divResultado.className = `resultado resultado--visible resultado--${ tipo }`;
}

const ocultarResultado = () => {
    divResultado.className = 'resultado';
    divResultado.textContent = '';
}

// Esta función crea un nuevo deck
const crearDeck = () => {

    deck = [];

    for( let i = 2; i <= 10; i++ ) {
        for( let tipo of tipos ) {
            deck.push( i + tipo);
        }
    }

    for( let tipo of tipos ) {
        for( let esp of especiales ) {
            deck.push( esp + tipo);
        }
    }

    deck = _.shuffle( deck );
    return deck;
}

// Esta función me permite tomar una carta
const pedirCarta = () => {

    if ( deck.length === 0 ) {
        throw 'No hay cartas en el deck';
    }
    const carta = deck.pop();
    return carta;
}

// Valor base de una carta (el As cuenta como 11; se ajusta en calcularPuntos)
const valorCarta = ( carta ) => {

    const valor = carta.substring(0, carta.length - 1);
    return ( isNaN( valor ) ) ?
            ( valor === 'A' ) ? 11 : 10
            : valor * 1;
}

// Suma una mano aplicando la regla del As (11 -> 1 mientras se pase de 21)
const calcularPuntos = ( cartas ) => {

    let total = 0;
    let ases  = 0;

    for ( const carta of cartas ) {
        total += valorCarta( carta );
        if ( carta[0] === 'A' ) {
            ases++;
        }
    }

    while ( total > 21 && ases > 0 ) {
        total -= 10; // un As pasa de 11 a 1
        ases--;
    }

    return total;
}

// Blackjack natural: 21 con exactamente las dos primeras cartas
const esBlackjack = ( cartas ) => cartas.length === 2 && calcularPuntos( cartas ) === 21;

// Espera a que una imagen termine de cargarse (y pintarse) antes de continuar
const esperarCarta = ( img ) => {
    if ( img.complete ) {
        return Promise.resolve();
    }
    return new Promise( ( resolve ) => {
        img.addEventListener( 'load',  resolve, { once: true } );
        img.addEventListener( 'error', resolve, { once: true } );
    });
}

// Pequeña espera para garantizar que el navegador pinte antes de seguir
const esperarPintado = () => new Promise( ( resolve ) =>
    requestAnimationFrame( () => requestAnimationFrame( resolve ) )
);

// Crea y agrega el <img> de una carta a un contenedor; devuelve el elemento
const agregarCartaDOM = ( div, carta ) => {
    const imgCarta = document.createElement('img');
    imgCarta.src = `assets/cartas/${ carta }.png`;
    imgCarta.classList.add('carta');
    div.append( imgCarta );
    return imgCarta;
}

// Refresca los marcadores. Antes de revelar, la banca solo muestra su carta visible.
const actualizarPuntos = ( { revelarDealer } = {} ) => {
    puntosHTML[0].innerText = calcularPuntos( cartasJugador );
    puntosHTML[1].innerText = revelarDealer
        ? calcularPuntos( cartasComputadora )
        : valorCarta( cartasComputadora[0] );
}

// Da vuelta la carta oculta de la banca y espera a que cargue la imagen real
const revelarHoleCard = () => {
    imgHoleCard.src = `assets/cartas/${ cartasComputadora[1] }.png`;
    imgHoleCard.classList.add('carta--revelar');
    return esperarCarta( imgHoleCard );
}

const habilitarBotones = ( habilitar ) => {
    btnPedir.disabled   = !habilitar;
    btnDetener.disabled = !habilitar;
}

// Decide y muestra el ganador comparando ambas manos
const determinarGanador = () => {

    const pJ = calcularPuntos( cartasJugador );
    const pC = calcularPuntos( cartasComputadora );

    if ( pJ > 21 ) {
        mostrarResultado('Te pasaste, gana la Computadora \u{1F916}', 'pierde');
    } else if ( pC > 21 ) {
        mostrarResultado('La Computadora se pasó, \u{1F389} ¡Ganaste!', 'gana');
    } else if ( pJ > pC ) {
        mostrarResultado('\u{1F389} ¡Ganaste!', 'gana');
    } else if ( pJ < pC ) {
        mostrarResultado('Gana la Computadora \u{1F916}', 'pierde');
    } else {
        mostrarResultado('Empate \u{1F91D}', 'empate');
    }
}

// Turno de la banca: revela su carta y pide hasta llegar a 17 o más
const turnoDealer = async () => {

    enJuego = false;
    habilitarBotones( false );

    await revelarHoleCard();
    actualizarPuntos({ revelarDealer: true });

    // Si el jugador se pasó, la banca no necesita jugar
    if ( calcularPuntos( cartasJugador ) <= 21 ) {

        const nuevasCartas = [];

        while ( calcularPuntos( cartasComputadora ) < 17 ) {
            const carta = pedirCarta();
            cartasComputadora.push( carta );
            nuevasCartas.push( agregarCartaDOM( divCartasComputadora, carta ) );
            actualizarPuntos({ revelarDealer: true });
        }

        await Promise.all( nuevasCartas.map( esperarCarta ) );
    }

    await esperarPintado();
    determinarGanador();
}

// Reparte una mano nueva y arranca la ronda
const iniciarJuego = async () => {

    crearDeck();

    cartasJugador     = [];
    cartasComputadora = [];
    imgHoleCard       = null;

    divCartasJugador.innerHTML     = '';
    divCartasComputadora.innerHTML = '';
    ocultarResultado();

    // Reparto: jugador, banca (visible), jugador, banca (oculta)
    cartasJugador.push( pedirCarta() );
    cartasComputadora.push( pedirCarta() );
    cartasJugador.push( pedirCarta() );
    cartasComputadora.push( pedirCarta() );

    agregarCartaDOM( divCartasJugador, cartasJugador[0] );
    agregarCartaDOM( divCartasComputadora, cartasComputadora[0] );
    agregarCartaDOM( divCartasJugador, cartasJugador[1] );
    imgHoleCard = agregarCartaDOM( divCartasComputadora, cartasComputadora[1] );
    imgHoleCard.src = DORSO; // se muestra boca abajo

    actualizarPuntos({ revelarDealer: false });

    // Blackjack natural: resolución inmediata
    const jBJ = esBlackjack( cartasJugador );
    const cBJ = esBlackjack( cartasComputadora );

    if ( jBJ || cBJ ) {
        habilitarBotones( false );
        enJuego = false;
        await revelarHoleCard();
        actualizarPuntos({ revelarDealer: true });
        await esperarPintado();

        if ( jBJ && cBJ ) {
            mostrarResultado('Empate, ambos Blackjack \u{1F91D}', 'empate');
        } else if ( jBJ ) {
            mostrarResultado('\u{1F389} ¡Blackjack! Ganaste', 'gana');
        } else {
            mostrarResultado('La Computadora tiene Blackjack \u{1F916}', 'pierde');
        }
        return;
    }

    enJuego = true;
    habilitarBotones( true );
}


// Eventos
btnPedir.addEventListener('click', () => {

    if ( !enJuego ) return;

    const carta = pedirCarta();
    cartasJugador.push( carta );
    agregarCartaDOM( divCartasJugador, carta );

    const puntos = calcularPuntos( cartasJugador );
    actualizarPuntos({ revelarDealer: false });

    if ( puntos > 21 ) {
        // El jugador se pasa: termina la ronda
        turnoDealer();
    } else if ( puntos === 21 ) {
        // 21 exacto: se planta automáticamente
        turnoDealer();
    }

});


btnDetener.addEventListener('click', () => {
    if ( !enJuego ) return;
    turnoDealer();
});

btnNuevo.addEventListener('click', () => {
    iniciarJuego();
});

// Reparte la primera mano al cargar
iniciarJuego();
