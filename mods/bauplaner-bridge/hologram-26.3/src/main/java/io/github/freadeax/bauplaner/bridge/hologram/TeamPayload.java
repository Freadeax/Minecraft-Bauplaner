package io.github.freadeax.bauplaner.bridge.hologram;

import io.github.freadeax.bauplaner.mod.team.TeamWire;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.Identifier;

/**
 * One frame on the team channel {@code bauplaner:team} (COOP-03): raw bytes without a length prefix, exactly
 * what Bukkit plugin messages carry, so the Paper plugin reads it with {@code onPluginMessageReceived}.
 * Registered by the loaders (Fabric: payload type registry, NeoForge: optional payload); sent only by
 * {@link io.github.freadeax.bauplaner.mod.team.TeamSync} after the player allowed it for the server.
 */
public record TeamPayload(byte[] data) implements CustomPacketPayload {
    public static final Type<TeamPayload> TYPE = new Type<>(Identifier.parse(TeamWire.CHANNEL));
    /** Bukkit allows up to 32 KiB client → server; frames are at most {@link TeamWire#FRAME} plus envelope. */
    public static final int MAX = 64 * 1024;
    public static final StreamCodec<FriendlyByteBuf, TeamPayload> CODEC = StreamCodec.of(
            (buf, p) -> buf.writeBytes(p.data),
            buf -> {
                int n = buf.readableBytes();
                if (n > MAX) throw new IllegalArgumentException("Teamkanal: Nachricht zu groß (" + n + " Bytes)");
                byte[] b = new byte[n];
                buf.readBytes(b);
                return new TeamPayload(b);
            });

    @Override
    public Type<? extends CustomPacketPayload> type() { return TYPE; }
}
