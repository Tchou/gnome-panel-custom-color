import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const COLOR = 'color';

function _gdk_rgba_to_string(rgba) {
    const r = (rgba.red * 255) | 0;
    const g = (rgba.green * 255) | 0;
    const b = (rgba.blue * 255) | 0;
    const a = rgba.alpha - (rgba.alpha % 0.01);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}

export default class GnomePanelCustomColorPrefsWidget extends ExtensionPreferences {

    fillPreferencesWindow(window) {
        window._settings = this.getSettings();

        const colorStr = window._settings.get_string(COLOR);
        const color = new Gdk.RGBA();
        color.parse(colorStr);

        const page = new Adw.PreferencesPage();

        const group = new Adw.PreferencesGroup({
            title: _('Gnome Panel Color'),
        });

        const dialog = new Gtk.ColorDialog({
            title: _('Choose Panel Color'),
            with_alpha: true,
            modal: true
        });

        const colorButton = new Gtk.ColorDialogButton({
            dialog: dialog,
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.END,
        });

        colorButton.set_rgba(color);

        colorButton.connect('notify::rgba', () => {
            window._settings.set_string(
                COLOR,
                _gdk_rgba_to_string(colorButton.get_rgba())
            );
        });

//        const row = new Adw.ActionRow({
//            title: _('Panel color'),
//        });
        group.set_header_suffix(colorButton);
//        row.add_suffix(colorButton);
//        row.set_activatable_widget(colorButton);

//        group.add(row);
        page.add(group);
        window.add(page);
    }
}

