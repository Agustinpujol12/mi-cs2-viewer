import {Component} from "react";
import {MSG_TEAMSTATE_UPDATE} from "../constants";
import "./Scoreboard.css";

class Scoreboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      TName: "Terrorists",
      TScore: 0,
      CTName: "Counter-Terrorists",
      CTScore: 0,
    }
    
    // Escuchar actualizaciones (Nombres de equipos y Scores)
    props.messageBus.listen([4, 5], (msg) => {
      this.setState({
        TName: msg.init.tname,
        CTName: msg.init.ctname,
      })
    })

    props.messageBus.listen([MSG_TEAMSTATE_UPDATE], (msg) => {
      this.setState({
        TName: msg.teamstate.tname,
        TScore: msg.teamstate.tscore,
        CTName: msg.teamstate.ctname,
        CTScore: msg.teamstate.ctscore,
      })
    })
  }

  render() {
    // MODO IZQUIERDA (Terroristas)
    if (this.props.team === "T") {
      return (
        <div className="team-header-container left">
           <div className="team-info-box">
              <span className="team-name t-text">{this.state.TName}</span>
           </div>
           <div className="team-score-box">{this.state.TScore}</div>
        </div>
      );
    }

    // MODO DERECHA (Counter-Terrorists)
    if (this.props.team === "CT") {
      return (
        <div className="team-header-container right">
           <div className="team-score-box">{this.state.CTScore}</div>
           <div className="team-info-box">
              <span className="team-name ct-text">{this.state.CTName}</span>
           </div>
        </div>
      );
    }

    return null;
  }
}

export default Scoreboard;