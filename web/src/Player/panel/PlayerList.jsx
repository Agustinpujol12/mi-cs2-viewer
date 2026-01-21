import {Component} from "react";
import PlayerListItem from "./PlayerListItem";
import "./PlayerList.css";

class PlayerList extends Component {
  constructor(props) {
    super(props);
    this.messageBus = this.props.messageBus
    this.messageBus.listen([1], this.update.bind(this))
    this.state = { players: [] }
  }

  update(msg) {
    this.setState({ players: msg.tickstate.playersList })
  }

  render() {
    const targetTeam = this.props.team; // "T" o "CT"
    const listItems = [];

    if (this.state.players && this.state.players.length > 0) {
      this.state.players.forEach(p => {
        // Solo guardamos los del equipo solicitado
        if (p.team === targetTeam) {
          listItems.push(<PlayerListItem key={p.playerid} player={p} />);
        }
      })
    }
    
    // Devolvemos la lista LIMPIA
    return (
      <div className={`team-list-cards ${targetTeam}`}>
        {listItems}
      </div>
    )
  }
}

export default PlayerList