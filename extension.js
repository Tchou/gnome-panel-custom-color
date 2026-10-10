import GLib from 'gi://GLib';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class GnomePanelCustomColorExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._settings = null;
        this._settingsSignalId = null;
        this._actorSignalIds = null;
        this._windowSignalIds = null;
        this._delayedTimeoutId = null;
        this.colorChangeDebounce = null;
        this.old_hide = null;
    }

    enable() {
        const self = this;
        this._settings = this.getSettings();
        this._actorSignalIds = new Map();
        this._windowSignalIds = new Map();
        this._settingsSignalId = this._settings.connect('changed',
            (settings, key) => this.colorChanged(settings, key));

        this._actorSignalIds.set(Main.overview, [
            Main.overview.connect('showing', () => { self._updateColor(); })
        ]);
        // The "hide" signal is fired at the begining of the animation.
        // When _hideDone is called, it sets the panel style to null (reset);
        // We hijack this function to update the color immediately after _hideDone
        this.old_hide = Main.overview._hideDone;
        Main.overview._hideDone = () => { self.old_hide.call(Main.overview); self._updateColor(); };

        this._actorSignalIds.set(Main.sessionMode, [
            Main.sessionMode.connect('updated', () => { self._updateColor(); })
        ]);

        for (const metaWindowActor of global.get_window_actors()) {
            this._onWindowActorAdded(metaWindowActor.get_parent(), metaWindowActor);
        }

        this._actorSignalIds.set(global.window_group, [
            global.window_group.connect('child-added', this._onWindowActorAdded.bind(this)),
            global.window_group.connect('child-removed', this._onWindowActorRemoved.bind(this))
        ]);

        this._actorSignalIds.set(global.window_manager, [
            global.window_manager.connect('kill-switch-workspace', () => { self._updateColor(); })
        ]);

        this._updateColor();
    }
    _getColor() {
        if (this._settings != null) {
            return this._settings.get_string('color');
        }

    }

    colorChanged(settings, key) {

        if (key === 'color') {
            if (this.colorChangeDebounce != null)
                GLib.source_remove(this.colorChangeDebounce);

            this.colorChangeDebounce = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
                this._updateColor();
            });
            return;
        }
    }

    disable() {
        if (this.colorChangeDebounce != null)
            GLib.source_remove(this.colorChangeDebounce);

        for (const actorSignalIds of [this._actorSignalIds, this._windowSignalIds]) {
            for (const [actor, signalIds] of actorSignalIds) {
                for (const signalId of signalIds) {
                    actor.disconnect(signalId);
                }
            }
        }
        this._actorSignalIds = null;
        this._windowSignalIds = null;

        if (this._delayedTimeoutId != null) {
            GLib.Source.remove(this._delayedTimeoutId);
        }
        Main.overview._hideDone = this.old_hide;
        this._delayedTimeoutId = null;
        this._setColor(false);
        this._settings.disconnect(this._settingsSignalId);
        this._settings = null;
    }

    _onWindowActorAdded(container, metaWindowActor) {
        this._windowSignalIds.set(metaWindowActor, [
            metaWindowActor.connect('notify::allocation', this._updateColor.bind(this)),
            metaWindowActor.connect('notify::visible', this._updateColor.bind(this))
        ]);
    }

    _onWindowActorRemoved(container, metaWindowActor) {
        for (const signalId of this._windowSignalIds.get(metaWindowActor)) {
            metaWindowActor.disconnect(signalId);
        }
        this._windowSignalIds.delete(metaWindowActor);
        this._updateColor();
    }

    _updateColor() {
        this._setColor(true);
    }

    _setColor(do_color) {
        if (do_color) {
            const color = this._getColor();
            Main.panel.set_style("background-color: " + color + ";");
        } else {
            Main.panel.set_style(null);
        }
    }

};
