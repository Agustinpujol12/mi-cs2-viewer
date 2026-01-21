import { Component, createRef } from "react";
import { MSG_PLAY_ROUND_PROGRESS, MSG_PROGRESS_MOVE } from "../constants";
import "./Timer.css";

class Timer extends Component {
  constructor(props) {
    super(props);
    this.state = { time: "0:00", progress: 0 };
    this.messageBus = props.messageBus;
    this.trackRef = createRef();
    
    // Variables para el loop de renderizado
    this.isTicking = false; 
    this.latestProgress = 0;

    // Listeners
    this.messageBus.listen([8], msg => { this.setState({ time: msg.roundtime.roundtime }) });
    this.messageBus.listen([MSG_PLAY_ROUND_PROGRESS], msg => { 
      if (!this.isDragging) this.setState({ progress: msg.progress });
    });

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  onMouseDown(e) {
    this.isDragging = true;
    this.updateProgress(e.clientX, true); // Forzar primer frame
    
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
    // Emitimos una última vez para asegurar precisión al soltar
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

    // 1. ACTUALIZACIÓN VISUAL (Barra): Instantánea
    this.setState({ progress });

    // 2. ACTUALIZACIÓN LÓGICA (Jugadores): Sincronizada con GPU
    this.latestProgress = progress;

    if (forceImmediate) {
        this.emitProgress();
    } else if (!this.isTicking) {
        // Si no hay un frame pendiente, pedimos uno
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
    return (
      <div className="timer-wrapper">
        <div className="timer-display">{this.state.time}</div>
        <div 
          className="progress-track"
          ref={this.trackRef}
          onMouseDown={(e) => this.onMouseDown(e)}
        >
          <div 
            className="progress-fill" 
            style={{ width: `${this.state.progress * 100}%` }}
          >
            <div className="progress-handle"></div>
          </div>
        </div>
      </div>
    );
  }
}

export default Timer;