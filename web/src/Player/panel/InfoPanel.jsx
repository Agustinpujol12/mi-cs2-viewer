import { Component } from "react";
import Scoreboard from "./Scoreboard";
import RoundNav from "./RoundNav";
import Controls from "./Controls";
import Timer from "./Timer";
import PlayerList from "./PlayerList";
import "./InfoPanel.css";

class InfoPanel extends Component {
  constructor(props) {
    super(props);
    this.messageBus = props.messageBus;
  }

  render() {
    return (
      <div className="hud-overlay">
        
        {/* COLUMNAS LATERALES (Ya las tienes bien) */}
        <div className="hud-column left">
           <Scoreboard messageBus={this.messageBus} team="T" />
           <PlayerList messageBus={this.messageBus} team="T" />
        </div>

        <div className="hud-column right">
           <Scoreboard messageBus={this.messageBus} team="CT" />
           <PlayerList messageBus={this.messageBus} team="CT" />
        </div>

        {/* === NUEVA BARRA INFERIOR === */}
        <div className="hud-bottom-section">
           
           {/* 1. RONDAS (Arriba) */}
           <div className="rounds-container">
              <RoundNav messageBus={this.messageBus} />
           </div>

           {/* 2. BARRA DE REPRODUCCIÓN + CONTROLES (Abajo) */}
           <div className="playback-bar">
              <div className="controls-area">
                 <Controls messageBus={this.messageBus} />
              </div>
              <div className="timer-area">
                 <Timer messageBus={this.messageBus} />
              </div>
           </div>

        </div>

      </div>
    );
  }
}

export default InfoPanel;