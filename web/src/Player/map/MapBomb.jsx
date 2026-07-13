import "./MapBomb.css"
import {Component} from "react";

const bombStateClasses = {
  0: "",
  1: "defusing",
  2: "defused",
  3: "explode",
  4: "planting",
  5: "planted",
};

class MapBomb extends Component {
  render() {
    console.log("MapBomb team prop:", this.props.team);
    const style = {
      left: `${this.props.bomb.x}%`,
      top: `${this.props.bomb.y}%`,
    }

    return (
      <div
        className={`mapBomb ${bombStateClasses[this.props.bomb.state]} ${this.props.team || ""}`}
        style={style}
      >
        &nbsp;
      </div>
    );
  }
}

export default MapBomb