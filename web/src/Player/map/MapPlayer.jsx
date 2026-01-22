import "./MapPlayer.css"
import {Component} from "react";

class MapPlayer extends Component {

  render() {
    const posStyle = {
      left: `${this.props.player.x}%`,
      top: `${this.props.player.y}%`,
    }

    // La rotación aplica al contenedor de la punta
    const rotStyle = {
      transform: `rotate(${this.props.player.rotation}deg)`,
    }

    const playerClass = `player
      ${this.props.player.team}
      ${this.props.player.flashed ? "flashed" : ""}
      ${!this.props.player.alive ? "dead" : ""}`
    
    let playerArrow
    if (this.props.player.alive) {
      playerArrow = (
        <div className="playerArrow" style={rotStyle}>
          {/* ⚠️ NUEVO: Solo una punta triangular sólida */}
          <div className="solidArrowTip"></div>
        </div>
      )
    }

    return (
        <div className={playerClass} style={posStyle}>
          {/* La flecha ahora va POR ENCIMA del jugador en el Z-index */}
          <div className="playerArrowContainer">
            {playerArrow}
          </div>
          
          <div className="playerNameTag">{this.props.player.name}</div>
          <div className={`playerMapWeapon ${this.props.player.weapon}`}></div>
        </div>
    );
  }
}

export default MapPlayer