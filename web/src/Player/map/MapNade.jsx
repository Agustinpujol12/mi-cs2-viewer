import "./MapNade.css"
import {Component} from "react";

// Memoria para temporizadores (humos y fuegos)
if (!window.timerMemory) window.timerMemory = {};
if (!window.nadeTeamMemory) window.nadeTeamMemory = {};

class MapNade extends Component {
  constructor(props) {
    super(props);
    this.state = { history: [] };
  }

  componentDidMount() {
    const k = this.props.nade.kind;
    const isPersistent = k === "smoke" || k === "fire" || k === "molotov" || k === "incendiary";
    
    // Si no es persistente (como una flash), se borra en 300ms
    if (this.props.hide && !isPersistent) {
      setTimeout(() => {
        if (this.props.removeCallback) this.props.removeCallback(this.props.index);
      }, 300);
    }
  }

  componentDidUpdate(prevProps) {
    const prevPos = prevProps.nade;
    const currPos = this.props.nade;
    const currentTick = this.props.currentTick || 0;

    if (prevPos.x !== currPos.x || prevPos.y !== currPos.y) {
      if (currPos.action !== "explode") {
        this.setState(prevState => ({
          history: [...prevState.history, { x: currPos.x, y: currPos.y }]
        }));
      }
    }
    
    const isPersistent = currPos.kind === "smoke" || currPos.kind === "fire" || currPos.kind === "molotov" || currPos.kind === "incendiary";
    const maxTime = currPos.kind === "smoke" ? 22 : 7; // Humo 22s, Fuego 7s

    if (isPersistent && currPos.action === "explode") {
        const startTick = window.timerMemory[currPos.id];
        if (startTick !== undefined) {
            const elapsedTicks = currentTick - startTick;
            const timeLeft = maxTime - (elapsedTicks / 64);
            
            // Borrar de la memoria principal cuando llega a 0
            if (timeLeft <= 0 && this.props.hide && this.props.removeCallback) {
                this.props.removeCallback(this.props.index);
            }
        }
    }
  }

  render() {
    const { kind, action, x, y, id } = this.props.nade;
    let team = this.props.nade.team;
    const currentTick = this.props.currentTick || 0;

    if (team && action !== "explode") {
        window.nadeTeamMemory[id] = team;
    } else if (action === "explode" && window.nadeTeamMemory[id]) {
        team = window.nadeTeamMemory[id];
    }

    const isSmoke = kind === "smoke";
    const isFire = kind === "fire" || kind === "molotov" || kind === "incendiary";
    const isPersistent = isSmoke || isFire;
    const maxTime = isSmoke ? 22 : 7; 

    // Colores base para la aureola
    let strokeColor = "rgba(150, 150, 150, 0.5)"; 
    if (team) {
        const t = team.toString().toLowerCase();
        if (t === "t" || t === "2" || t.includes("terr")) strokeColor = "#ffca28"; 
        else if (t === "ct" || t === "3" || t.includes("counter")) strokeColor = "#29b6f6"; 
    }
    
    // 🚨 Forzamos el color naranja sólido de tu imagen si es fuego
    if (isFire) strokeColor = "rgba(230, 130, 20, 0.8)";

    let timeLeft = maxTime;

    if (isPersistent && action === "explode") {
      if (window.timerMemory[id] === undefined) window.timerMemory[id] = currentTick;
      const elapsedTicks = currentTick - window.timerMemory[id];
      
      if (elapsedTicks < -1000) {
          window.timerMemory[id] = currentTick;
          timeLeft = maxTime;
      } else {
          timeLeft = maxTime - (elapsedTicks / 64);
      }
    }

    if (isPersistent && action === "explode" && timeLeft <= 0) return null;

    const className = `mapNade ${team} ${kind} ${action}`;
    const style = { left: `${x}%`, top: `${y}%` };
    const points = this.state.history.map(pos => `${(pos.x - x) * 50 + 50},${(pos.y - y) * 50 + 50}`).join(" ");

    let dashOffset = 0;
    if (action === "explode" && isPersistent) {
        dashOffset = 308 - (308 * (Math.max(0, Math.min(maxTime, timeLeft)) / maxTime));
    }

    return (
        <div className={className} style={style}>
          {action === "explode" && isPersistent && timeLeft > 0 && (
            <div className="smoke-timer-container">
              <svg className="smoke-ring-svg" viewBox="0 0 100 100">
                <circle 
                  className="smoke-ring-progress" 
                  cx="50" cy="50" r="48" 
                  style={{ strokeDashoffset: dashOffset, stroke: strokeColor }} 
                />
              </svg>
              <span className="smoke-time">{Math.ceil(timeLeft)}</span>
            </div>
          )}

          {this.state.history.length > 1 && action !== "explode" && (
            <svg className="nade-trail-svg" viewBox="0 0 100 100">
              <polyline points={points} vectorEffect="non-scaling-stroke" className="nade-trail-line" />
            </svg>
          )}
        </div>
    );
  }
}

export default MapNade;