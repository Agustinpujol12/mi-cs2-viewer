import { Component } from "react";
// ⚠️ IMPORTANTE: Agregamos MSG_PLAY_TOGGLE a los imports
import { MSG_INIT_ROUNDS, MSG_PLAY, MSG_PLAY_ROUND_UPDATE, MSG_PLAY_TOGGLE } from "../constants";
import "./RoundNav.css";

class RoundNav extends Component {
  constructor(props) {
    super(props);
    this.state = { rounds: [], currentRound: 0, maxRounds: 0, validIds: [] };
    this.messageBus = props.messageBus;
    
    // 🔒 Candado para el auto-salto
    this.hasAutoJumped = false; 
    
    this.messageBus.listen([MSG_INIT_ROUNDS], (msg) => {
      const validRounds = msg.rounds.filter(r => r.roundno > 0);
      if (validRounds.length === 0) return;

      let startIndex = 0;
      
      // 🧠 EL CEREBRO DETECTOR DE PATRONES
      const idx2 = validRounds.findIndex(r => r.roundno === 2);

      if (idx2 > 1) {
        // PATRÓN GAMERSCLUB
        startIndex = idx2;
      } else if (idx2 === 1) {
        // PATRÓN HLTV OFICIAL
        startIndex = 0;
      } else if (idx2 === -1 && validRounds.length > 1) {
        // Mientras carga, mostramos la última encontrada
        startIndex = validRounds.length - 1;
      }

      // ✂️ Cortamos toda la basura previa 
      const rondasLimpias = validRounds.slice(startIndex);
      
      let roundsElements = [];
      const validIds = [];
      
      rondasLimpias.forEach((r, index) => {
        const winnerClass = (r.winner === 2 || r.winner === "T") ? "T" : "CT";
        const numeroVisual = index + 1; 
        
        validIds.push(r.roundno); 

        roundsElements.push(
          <Round
            key={`round_${r.roundno}_${index}`}
            winner={winnerClass} 
            roundNo={r.roundno}
            visualNo={numeroVisual} 
            messageBus={this.messageBus}
          />
        );

        if (numeroVisual === 12) {
          roundsElements.push(<div key={`divider_${index}`} className="round-divider"></div>);
        }
      });
      
      // 🚀 ACTUALIZAMOS ESTADO
      this.setState({ 
        rounds: roundsElements,
        maxRounds: rondasLimpias.length, 
        validIds: validIds
      }, () => {
        // 🛡️ REGLA DEL CANDADO INTELIGENTE:
        // Solo saltamos si NO lo hemos hecho antes Y si ya estamos 100% seguros 
        // de que encontramos el inicio real (es decir, el motor ya leyó la ronda 2: idx2 !== -1)
        if (!this.hasAutoJumped && idx2 !== -1 && validIds.length > 0) {
          this.hasAutoJumped = true; // Cerramos el candado para el resto de la partida
          this.messageBus.emit({ 
            msgtype: MSG_PLAY, 
            round: validIds[0] // Al estar seguros, validIds[0] es matemáticamente la Pistol
          });
        }
      });
    });

    this.messageBus.listen([MSG_PLAY_ROUND_UPDATE], (msg) => {
        this.setState({ currentRound: msg.round });
    });

    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  handleKeyDown(e) {
    if (e.code === "Space") {
        e.preventDefault(); 
        this.messageBus.emit({ msgtype: MSG_PLAY_TOGGLE });
    }

    if (e.key === "k" || e.key === "K") {
        const { currentRound, validIds } = this.state;
        const currentIndex = validIds.indexOf(currentRound);
        
        if (currentIndex !== -1 && currentIndex < validIds.length - 1) {
            this.messageBus.emit({ 
                msgtype: MSG_PLAY, 
                round: validIds[currentIndex + 1] 
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

  playRound(roundNo) {
    this.setState({ active: true });
    this.messageBus.emit({ msgtype: MSG_PLAY, round: roundNo });
  }

  render() {
    const { winner, roundNo, visualNo } = this.props;
    const { active } = this.state;

    return (
      <button
        className={`round-btn ${winner} ${active ? "active" : ""}`}
        onClick={() => this.playRound(roundNo)}
      >
        {visualNo}
      </button>
    );
  }
}

export default RoundNav;