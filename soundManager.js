module.exports = {
    _soundEnabled: true,
    _musicEnabled: true,
    _effectEnabled: true,
    _audioEngine: cc.audioEngine,
    setSoundEnabled: function (value) {
        this._soundEnabled = value;
        this._musicEnabled = value;
        this._effectEnabled = value;
        if(value) {
            this.resumeMusic();
        } else {
            this.pauseMusic();
            this.stopAllEffects();
        }
    },

    getSoundEnabled: function () {
        return this._soundEnabled;
    },

    autoSoundEnabled () {
        this.setSoundEnabled(!this._soundEnabled);
    },

    setMusicEnabled (value) {
        this._musicEnabled = value;
    },

    getMusicEnabled (value) {
        return this._musicEnabled = value;
    },

    setEffectEnabled (value) {
        this._effectEnabled = value;
    },

    getEffectEnabled () {
        return this._musicEnabled;
    },

    playMusic (clip, loop) {
        if(this._soundEnabled && this._musicEnabled) {
            return this._audioEngine.playMusic(clip, loop);
        }
    },
    stopMusic () {
        this._audioEngine.stopMusic();
    },
    pauseMusic () {
        this._audioEngine.pauseMusic();
    },
    resumeMusic () {
        this._audioEngine.resumeMusic();
    },
    getMusicVolume () {
        return this._audioEngine.getMusicVolume();
    },
    setMusicVolume (volume) {
        this._audioEngine.setMusicVolume(volume);
    },
    isMusicPlaying () {
        return this._audioEngine.isMusicPlaying();
    },

    playEffect(clip, loop) {
        if(this._soundEnabled && this._effectEnabled) {
            return this._audioEngine.playEffect(clip, loop);
        }        
    },
    pauseEffect(audioID) {
        this._audioEngine.pauseEffect(audioID);
    },
    resumeEffect(audioID) {
        this._audioEngine.pauseEffect(audioID);
    },
    stopEffect (audioID) {
        this._audioEngine.pauseEffect(audioID);
    },

    getEffectsVolume () {
        return this._audioEngine.getEffectsVolume();
    },
    setEffectsVolume(volume) {
        this._audioEngine.setEffectsVolume(volume);
    },
    pauseAllEffects () {
        this._audioEngine.pauseAllEffects();
    },
    stopAllEffects() {
        this._audioEngine.stopAllEffects();
    },

    pauseAll () {
        this._soundEnabled = false;
        this._musicEnabled = false;
        this._effectEnabled = false;
        this._audioEngine.pauseAll();
    },

    resumeAll() {
        this._soundEnabled = true;
        this._musicEnabled = true;
        this._effectEnabled = true;
        this._audioEngine.resumeAll();
    }
};