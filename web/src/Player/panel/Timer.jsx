import { Component, createRef } from "react";
import { MSG_PLAY_ROUND_PROGRESS, MSG_PROGRESS_MOVE } from "../constants";
import "./Timer.css";

class Timer extends Component {
  constructor(props) {
    super(props);
    // Arrancamos con el tiempo oficial de CS2 por defecto
    this.state = { time: "1:55", progress: 0, isBombPlanted: false };
    this.messageBus = props.messageBus;
    this.trackRef = createRef();
    
    // Variables de control de renderizado
    this.isTicking = false; 
    this.latestProgress = 0;

    // 🚨 Variables matemáticas para calcular el tiempo real
    this.currentElapsedSeconds = 0;
    this.bombPlantedElapsed = null;

    // 1. ESCUCHAR A LA BOMBA (Mensaje 1)
    this.messageBus.listen([1], msg => {
      if (msg.tickstate && msg.tickstate.bomb) {
        const bomb = msg.tickstate.bomb;
        
        // state: 5 significa "Bomba Plantada"
        if (bomb.state === 5) {
          if (this.bombPlantedElapsed === null) {
            // Guardamos el segundo exacto en el que el jugador la plantó
            this.bombPlantedElapsed = this.currentElapsedSeconds;
            this.setState({ isBombPlanted: true });
          }
        } else {
          // Si la ronda se reinicia, explota o la defusan (state cambia), reseteamos
          if (this.bombPlantedElapsed !== null) {
            this.bombPlantedElapsed = null;
            this.setState({ isBombPlanted: false });
          }
        }
      }
    });

    // 2. ESCUCHAR EL RELOJ Y CONVERTIRLO A REGRESIVO (Mensaje 8)
    this.messageBus.listen([8], msg => { 
      if (msg.roundtime && msg.roundtime.roundtime) {
        const timeStr = msg.roundtime.roundtime;
        const parts = timeStr.split(":");
        
        if (parts.length === 2) {
          // Convertimos el string progresivo (ej: "0:30") a segundos totales (30)
          const elapsedSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
          
          // Si el usuario arrastró la barra hacia atrás (el tiempo actual es menor al anterior), reseteamos la bomba por seguridad
          if (elapsedSeconds < this.currentElapsedSeconds && this.bombPlantedElapsed !== null) {
            this.bombPlantedElapsed = null;
            this.setState({ isBombPlanted: false });
          }

          this.currentElapsedSeconds = elapsedSeconds;
          let displayTime = "";

          if (this.state.isBombPlanted && this.bombPlantedElapsed !== null) {
            // 💣 MODO BOMBA: Cuenta regresiva desde 0:40
            const secondsSincePlant = elapsedSeconds - this.bombPlantedElapsed;
            let remainingBomb = 40 - secondsSincePlant;
            if (remainingBomb < 0) remainingBomb = 0;

            const mins = Math.floor(remainingBomb / 60);
            const secs = remainingBomb % 60;
            displayTime = `${mins}:${secs.toString().padStart(2, '0')}`;
          } else {
            // ⏱️ MODO RONDA: Cuenta regresiva desde 1:55 (115 segundos)
            let remaining = 115 - elapsedSeconds;
            if (remaining < 0) remaining = 0;

            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            displayTime = `${mins}:${secs.toString().padStart(2, '0')}`;
          }

          this.setState({ time: displayTime });
        } else {
          this.setState({ time: timeStr });
        }
      }
    });

    // Control visual de la barra
    this.messageBus.listen([MSG_PLAY_ROUND_PROGRESS], msg => { 
      if (!this.isDragging) this.setState({ progress: msg.progress });
    });

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  onMouseDown(e) {
    this.isDragging = true;
    this.updateProgress(e.clientX, true); 
    
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    document.body.style.userSelect = 'none';
  }

  onMouseMove(e) {
    if (!this.isDragging) return;
    this.updateProgress(e.clientX, false);
  }

  onMouseUp(e) {
    this.isDragging = false;
    if (e) this.updateProgress(e.clientX, true);

    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    document.body.style.userSelect = 'auto';
  }

  updateProgress(clientX, forceImmediate = false) {
    const track = this.trackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const rawProgress = (clientX - rect.left) / rect.width;
    const progress = Math.max(0, Math.min(1, rawProgress));

    this.setState({ progress });
    this.latestProgress = progress;

    if (forceImmediate) {
        this.emitProgress();
    } else if (!this.isTicking) {
        this.isTicking = true;
        requestAnimationFrame(() => {
            this.emitProgress();
            this.isTicking = false;
        });
    }
  }

  emitProgress() {
    this.messageBus.emit({ 
        msgtype: MSG_PROGRESS_MOVE, 
        progress: this.latestProgress 
    });
  }

  render() {
    // Si la bomba está plantada, forzamos un color rojo táctico
    const colorActivo = this.state.isBombPlanted ? '#ff4d4d' : 'var(--TColor, #e6b022)';

    return (
      <div className="timer-wrapper">
        <div 
          className="timer-display" 
          style={{ 
            color: this.state.isBombPlanted ? '#ff4d4d' : 'white',
            fontWeight: this.state.isBombPlanted ? 'bold' : 'normal'
          }}
        >
          {this.state.time}
        </div>
        <div 
          className="progress-track"
          ref={this.trackRef}
          onMouseDown={(e) => this.onMouseDown(e)}
        >
          <div 
            className="progress-fill" 
            style={{ 
              width: `${this.state.progress * 100}%`,
              backgroundColor: colorActivo
            }}
          >
            <div className="progress-handle"></div>
          </div>
        </div>
      </div>
    );
  }
}

export default Timer;