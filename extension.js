import GLib from 'gi://GLib';
import Cogl from 'gi://Cogl';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class GnomePanelCustomColorExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._actorSignalIds = null;
        this._windowSignalIds = null;
        this._delayedTimeoutId = null;
        this.colorChangeDebounce = null;
    }

    enable() {

        this._settings = this.getSettings();
        this._currentColor = this._settings.get_string('color');

        this._actorSignalIds = new Map();
        this._windowSignalIds = new Map();
        this._settings.connect('changed', (settings, key) => this.colorChanged(settings, key));
        this._actorSignalIds.set(Main.overview, [
            Main.overview.connect('showing', this._updateColor.bind(this)),
            Main.overview.connect('hiding', this._updateColor.bind(this))
        ]);

        this._actorSignalIds.set(Main.sessionMode, [
            Main.sessionMode.connect('updated', this._updateColor.bind(this))
        ]);

        for (const metaWindowActor of global.get_window_actors()) {
            this._onWindowActorAdded(metaWindowActor.get_parent(), metaWindowActor);
        }

        this._actorSignalIds.set(global.window_group, [
            global.window_group.connect('child-added', this._onWindowActorAdded.bind(this)),
            global.window_group.connect('child-removed', this._onWindowActorRemoved.bind(this))
        ]);

        //Use a delayed version of _updateColor to let the shell catch up
        this._actorSignalIds.set(global.window_manager, [
            global.window_manager.connect('switch-workspace', this._updateColorDelayed.bind(this))
        ]);

        this._updateColor();
    }

    colorChanged(settings, key) {

        if (key === 'color') {
            GLib.source_remove(this.colorChangeDebounce);
            this.transparencyChangeDebounce = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
                this._currentColor = this._settings.get_string('color');
                this._updateColor();
            });
            return;
        }
    }

    disable() {
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
        this._delayedTimeoutId = null;
        this._setColor(null);    
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

    _updateColorDelayed() {
        this._delayedTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this._updateColor();
            this._delayedTimeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }
    _updateColor() {
        this._setColor(this._currentColor);
    }

    _setColor(color) {

        const [ok, colorObj] = Cogl.color_from_string(color);
        if (ok) {
            Main.panel.set_background_color(colorObj);
        } else {
            Main.panel.set_background_color(null);
        }
    }

};
