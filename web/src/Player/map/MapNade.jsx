import "./MapNade.css"
import {Component} from "react";

class MapNade extends Component {
  constructor(props) {
    super(props);
    this.state = {
      history: []
    };
  }

  componentDidMount() {
    if (this.props.hide) {
      setTimeout(function () {
        this.props.removeCallback(this.props.index)
      }.bind(this), 300)
    }
  }

  componentDidUpdate(prevProps) {
    const prevPos = prevProps.nade;
    const currPos = this.props.nade;

    if (prevPos.x !== currPos.x || prevPos.y !== currPos.y) {
      if (this.props.nade.action !== "explode") {
        this.setState(prevState => ({
          history: [...prevState.history, { x: currPos.x, y: currPos.y }]
        }));
      }
    }
  }

  render() {
    // 🔴 CAMBIO: Agregamos ${this.props.nade.team} para saber si es CT o T
    const className = `mapNade ${this.props.nade.team} ${this.props.nade.kind} ${this.props.nade.action}`
    
    const style = {
      left: `${this.props.nade.x}%`,
      top: `${this.props.nade.y}%`,
    }

    const currentX = this.props.nade.x;
    const currentY = this.props.nade.y;

    const points = this.state.history.map(pos => {
      const dx = (pos.x - currentX) * 50; 
      const dy = (pos.y - currentY) * 50;
      return `${dx + 50},${dy + 50}`;
    }).join(" ");

    return (
        <div className={className} style={style}>
          {this.state.history.length > 1 && (
            <svg className="nade-trail-svg" viewBox="0 0 100 100">
              <polyline 
                points={points} 
                vectorEffect="non-scaling-stroke" 
                className="nade-trail-line" /* Ya no necesitamos poner el tipo aquí */
              />
            </svg>
          )}
        </div>
    );
  }
}

export default MapNade