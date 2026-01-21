import { Component, createRef } from "react";
import { MSG_PLAY_ROUND_PROGRESS, MSG_PROGRESS_MOVE } from "../constants";
import "./Timer.css";

class Timer extends Component {
  constructor(props) {
    super(props);
    this.state = { time: "0:00", progress: 0 };
    this.messageBus = props.messageBus;
    this.trackRef = createRef(); // Referencia para cálculos precisos
    this.lastEmit = 0;

    // Listeners de mensajes (sin cambios)
    this.messageBus.listen([8], msg => { this.setState({ time: msg.roundtime.roundtime }) });
    this.messageBus.listen([MSG_PLAY_ROUND_PROGRESS], msg => { 
      if (!this.isDragging) this.setState({ progress: msg.progress });
    });

    // Bindeo de funciones para eventos globales
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  // --- LÓGICA DE ARRASTRE GLOBAL ---

  onMouseDown(e) {
    this.isDragging = true;
    this.updateProgress(e.clientX);
    
    // Agregamos eventos a la ventana global para no perder el rastro
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    
    // Evita selección de texto molesta mientras arrastras
    document.body.style.userSelect = 'none';
  }

  onMouseMove(e) {
    if (!this.isDragging) return;
    this.updateProgress(e.clientX);
  }

  onMouseUp() {
    this.isDragging = false;
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    document.body.style.userSelect = 'auto';
  }

  updateProgress(clientX) {
    const track = this.trackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    // UI Instantánea (60fps)
    this.setState({ progress });

    // Emisión optimizada (Throttling) al Player.js
    const now = Date.now();
    if (now - this.lastEmit > 16) { // Bajamos a 16ms para máxima fluidez (60Hz)
      this.messageBus.emit({ msgtype: MSG_PROGRESS_MOVE, progress });
      this.lastEmit = now;
    }
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