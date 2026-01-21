import { Component } from "react";
import { MSG_INIT_ROUNDS, MSG_PLAY, MSG_PLAY_ROUND_UPDATE } from "../constants";
import "./RoundNav.css";

class RoundNav extends Component {
  constructor(props) {
    super(props);
    this.state = { rounds: [] };
    this.messageBus = props.messageBus;
    
    this.messageBus.listen([MSG_INIT_ROUNDS], (msg) => {
      let roundsElements = [];
      
      msg.rounds.forEach((r, index) => {
        const winnerClass = (r.winner === 2 || r.winner === "T") ? "T" : "CT";
        
        roundsElements.push(
          <Round
            key={`round${r.roundno}`}
            winner={winnerClass} 
            roundNo={r.roundno}
            messageBus={this.messageBus}
          />
        );

        // ➡️ DIVISIÓN TRAS LA RONDA 12
        if (r.roundno === 12) {
          roundsElements.push(<div key="divider" className="round-divider"></div>);
        }
      });
      
      this.setState({ rounds: roundsElements });
    });
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