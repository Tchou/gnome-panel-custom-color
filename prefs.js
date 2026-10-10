import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const COLOR = 'color';

function _gdk_rgba_to_string(rgba) {
    const r = (rgba.red * 255) | 0;
    const g = (rgba.green * 255) | 0;
    const b = (rgba.blue * 255) | 0;
    return "rgba(" + r + "," + g + "," + b + "," + rgba.alpha + ")";
}

export default class GnomePanelCustomColorPrefsWidget extends ExtensionPreferences {

    fillPreferencesWindow(window) {
        window._settings = this.getSettings('vg.nguyen.gnome-panel-custom-color');
        const opacity = window._settings.get_string(COLOR);

        const page = new Adw.PreferencesPage();

        const group = new Adw.PreferencesGroup({
            title: _('Gnome Panel Color'),
        });

        // color
        const chooser = new Gtk.ColorChooser();
        chooser.set_use_alpha(true);

        // setting value last as it might not work if the scale is not set up properly
        scale.set_value(opacity);
        scale.connect('color-activated', (new_color) => {
            window._settings.set_string(COLOR, _gdk_rgba_to_string(new_color));
        });
        group.add(scale);

        page.add(group);

        window.add(page);
    }

}

