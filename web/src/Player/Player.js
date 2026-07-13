import {
  MSG_INIT_ROUNDS,
  MSG_PLAY,
  MSG_PLAY_CHANGE,
  MSG_TEAMSTATE_UPDATE,
  MSG_PLAY_ROUND_INCREMENT,
  MSG_PLAY_ROUND_PROGRESS,
  MSG_PLAY_ROUND_UPDATE,
  MSG_PLAY_SPEED,
  MSG_PLAY_TOGGLE,
  MSG_PROGRESS_MOVE,
} from "./constants";

const defaultInterval = 16;

class Player {
  constructor(playerBus, loaderBus) {
    this.rounds = [];
    this.loading = true;
    this.playing = false;
    this.currentTickI = 0;
    this.playingRoundI = 0;
    this.player = {};
    this.interval = defaultInterval;
    this.messageBus = playerBus;

    loaderBus.listen(
      [4, 5, 6],
      function (msg) {
        switch (msg.msgtype) {
          case 4:
            this.messageBus.emit(msg);
            break;
          case 5:
            this.loadingDone();
            break;
          case 6:
            this.handleAddRound(msg.round);
            break;
          default:
            break;
        }
      }.bind(this)
    );

    this.messageBus.listen(
      [
        MSG_PLAY,
        MSG_PLAY_TOGGLE,
        MSG_PLAY_ROUND_INCREMENT,
        MSG_PLAY_SPEED,
        MSG_PROGRESS_MOVE,
      ],
      function (msg) {
        switch (msg.msgtype) {
          case MSG_PLAY:
            if (msg.round) {
              this.playRound(msg.round);
            } else {
              this.play();
            }
            break;
          case MSG_PLAY_TOGGLE:
            if (this.playing) {
              this.stop();
            } else {
              this.play();
            }
            break;
          case MSG_PLAY_ROUND_INCREMENT:
            this.playRound(this.playingRoundI + msg.increment + 1);
            break;
          case MSG_PLAY_SPEED:
            this.stop();
            this.interval = defaultInterval / msg.speed;
            this.play();
            break;
          case MSG_PROGRESS_MOVE:
            let roundMove = this.rounds[this.playingRoundI];
            // 🚨 PROTECCIÓN: Si movemos la barra y no hay ronda, no hacer nada
            if (!roundMove || !roundMove.ticksList) return;

            this.currentTickI = Math.round(
              (roundMove.ticksList.length - 1) * msg.progress
            );
            
            if (roundMove.ticksList[this.currentTickI]) {
              this.playTick(roundMove.ticksList[this.currentTickI]);
            }
            break;
        }
      }.bind(this)
    );
  }

  handleAddRound(roundMsg) {
    if (!roundMsg || !roundMsg.ticksList) return;

    let roundTicks = [];
    let tickMessages = [];
    let currentTick = roundMsg.ticksList[0].tick;
    
    roundMsg.ticksList.forEach(function (tick) {
      if (tick.tick !== currentTick) {
        roundTicks.push(tickMessages);
        tickMessages = [];
        currentTick = tick.tick;
      }
      tickMessages.push(tick);
    });

    roundMsg.ticksList = roundTicks;
    this.rounds.push(roundMsg);
    
    this.messageBus.emit({
      msgtype: MSG_INIT_ROUNDS,
      rounds: this.rounds,
    });

    if (this.rounds.length === 1) {
      this.playRound(1);
    }
  }

  loadingDone() {
    this.loading = false;
  }

  switchPlaying(playing) {
    this.playing = playing;
    this.messageBus.emit({
      msgtype: MSG_PLAY_CHANGE,
      playing: playing,
    });
  }

  stop() {
    this.switchPlaying(false);
    if (this.player) {
      clearInterval(this.player);
    }
  }

  play() {
    this.switchPlaying(true);
    clearInterval(this.player);

    this.player = setInterval(
      function () {
        if (!this.playing) {
          clearInterval(this.player);
          return;
        }

        // 🚨 SOLUCIÓN MAGISTRAL: Buscamos la ronda actual en cada frame
        let currentRound = this.rounds[this.playingRoundI];

        // Si la ronda todavía no existe, esperamos en silencio (NO CRASHEAMOS)
        if (!currentRound || !currentRound.ticksList) {
          return; 
        }

        if (this.currentTickI >= currentRound.ticksList.length) {
          if (this.playingRoundI + 1 >= this.rounds.length) {
            this.stop();
          } else {
            this.playRound(this.playingRoundI + 2);
          }
          return;
        }
        
        const currentTickData = currentRound.ticksList[this.currentTickI];
        if (currentTickData) {
            this.playTick(currentTickData);
            this.messageBus.emit({
              msgtype: MSG_PLAY_ROUND_PROGRESS,
              progress: this.currentTickI / currentRound.ticksList.length,
            });
        }

        this.currentTickI++;
      }.bind(this),
      this.interval
    );
  }

  highlightActiveRound(round) {
    this.messageBus.emit({
      msgtype: MSG_PLAY_ROUND_UPDATE,
      round: round,
    });
  }

  playTick(tickMessages) {
    if (Array.isArray(tickMessages)) {
        tickMessages.forEach((msg) => this.messageBus.emit(msg));
    }
  }

  playRound(round) {
    if (this.rounds.length === 0) return;

    let roundI = round - 1;
    if (roundI < 0) {
      roundI = 0;
    } else if (roundI >= this.rounds.length) {
      roundI = this.rounds.length - 1;
    }
    round = roundI + 1;

    this.stop();
    this.playingRoundI = roundI;
    this.currentTickI = 0;
    this.play();
    this.highlightActiveRound(round);
    this.emitPlayRoundEvent();
  }

  emitPlayRoundEvent() {
    const currentRound = this.rounds[this.playingRoundI];
    if (currentRound && currentRound.teamstate) {
        this.messageBus.emit({
          msgtype: MSG_TEAMSTATE_UPDATE,
          teamstate: currentRound.teamstate,
        });
    }
  }
}

export default Player;