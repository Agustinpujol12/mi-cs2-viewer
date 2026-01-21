import { Component } from "react";
// ⚠️ IMPORTANTE: Agregamos MSG_PLAY_TOGGLE a los imports
import { MSG_INIT_ROUNDS, MSG_PLAY, MSG_PLAY_ROUND_UPDATE, MSG_PLAY_TOGGLE } from "../constants";
import "./RoundNav.css";

class RoundNav extends Component {
  constructor(props) {
    super(props);
    // Agregamos currentRound y maxRounds al estado para la lógica de la "K"
    this.state = { rounds: [], currentRound: 0, maxRounds: 0 };
    this.messageBus = props.messageBus;
    
    this.messageBus.listen([MSG_INIT_ROUNDS], (msg) => {
      let roundsElements = [];
      
      msg.rounds.forEach((r) => {
        const winnerClass = (r.winner === 2 || r.winner === "T") ? "T" : "CT";
        
        roundsElements.push(
          <Round
            key={`round${r.roundno}`}
            winner={winnerClass} 
            roundNo={r.roundno}
            messageBus={this.messageBus}
          />
        );

        if (r.roundno === 12) {
          roundsElements.push(<div key="divider" className="round-divider"></div>);
        }
      });
      
      this.setState({ 
        rounds: roundsElements,
        maxRounds: msg.rounds.length // Guardamos el total
      });
    });

    // Escuchamos en qué ronda estamos
    this.messageBus.listen([MSG_PLAY_ROUND_UPDATE], (msg) => {
        this.setState({ currentRound: msg.round });
    });

    // Bindeamos la función para que 'this' funcione dentro
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  // ✅ ACTIVAR ESCUCHA DE TECLADO
  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);
  }

  // 🗑️ LIMPIAR ESCUCHA AL SALIR (IMPORTANTE PARA NO DUPLICAR EVENTOS)
  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  handleKeyDown(e) {
    // ⏯️ ESPACIO: Play / Pause
    if (e.code === "Space") {
        e.preventDefault(); // Evita que la página baje (scroll)
        this.messageBus.emit({ msgtype: MSG_PLAY_TOGGLE });
    }

    // ⏭️ LETRA K: Siguiente Ronda
    if (e.key === "k" || e.key === "K") {
        // Solo avanza si no es la última ronda
        if (this.state.currentRound < this.state.maxRounds) {
            this.messageBus.emit({ 
                msgtype: MSG_PLAY, 
                round: this.state.currentRound + 1 
            });
        }
    }
  }

  render() {
    return (
      <div className="round-nav-strip">
        {this.state.rounds}
      </div>
    );
  }
}

class Round extends Component {
  constructor(props) {
    super(props);
    this.state = { active: false };
    this.messageBus = props.messageBus;
    
    this.messageBus.listen([MSG_PLAY_ROUND_UPDATE], (msg) => {
      this.setState({ active: msg.round === this.props.roundNo });
    });
  }

  playRound(round) {
    this.setState({ active: true });
    this.messageBus.emit({ msgtype: MSG_PLAY, round: round });
  }

  render() {
    const { winner, roundNo } = this.props;
    const { active } = this.state;

    return (
      <button
        className={`round-btn ${winner} ${active ? "active" : ""}`}
        onClick={() => this.playRound(roundNo)}
      >
        {roundNo}
      </button>
    );
  }
}

export default RoundNav;