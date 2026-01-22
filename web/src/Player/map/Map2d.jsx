import { Component } from "react";
import { MSG_PLAY_CHANGE } from "../constants";
import KillFeed from "./KillFeed";
import "./Map.css";
import MapBomb from "./MapBomb";
import MapNade from "./MapNade";
import MapPlayer from "./MapPlayer";
import MapShot from "./MapShot";

// Import map overviews
import deAncient from "../../assets/overviews/de_ancient.png";
import deAncientNight from "../../assets/overviews/de_ancient_night.png";
import deAnubis from "../../assets/overviews/de_anubis.png";
import deDust2 from "../../assets/overviews/de_dust2.png";
import deInferno from "../../assets/overviews/de_inferno.png";
import deMirage from "../../assets/overviews/de_mirage.png";
import deNuke from "../../assets/overviews/de_nuke.png";
import deNukeLower from "../../assets/overviews/de_nuke_lower.png";
import deOverpass from "../../assets/overviews/de_overpass.png";
import deTrain from "../../assets/overviews/de_train.png";
import deTrainLower from "../../assets/overviews/de_train_lower.png";
import deVertigo from "../../assets/overviews/de_vertigo.png";
import deVertigoLower from "../../assets/overviews/de_vertigo_lower.png";
import emptyMap from "../../assets/overviews/empty.png";

const mapOverviews = {
  "de_ancient": deAncient,
  "de_ancient_night": deAncientNight,
  "de_anubis": deAnubis,
  "de_dust2": deDust2,
  "de_inferno": deInferno,
  "de_mirage": deMirage,
  "de_nuke": deNuke,
  "de_nuke_lower": deNukeLower,
  "de_overpass": deOverpass,
  "de_train": deTrain,
  "de_train_lower": deTrainLower,
  "de_vertigo": deVertigo,
  "de_vertigo_lower": deVertigoLower,
  "empty": emptyMap,
};

class Map2d extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mapName: "empty",
      layer: "",
      hasLower: false,
      players: [],
      shots: [],
      nades: [],
      nadeExplosions: [],
      bomb: { x: -100, y: -100 },
      zoom: 1,
      panX: 0,
      panY: 0,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
    };

    props.messageBus.listen([4], this.onMessage.bind(this));
    props.messageBus.listen([1], this.tickUpdate.bind(this));
    props.messageBus.listen([9], this.handleShot.bind(this));
    props.messageBus.listen(
      [MSG_PLAY_CHANGE],
      function () {
        this.setState({
          shots: [],
          nadeExplosions: [],
        });
      }.bind(this)
    );
    props.messageBus.listen([14], this.handleNadeExplosion.bind(this));

    document.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  componentDidMount() {
    if (this.props.hide) {
      setTimeout(function () {
        this.props.removeCallback(this.props.index)
      }.bind(this), 300)
    }
  }

  tickUpdate(message) {
    if (message.tickstate.playersList) {
      this.setState({
        players: message.tickstate.playersList,
        nades: message.tickstate.nadesList,
        bomb: message.tickstate.bomb,
      });
    }
  }

  handleShot(msg) {
    this.setState({
      shots: [...this.state.shots, msg.shot],
    });
  }

  getTeam(playerId) {
    if (!this.state.players || !playerId) return "";
    const p = this.state.players.find(player => player.playerid === playerId);
    return p ? p.team : "";
  }

  handleNadeExplosion(msg) {
    const grenadeEvent = msg.grenadeevent;
    const throwerId = grenadeEvent.thrower || grenadeEvent.owner;
    const team = this.getTeam(throwerId);
    const enrichedEvent = { ...grenadeEvent, team: team };

    this.setState({
      nadeExplosions: [...this.state.nadeExplosions, enrichedEvent],
    });
  }

  onMessage(message) {
    switch (message.msgtype) {
      case 4:
        this.setMapName(message.init.mapname);
        break;
      default:
        console.log("unknown message [Map2d.js]", message);
    }
  }

  setMapName(name) {
    const hasLower = name === "de_nuke" || name === "de_train" || name === "de_vertigo";
    this.setState({
      mapName: name,
      layer: "",
      hasLower: hasLower,
    });
  }

  removeNade(index) {
    const newState = [...this.state.nadeExplosions];
    newState[index] = null;
    this.setState({ nadeExplosions: newState });
  }

  removeShot(index) {
    const newState = [...this.state.shots];
    newState[index] = null;
    this.setState({ shots: newState });
  }

  toggleLayer() {
    if (this.state.hasLower) {
      this.setState({
        layer: this.state.layer === "_lower" ? "" : "_lower",
      });
    }
  }

  handleKeyDown(event) {
    if (event.key === "q" || event.key === "Q") {
      this.toggleLayer();
    } else if (event.key === "w" || event.key === "W") {
      this.resetZoom();
    }
  }

  handleMouseDown = (e) => {
    // 🖱️ BOTÓN CENTRAL (RUEDA) CLICK -> ZOOM MAX/RESET
    if (e.button === 1) { 
      e.preventDefault();
      if (this.state.zoom > 1) {
        this.resetZoom();
      } else {
        this.setState({ zoom: 2.5, panX: 0, panY: 0 }); 
      }
      return; 
    }
    // CLICK IZQUIERDO -> ARRASTRAR
    if (e.button === 0) {
      this.setState({
        isDragging: true,
        lastMouseX: e.clientX,
        lastMouseY: e.clientY,
      });
    }
  };

  handleMouseMove = (e) => {
    if (this.state.isDragging) {
      const deltaX = e.clientX - this.state.lastMouseX;
      const deltaY = e.clientY - this.state.lastMouseY;
      this.setState({
        panX: this.state.panX + deltaX,
        panY: this.state.panY + deltaY,
        lastMouseX: e.clientX,
        lastMouseY: e.clientY,
      });
    }
  };

  handleMouseUp = () => {
    this.setState({ isDragging: false });
  };

  // 🔍 LOGICA DE ZOOM HACIA EL MOUSE
  handleWheel = (e) => {
    e.preventDefault();

    const { zoom, panX, panY } = this.state;
    // Usamos el wrapper como referencia
    const rect = e.currentTarget.getBoundingClientRect();

    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    const delta = -Math.sign(e.deltaY);
    const zoomStep = 0.15;
    const zoomFactor = 1 + (delta * zoomStep);
    
    // Zoom limitado entre 1x y 6x
    let newZoom = zoom * zoomFactor;
    newZoom = Math.min(Math.max(newZoom, 1), 6);

    const effectiveRatio = newZoom / zoom;
    
    const newPanX = panX * effectiveRatio + mouseX * (1 - effectiveRatio);
    const newPanY = panY * effectiveRatio + mouseY * (1 - effectiveRatio);

    this.setState({
      zoom: newZoom,
      panX: newPanX,
      panY: newPanY
    });
  };

  resetZoom() {
    this.setState({ zoom: 1, panX: 0, panY: 0 });
  }

  render() {
    const mapKey = `${this.state.mapName}${this.state.layer}`;
    const mapImage = mapOverviews[mapKey] || emptyMap;
    
    const style = {
      backgroundImage: `url(${mapImage})`,
      transform: `translate(${this.state.panX}px, ${this.state.panY}px) scale(${this.state.zoom})`,
      transformOrigin: "center",
      filter: "brightness(0.75) contrast(1.15) saturate(1.1)",
      cursor: this.state.isDragging ? "grabbing" : "grab",
      pointerEvents: "auto"
    };

    const playerComponents = this.state.players?.map((p) => (
      <MapPlayer key={p.playerid} player={p} />
    )) || [];

    const shots = this.state.shots.map((s, i) => {
      if (s === null) return null;
      return <MapShot key={i} shot={s} removeCallback={this.removeShot.bind(this)} index={i} />;
    });

    const nadeComponents = this.state.nades?.map((n) => {
        const ownerTeam = this.getTeam(n.thrower || n.owner);
        const nadeWithTeam = { ...n, team: ownerTeam };
        return <MapNade key={n.id} nade={nadeWithTeam} />;
    }) || [];

    const nadeExplosions = this.state.nadeExplosions.map((n, i) => {
      if (n != null && n.id) {
        return <MapNade key={n.id} nade={n} hide={true} removeCallback={this.removeNade.bind(this)} index={i} />;
      }
      return null;
    });

    return (
      <div 
        className="map-wrapper"
        // 🔥 EVENTOS EN EL PADRE (Wrapper)
        onMouseDown={this.handleMouseDown}
        onMouseMove={this.handleMouseMove}
        onMouseUp={this.handleMouseUp}
        onMouseLeave={this.handleMouseUp}
        onWheel={this.handleWheel}
        // Nos aseguramos que el wrapper sea clickeable
        style={{ pointerEvents: 'all' }}
      >
        <div className="map-container" id="map" style={style}>
          {playerComponents}
          {nadeComponents}
          {shots}
          {nadeExplosions}
          <MapBomb bomb={this.state.bomb} />
        </div>

        <KillFeed messageBus={this.props.messageBus} />
        
        {/* BOTONES INTERFAZ */}
        {this.state.hasLower && (
          <button className={`map-button layer-toggle ${this.state.layer === "_lower" ? "lower-active" : ""}`} onClick={this.toggleLayer.bind(this)}>
            <div className="layer-icon">⇅</div>
            <div className="layer-hint">Q</div>
          </button>
        )}
        
        {this.state.zoom > 1 && (
          <button className="map-button zoom-reset" onClick={this.resetZoom.bind(this)}>
            <div className="zoom-icon">⌕</div>
            <div className="zoom-hint">W</div>
          </button>
        )}
      </div>
    );
  }
}

export default Map2d;