package io.github.freadeax.bauplaner.mod.commands;

import java.util.ArrayList;
import java.util.List;

/**
 * The command catalog as JSON for the planner's page #/mod (GAME-12, 0.23.0): every command in German and English,
 * grouped like the tabs of the command page in the game. Written to {@code apps/web/src/views/mod/modCommands.json}
 * by {@code CommandExportTest} (run with {@code -Dbauplaner.writeCommands=true}); the test fails when the file is stale.
 */
public final class CommandExport {
    private CommandExport() {}

    public static String json() {
        StringBuilder b = new StringBuilder("{\n  \"groups\": [");
        List<String> groups = CommandCatalog.groups();
        for (int i = 0; i < groups.size(); i++) {
            String g = groups.get(i);
            b.append(i == 0 ? "\n" : ",\n").append("    {\"de\": ").append(q(g)).append(", \"en\": ").append(q(CommandCatalogEn.GROUPS.getOrDefault(g, g))).append('}');
        }
        b.append("\n  ],\n  \"commands\": [");
        List<CommandCatalog.Entry> all = CommandCatalog.all();
        for (int i = 0; i < all.size(); i++) {
            CommandCatalog.Entry e = all.get(i);
            String de = "/" + e.base(), en = "/" + (e.side() == CommandCatalog.Side.CLIENT ? CommandWords.english(e.base()) : e.base());
            b.append(i == 0 ? "\n" : ",\n").append("    {\"id\": ").append(q(e.id())).append(", \"group\": ").append(q(e.group()))
                    .append(", \"side\": ").append(q(e.side() == CommandCatalog.Side.CLIENT ? "mod" : "plugin"))
                    .append(", \"de\": {\"label\": ").append(q(e.label())).append(", \"command\": ").append(q(de + args(e, false))).append(", \"help\": ").append(q(e.help())).append('}')
                    .append(", \"en\": {\"label\": ").append(q(e.labelEn())).append(", \"command\": ").append(q(en + args(e, true))).append(", \"help\": ").append(q(e.helpEn())).append("}}");
        }
        return b.append("\n  ]\n}\n").toString();
    }

    private static String args(CommandCatalog.Entry e, boolean english) {
        List<String> out = new ArrayList<>();
        for (CommandCatalog.Arg a : e.args()) {
            String name;
            if (a.kind() == CommandCatalog.Kind.CHOICE)
                name = String.join("|", a.choices().stream().map(c -> english && e.side() == CommandCatalog.Side.CLIENT ? CommandWords.en(c) : c).toList());
            else name = english ? CommandCatalogEn.ARGS.getOrDefault(a.name(), a.name()) : a.name();
            out.add(a.optional() ? "[" + name + "]" : "<" + name + ">");
        }
        return out.isEmpty() ? "" : " " + String.join(" ", out);
    }

    private static String q(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> b.append("\\\"");
                case '\\' -> b.append("\\\\");
                case '\n' -> b.append("\\n");
                default -> { if (c < 0x20) b.append(String.format("\\u%04x", (int) c)); else b.append(c); }
            }
        }
        return b.append('"').toString();
    }
}
