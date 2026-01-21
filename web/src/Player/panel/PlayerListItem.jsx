import { Component } from "react";
import "./PlayerListItem.css";

class PlayerListItem extends Component {
  render() {
    const { player } = this.props;

    if (!player) return null;

    // Estado del escudo de armadura
    let armorState = "no-armor";
    if (player.armor > 0 && !player.helmet) armorState = "half-armor";
    if (player.armor > 0 && player.helmet) armorState = "full-armor";

    const nades = player.grenadesList || []

    return (
      <div className={`playerListItemContainer ${player.team}`}>
        <div className={`playerListItem ${player.alive ? "" : "dead"}`}>
          
          {/* FILA 1: Nombre y Dinero */}
          <div className="layout-row top-row">
            <div className="playerName">{player.name}</div>
            <div className="playerMoney">${player.money}</div>
          </div>

          {/* FILA 2: Barra de Vida */}
          <div className="hp-bar-container">
            <div
              className="hp-bar-fill"
              style={{ width: `${player.hp}%` }}
            ></div>
          </div>

          {/* FILA 3: Loadout */}
          <div className="layout-row bottom-row">

            {/* GRUPO PRINCIPAL: Armadura + Arma */}
            <div className="loadout-group main-group">

              <div className="armor-slot">
                <div className={`armor-shield ${armorState}`}></div>
              </div>

              <div className="weapon-slot">
                {player.primary ? (
                  <div
                    className={`icon weapon-icon ${player.primary} ${
                      player.weapon === player.primary ? "active" : ""
                    }`}
                  ></div>
                ) : (
                  player.secondary && (
                    <div
                      className={`icon weapon-icon ${player.secondary} ${
                        player.weapon === player.secondary ? "active" : ""
                      }`}
                    ></div>
                  )
                )}
              </div>

            </div>

            {/* GRUPO UTILIDAD: Granadas y Objetivos */}
            <div className="loadout-group utility-group">
              {nades.map((nade, i) => (
                <div
                  key={i}
                  className={`icon nade-icon ${nade} ${
                    player.weapon === nade ? "active" : ""
                  }`}
                ></div>
              ))}

              {(player.defuse || player.bomb) && (
                <div
                  className={`icon objective-icon ${
                    player.defuse ? "defuse" : "c4"
                  }`}
                ></div>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  }
}

export default PlayerListItem;
