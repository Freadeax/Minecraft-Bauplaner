package io.github.freadeax.bauplaner.bridge.hologram;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import com.mojang.brigadier.context.CommandContext;
import com.mojang.brigadier.suggestion.Suggestions;
import com.mojang.brigadier.suggestion.SuggestionsBuilder;
import com.mojang.brigadier.tree.ArgumentCommandNode;
import com.mojang.brigadier.tree.CommandNode;
import com.mojang.brigadier.tree.LiteralCommandNode;
import io.github.freadeax.bauplaner.mod.Lang;
import io.github.freadeax.bauplaner.mod.commands.CommandWords;
import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Registers the client command tree in German and English (GAME-12, 0.23.0): {@code /bauplaner …} with the German
 * words and {@code /buildplanner …} with the English ones from {@link CommandWords}. Below both roots every literal
 * exists in both languages, so mixed lines work too; tab completion only offers the words of the mod's current
 * language ({@link Lang}) – the other language's word appears only when it is the only one matching what was typed.
 * Loader neutral: Fabric and NeoForge hand over their builder and dispatcher.
 */
public final class CommandLang {
    private CommandLang() {}

    /** Builds {@code root} (named {@link CommandWords#ROOT_DE}) and adds the German and the English root to the dispatcher. */
    public static <S> void register(CommandDispatcher<S> dispatcher, LiteralArgumentBuilder<S> root) {
        CommandNode<S> plain = root.build();
        Map<CommandNode<S>, CommandNode<S>> done = new IdentityHashMap<>();
        List<CommandNode<S>> children = convertChildren(plain, done);
        for (boolean english : new boolean[] { false, true }) {
            String name = english ? CommandWords.ROOT_EN : CommandWords.ROOT_DE;
            LangLiteral<S> node = new LangLiteral<>(name, plain.getCommand(), plain.getRequirement(), null, null, false, english, english ? CommandWords.ROOT_DE : CommandWords.ROOT_EN);
            children.forEach(node::addChild);
            dispatcher.getRoot().addChild(node);
        }
    }

    private static <S> List<CommandNode<S>> convertChildren(CommandNode<S> node, Map<CommandNode<S>, CommandNode<S>> done) {
        List<CommandNode<S>> out = new ArrayList<>();
        for (CommandNode<S> child : node.getChildren()) {
            if (child instanceof LiteralCommandNode<S> lit) {
                String de = lit.getLiteral();
                boolean twin = CommandWords.translated(de);
                List<CommandNode<S>> grand = convertChildren(child, done);
                LangLiteral<S> german = new LangLiteral<>(de, lit.getCommand(), lit.getRequirement(), null, lit.getRedirectModifier(), lit.isFork(), false, twin ? CommandWords.en(de) : null);
                grand.forEach(german::addChild);
                out.add(german);
                if (twin) {
                    LangLiteral<S> english = new LangLiteral<>(CommandWords.en(de), lit.getCommand(), lit.getRequirement(), null, lit.getRedirectModifier(), lit.isFork(), true, de);
                    grand.forEach(english::addChild);
                    out.add(english);
                }
            } else if (child instanceof ArgumentCommandNode<S, ?> arg) {
                CommandNode<S> copy = done.get(arg);
                if (copy == null) {
                    copy = arg.createBuilder().build();
                    done.put(arg, copy);
                    for (CommandNode<S> g : convertChildren(arg, done)) copy.addChild(g);
                }
                out.add(copy);
            }
        }
        return out;
    }

    /** All German literals without an English word ({@code CommandWords}) – shown by the game test; empty when complete. */
    public static <S> List<String> untranslated(CommandNode<S> node) {
        List<String> out = new ArrayList<>();
        walk(node, "", out, java.util.Collections.newSetFromMap(new IdentityHashMap<>()));
        return out;
    }

    private static <S> void walk(CommandNode<S> node, String path, List<String> out, java.util.Set<CommandNode<S>> seen) {
        if (!seen.add(node)) return;
        for (CommandNode<S> c : node.getChildren()) {
            if (c instanceof LangLiteral<S> l && !l.english && l.twin == null && !CommandWords.SAME.contains(l.getLiteral())) out.add(path + " " + l.getLiteral());
            walk(c, path + " " + c.getName(), out, seen);
        }
    }

    /** A literal that knows its language; its builder keeps the class when a loader copies the tree for suggestions. */
    static final class LangLiteral<S> extends LiteralCommandNode<S> {
        final boolean english;
        /** The same word in the other language, null when it is the same in both. */
        final String twin;

        LangLiteral(String literal, com.mojang.brigadier.Command<S> command, java.util.function.Predicate<S> requirement, CommandNode<S> redirect,
                com.mojang.brigadier.RedirectModifier<S> modifier, boolean forks, boolean english, String twin) {
            super(literal, command, requirement, redirect, modifier, forks);
            this.english = english;
            this.twin = twin;
        }

        @Override
        public CompletableFuture<Suggestions> listSuggestions(CommandContext<S> context, SuggestionsBuilder builder) {
            String typed = builder.getRemaining().toLowerCase(Locale.ROOT);
            String me = getLiteral().toLowerCase(Locale.ROOT);
            if (!me.startsWith(typed)) return Suggestions.empty();
            boolean mine = twin == null || english == Lang.en();
            boolean otherFits = twin != null && twin.toLowerCase(Locale.ROOT).startsWith(typed);
            if (mine || !typed.isEmpty() && !otherFits) return builder.suggest(getLiteral()).buildFuture();
            return Suggestions.empty();
        }

        @Override
        public LiteralArgumentBuilder<S> createBuilder() {
            LangBuilder<S> b = new LangBuilder<>(getLiteral(), english, twin);
            b.requires(getRequirement());
            b.forward(getRedirect(), getRedirectModifier(), isFork());
            if (getCommand() != null) b.executes(getCommand());
            return b;
        }
    }

    static final class LangBuilder<S> extends LiteralArgumentBuilder<S> {
        private final boolean english;
        private final String twin;

        LangBuilder(String literal, boolean english, String twin) { super(literal); this.english = english; this.twin = twin; }

        @Override
        public LiteralCommandNode<S> build() {
            LangLiteral<S> node = new LangLiteral<>(getLiteral(), getCommand(), getRequirement(), getRedirect(), getRedirectModifier(), isFork(), english, twin);
            for (CommandNode<S> c : getArguments()) node.addChild(c);
            return node;
        }
    }
}
