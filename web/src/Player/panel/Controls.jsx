import "./Controls.css";
import { Component } from "react";
import { MSG_PLAY_CHANGE, MSG_PLAY_SPEED, MSG_PLAY_TOGGLE } from "../constants";

class Controls extends Component {
  constructor(props) {
    super(props);
    this.state = {
      playing: false,
      playingSpeed: 1,
    };
    this.messageBus = props.messageBus;

    // Escuchar cambios de estado del reproductor
    this.messageBus.listen([MSG_PLAY_CHANGE], function (msg) {
      this.setState({
        playing: msg.playing,
      });
    }.bind(this));
  }

  togglePlay() {
    this.messageBus.emit({
      msgtype: MSG_PLAY_TOGGLE,
    });
  }

  playSpeed(speed) {
    this.setState({
      playingSpeed: speed
    });
    this.messageBus.emit({
      msgtype: MSG_PLAY_SPEED,
      speed: speed,
    });
  }

  // Cicla las velocidades: 1x -> 2x -> 4x -> 1x
  handleSpeedCycle() {
    let nextSpeed = 1;
    if (this.state.playingSpeed === 1) nextSpeed = 2;
    else if (this.state.playingSpeed === 2) nextSpeed = 4;
    else nextSpeed = 1;
    
    this.playSpeed(nextSpeed);
  }

  render() {
    // Iconos de Material Design: 0xe034 (pause), 0xe037 (play_arrow)
    const playButtonIcon = this.state.playing ? String.fromCodePoint(0xe034) : String.fromCodePoint(0xe037);

    return (
      <div className="controls-container">
        <div className="controls-wrapper">
          
          {/* BOTÓN DE VELOCIDAD (TEXTO X2, X4) */}
          <button 
            className={`control-button speed-indicator ${this.state.playingSpeed !== 1 ? "active" : ""}`}
            onClick={() => this.handleSpeedCycle()}
          >
            x{this.state.playingSpeed}
          </button>

          {/* BOTÓN PLAY / PAUSE */}
          <button 
            className="control-button play-button material-icons"
            onClick={() => this.togglePlay()}
          >
            {playButtonIcon}
          </button>

        </div>
      </div>
    );
  }
}

export default Controls;