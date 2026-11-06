package io.github.freadeax.bauplaner.exportcheck;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mojang.blaze3d.platform.InputConstants;
import fi.dy.masa.litematica.schematic.LitematicaSchematic;
import fi.dy.masa.litematica.schematic.placement.SchematicPlacement;
import fi.dy.masa.litematica.selection.AreaSelection;
import fi.dy.masa.litematica.selection.Box;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import net.fabricmc.fabric.api.client.gametest.v1.FabricClientGameTest;
import net.fabricmc.fabric.api.client.gametest.v1.context.ClientGameTestContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestSingleplayerContext;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.gui.screens.ChatScreen;
import net.minecraft.commands.arguments.blocks.BlockStateParser;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Vec3i;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.IntArrayTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.NbtIo;
import net.minecraft.nbt.StringTag;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.ProblemReporter;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.HoneycombItem;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Mirror;
import net.minecraft.world.level.block.Rotation;
import net.minecraft.world.level.block.WeatheringCopper;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.Property;
import net.minecraft.world.level.levelgen.presets.WorldPresets;
import net.minecraft.world.level.levelgen.structure.BoundingBox;
import net.minecraft.world.level.levelgen.structure.templatesystem.StructurePlaceSettings;
import net.minecraft.world.level.levelgen.structure.templatesystem.StructureTemplate;
import net.minecraft.world.level.storage.TagValueOutput;
import net.minecraft.world.phys.AABB;

/**
 * Checks the planner's exports in a real Minecraft 26.3 client with Litematica and WorldEdit, the way a
 * player uses them: Litematica loads and pastes the .litematic, WorldEdit gets "//schem load" and "//paste"
 * typed into the chat, vanilla structure templates turn the unturned paste as the game itself turns things,
 * and both tools save real files of what stands in the world. All steps come from job.json in the folder
 * BAUPLANER_EXPORTCHECK_DIR (written and verified by scripts/mod/export_check.mjs); every box the job asks
 * for is written back as an NBT dump (block states, block entities, entities) for the comparison.
 */
public final class ExportCheckGameTest implements FabricClientGameTest {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();

    @Override
    public void runTest(ClientGameTestContext context) {
        Path io = Path.of(require(System.getenv("BAUPLANER_EXPORTCHECK_DIR"), "BAUPLANER_EXPORTCHECK_DIR fehlt"));
        Path game = FabricLoader.getInstance().getGameDir();
        Path weDir = game.resolve("config/worldedit/schematics"), litDir = game.resolve("schematics");
        // BAUPLANER_EXPORTCHECK_JOB: job.json (run 1) or job2.json (run 2); results go to result.json / result2.json.
        String jobName = System.getenv().getOrDefault("BAUPLANER_EXPORTCHECK_JOB", "job.json");
        String resultName = jobName.replace("job", "result");
        Map<String, Object> result = new LinkedHashMap<>();
        List<Object> log = new ArrayList<>();
        result.put("steps", log);
        try {
            Files.createDirectories(weDir);
            Files.createDirectories(litDir);
            JsonObject job = JsonParser.parseString(Files.readString(io.resolve(jobName))).getAsJsonObject();
            // All .schem files go into WorldEdit's folder first, as a player would put them there.
            try (var files = Files.list(io)) {
                for (Path f : files.filter(f -> f.getFileName().toString().endsWith(".schem")).toList())
                    Files.copy(f, weDir.resolve(f.getFileName()), StandardCopyOption.REPLACE_EXISTING);
            }
            try (TestSingleplayerContext world = context.worldBuilder().adjustSettings(s -> {
                s.setAllowCommands(true);
                s.getNormalPresetList().stream().filter(e -> e.preset() != null && e.preset().is(WorldPresets.FLAT)).findFirst().ifPresent(s::setWorldType);
            }).create()) {
                var server = world.getServer();
                server.runCommand("time set noon");
                // Nothing may walk into a box or change it by itself: no time, weather, mobs.
                for (String rule : List.of("advance_time false", "advance_weather false", "spawn_mobs false", "spawn_monsters false", "mob_griefing false"))
                    server.runCommand("gamerule " + rule);
                for (JsonElement el : job.getAsJsonArray("steps")) {
                    JsonObject step = el.getAsJsonObject();
                    String op = step.get("op").getAsString();
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("op", op);
                    if (step.has("name")) entry.put("name", step.get("name").getAsString());
                    switch (op) {
                        case "command" -> {
                            for (JsonElement c : step.getAsJsonArray("commands")) server.runCommand(c.getAsString());
                            context.waitTicks(2);
                        }
                        case "wait" -> context.waitTicks(step.get("ticks").getAsInt());
                        case "load" -> {
                            // Load the area first: pastes and dumps must not hit unloaded chunks.
                            int[] min = ints(step, "min"), max = ints(step, "max");
                            server.runCommand("forceload add " + min[0] + " " + min[2] + " " + max[0] + " " + max[2]);
                            context.waitTicks(10);
                        }
                        case "litematica" -> {
                            String file = step.get("file").getAsString();
                            Files.copy(io.resolve(file), litDir.resolve(file), StandardCopyOption.REPLACE_EXISTING);
                            BlockPos at = pos(ints(step, "at"));
                            String outcome = server.computeOnServer(s -> {
                                LitematicaSchematic schematic = LitematicaSchematic.createFromFile(litDir, file);
                                if (schematic == null) return "Litematica konnte " + file + " nicht laden";
                                SchematicPlacement placement = SchematicPlacement.createFor(schematic, at, step.get("name").getAsString(), true, true);
                                if (step.has("rotation")) placement.setRotation(Rotation.valueOf(step.get("rotation").getAsString()), null);
                                if (step.has("mirror")) placement.setMirror(Mirror.valueOf(step.get("mirror").getAsString()), null);
                                boolean ok = schematic.placeToWorld(s.overworld(), placement, false);
                                entry.put("regions", schematic.getSubRegionCount());
                                entry.put("metadataName", schematic.getMetadata().getName());
                                return ok ? "ok" : "placeToWorld meldet false";
                            });
                            entry.put("outcome", outcome);
                            context.waitTicks(5);
                        }
                        case "worldedit" -> {
                            // As a player: stand at "at", load the file from the WorldEdit folder and paste it there.
                            String file = step.get("file").getAsString();
                            int[] at = ints(step, "at");
                            tp(context, world, at);
                            // WorldEdit 7.4 resolves the name as a file in its folder: the extension is part of it.
                            chat(context, "//schem load " + file);
                            context.waitTicks(10);
                            chat(context, "//paste " + (step.has("flags") ? step.get("flags").getAsString() : "-e"));
                            context.waitTicks(20);
                        }
                        case "wesave" -> {
                            // //pos1, //pos2, //copy -e while standing at "at", then //schem save.
                            int[] min = ints(step, "min"), max = ints(step, "max"), at = ints(step, "at");
                            String name = step.get("name").getAsString();
                            tp(context, world, at);
                            chat(context, "//pos1 " + min[0] + "," + min[1] + "," + min[2]);
                            chat(context, "//pos2 " + max[0] + "," + max[1] + "," + max[2]);
                            chat(context, "//copy -e");
                            context.waitTicks(10);
                            chat(context, "//schem save " + name + " -f");
                            Path saved = weDir.resolve(name + ".schem");
                            context.waitFor(mc -> Files.isRegularFile(saved), 20 * 30);
                            context.waitTicks(20);
                            Files.copy(saved, io.resolve(name + ".schem"), StandardCopyOption.REPLACE_EXISTING);
                            entry.put("file", name + ".schem");
                        }
                        case "litsave" -> {
                            int[] min = ints(step, "min"), max = ints(step, "max");
                            String name = step.get("name").getAsString();
                            String outcome = server.computeOnServer(s -> {
                                AreaSelection selection = new AreaSelection();
                                selection.setName(name);
                                selection.addSubRegionBox(new Box(pos(min), pos(max), name), false);
                                selection.setExplicitOrigin(pos(step.has("origin") ? ints(step, "origin") : min));
                                List<String> messages = new ArrayList<>();
                                LitematicaSchematic schematic = LitematicaSchematic.createFromWorld(s.overworld(), selection,
                                        new LitematicaSchematic.SchematicSaveInfo(false, false), "Exportprüfung", messages::add);
                                if (schematic == null) return "createFromWorld ohne Ergebnis: " + messages;
                                return schematic.writeToFile(litDir, name, true) ? "ok" : "writeToFile meldet false: " + messages;
                            });
                            entry.put("outcome", outcome);
                            Path saved = litDir.resolve(name + ".litematic");
                            if (Files.isRegularFile(saved)) Files.copy(saved, io.resolve(name + ".litematic"), StandardCopyOption.REPLACE_EXISTING);
                            entry.put("file", name + ".litematic");
                        }
                        case "vanilla" -> {
                            // The game's own turn/mirror: structure template of the box, placed with rotation and mirror.
                            int[] min = ints(step, "min"), size = ints(step, "size"), to = ints(step, "to");
                            Rotation rotation = Rotation.valueOf(step.get("rotation").getAsString());
                            Mirror mirror = Mirror.valueOf(step.get("mirror").getAsString());
                            int[] box = server.computeOnServer(s -> {
                                ServerLevel level = s.overworld();
                                StructureTemplate template = new StructureTemplate();
                                template.fillFromWorld(level, pos(min), new Vec3i(size[0], size[1], size[2]), true, List.of());
                                StructurePlaceSettings settings = new StructurePlaceSettings().setRotation(rotation).setMirror(mirror).setIgnoreEntities(false);
                                template.placeInWorld(level, pos(to), pos(to), settings, RandomSource.create(1), Block.UPDATE_CLIENTS);
                                BoundingBox b = template.getBoundingBox(settings, pos(to));
                                return new int[] { b.minX(), b.minY(), b.minZ(), b.maxX(), b.maxY(), b.maxZ() };
                            });
                            entry.put("box", box);
                            context.waitTicks(5);
                            if (step.has("dump")) {
                                CompoundTag dump = server.computeOnServer(s -> dump(s, new int[] { box[0], box[1], box[2] }, new int[] { box[3], box[4], box[5] }));
                                NbtIo.writeCompressed(dump, io.resolve(step.get("dump").getAsString() + ".nbt"));
                            }
                        }
                        case "dump" -> {
                            int[] min = ints(step, "min"), max = ints(step, "max");
                            String name = step.get("name").getAsString();
                            CompoundTag dump = server.computeOnServer(s -> dump(s, min, max));
                            NbtIo.writeCompressed(dump, io.resolve(name + ".nbt"));
                            entry.put("file", name + ".nbt");
                        }
                        case "registry" -> {
                            String json = server.computeOnServer(ExportCheckGameTest::registry);
                            Files.writeString(io.resolve("registry.json"), json);
                        }
                        case "screenshot" -> {
                            tp(context, world, ints(step, "at"));
                            int[] look = ints(step, "look");
                            context.setScreen(() -> null);
                            world.getConnection().waitForChunksRender();
                            context.getInput().lookAt(pos(look));
                            context.waitTicks(10);
                            Path shot = context.takeScreenshot("exportcheck-" + step.get("name").getAsString());
                            Files.copy(shot, io.resolve(step.get("name").getAsString() + ".png"), StandardCopyOption.REPLACE_EXISTING);
                        }
                        default -> throw new AssertionError("Unbekannter Schritt " + op);
                    }
                    log.add(entry);
                    Files.writeString(io.resolve(resultName), GSON.toJson(result));
                }
                result.put("done", true);
                Files.writeString(io.resolve(resultName), GSON.toJson(result));
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } catch (Throwable t) {
            try { Files.writeString(io.resolve("fehler.txt"), String.valueOf(t)); } catch (IOException ignored) { }
            throw t;
        }
    }

    /** Block states (palette + indices in y, z, x order), block entities and entities of the box min..max (inclusive). */
    private static CompoundTag dump(MinecraftServer server, int[] min, int[] max) {
        ServerLevel level = server.overworld();
        CompoundTag out = new CompoundTag();
        int sx = max[0] - min[0] + 1, sy = max[1] - min[1] + 1, sz = max[2] - min[2] + 1;
        Map<String, Integer> palette = new LinkedHashMap<>();
        int[] blocks = new int[sx * sy * sz];
        ListTag blockEntities = new ListTag();
        int i = 0;
        for (int y = 0; y < sy; y++) for (int z = 0; z < sz; z++) for (int x = 0; x < sx; x++) {
            BlockPos p = new BlockPos(min[0] + x, min[1] + y, min[2] + z);
            BlockState state = level.getBlockState(p);
            blocks[i++] = palette.computeIfAbsent(BlockStateParser.serialize(state), k -> palette.size());
            BlockEntity be = level.getBlockEntity(p);
            if (be != null) {
                CompoundTag t = new CompoundTag();
                t.put("Pos", new IntArrayTag(new int[] { x, y, z }));
                t.put("Data", be.saveWithFullMetadata(level.registryAccess()));
                blockEntities.add(t);
            }
        }
        ListTag pal = new ListTag();
        palette.keySet().forEach(k -> pal.add(StringTag.valueOf(k)));
        ListTag entities = new ListTag();
        AABB area = new AABB(min[0], min[1], min[2], max[0] + 1, max[1] + 1, max[2] + 1);
        for (Entity e : level.getEntities((Entity) null, area, e -> !(e instanceof Player))) {
            TagValueOutput tag = TagValueOutput.createWithContext(ProblemReporter.DISCARDING, level.registryAccess());
            e.save(tag);
            entities.add(tag.buildResult());
        }
        out.put("Min", new IntArrayTag(min));
        out.put("Size", new IntArrayTag(new int[] { sx, sy, sz }));
        out.put("Palette", pal);
        out.put("Blocks", new IntArrayTag(blocks));
        out.put("BlockEntities", blockEntities);
        out.put("Entities", entities);
        return out;
    }

    /** Registries of the running game (PROFILE-01) and its copper weathering/waxing maps (MAT-04). */
    private static String registry(MinecraftServer server) {
        JsonObject out = new JsonObject();
        JsonObject blocks = new JsonObject();
        for (Block block : BuiltInRegistries.BLOCK) {
            JsonObject props = new JsonObject();
            for (Property<?> p : block.getStateDefinition().getProperties()) {
                JsonArray values = new JsonArray();
                for (Object v : p.getPossibleValues()) values.add(nameOf(p, v));
                props.add(p.getName(), values);
            }
            JsonObject b = new JsonObject();
            b.add("properties", props);
            b.addProperty("default", BlockStateParser.serialize(block.defaultBlockState()));
            b.addProperty("blockEntity", block.defaultBlockState().hasBlockEntity());
            blocks.add(BuiltInRegistries.BLOCK.getKey(block).toString(), b);
        }
        out.add("blocks", blocks);
        out.add("items", keys(BuiltInRegistries.ITEM));
        out.add("blockEntityTypes", keys(BuiltInRegistries.BLOCK_ENTITY_TYPE));
        out.add("entityTypes", keys(BuiltInRegistries.ENTITY_TYPE));
        out.add("weathering", pairs(WeatheringCopper.NEXT_BY_BLOCK.get()));
        out.add("waxing", pairs(HoneycombItem.WAXABLES.get()));
        out.addProperty("dataVersion", net.minecraft.SharedConstants.getCurrentVersion().dataVersion().version());
        out.addProperty("gameVersion", net.minecraft.SharedConstants.getCurrentVersion().name());
        return GSON.toJson(out);
    }

    @SuppressWarnings({ "unchecked", "rawtypes" })
    private static String nameOf(Property p, Object v) { return p.getName((Comparable) v); }

    private static JsonArray keys(net.minecraft.core.Registry<?> registry) {
        JsonArray a = new JsonArray();
        new TreeMap<>(registry.keySet().stream().collect(java.util.stream.Collectors.toMap(Object::toString, k -> k))).keySet().forEach(a::add);
        return a;
    }

    private static JsonArray pairs(Map<Block, Block> map) {
        JsonArray a = new JsonArray();
        map.forEach((from, to) -> {
            JsonArray p = new JsonArray();
            p.add(BuiltInRegistries.BLOCK.getKey(from).toString());
            p.add(BuiltInRegistries.BLOCK.getKey(to).toString());
            a.add(p);
        });
        return a;
    }

    private static void tp(ClientGameTestContext context, TestSingleplayerContext world, int[] at) {
        world.getServer().runCommand("tp @a " + (at[0] + 0.5) + " " + at[1] + " " + (at[2] + 0.5) + " 0 0");
        context.waitTicks(10);
    }

    private static void chat(ClientGameTestContext context, String line) {
        context.setScreen(() -> new ChatScreen("", false));
        context.getInput().typeChars(line);
        context.getInput().pressKey(InputConstants.KEY_RETURN);
        context.waitTicks(3);
    }

    private static int[] ints(JsonObject o, String key) {
        JsonArray a = o.getAsJsonArray(key);
        int[] out = new int[a.size()];
        for (int i = 0; i < out.length; i++) out[i] = a.get(i).getAsInt();
        return out;
    }

    private static BlockPos pos(int[] p) { return new BlockPos(p[0], p[1], p[2]); }

    private static <T> T require(T value, String message) {
        if (value == null) throw new IllegalStateException(message);
        return value;
    }
}
