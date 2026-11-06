package io.github.freadeax.bauplaner.mod;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class DiagnosticsTest {
    @Test
    void picksBauplanerLinesWithTheirStackAndRecentErrors() {
        List<String> log = new ArrayList<>();
        log.add("[12:00:00] [Render thread/INFO]: Loading 21 mods");
        log.add("[12:00:01] [Render thread/INFO] (bauplaner) [Platzierhilfe] Treppe falsch herum");
        log.add("[12:00:02] [Render thread/ERROR] (bauplaner) [Fehler] Hologramm-Tick");
        log.add("java.lang.IllegalStateException: kaputt");
        log.add("\tat io.github.freadeax.bauplaner.bridge.hologram.Hologram.tick(Hologram.java:280)");
        log.add("Caused by: java.lang.NullPointerException");
        log.add("\t... 12 more");
        log.add("[12:00:03] [Render thread/INFO]: Sound engine started");
        log.add("[12:00:04] [Worker/ERROR]: Fremde Mod hat ein Problem");
        log.add("\tat com.example.Other.run(Other.java:1)");
        List<String> picked = Diagnostics.selectLog(log, 80);
        assertEquals(List.of(log.get(1), log.get(2), log.get(3), log.get(4), log.get(5), log.get(6), log.get(8)), picked,
                "Build-Studio-Zeilen mit ihrem Stack, dazu Ausnahme- und ERROR-Zeilen; keine Infozeilen und kein fremder Stack");
        assertFalse(picked.contains(log.get(9)));
        assertEquals(3, Diagnostics.selectLog(log, 3).size(), "nur die letzten max Zeilen");
        assertEquals(log.get(8), Diagnostics.selectLog(log, 3).get(2));
    }

    @Test
    void redactsHomeAddressesAndCodes() {
        var d = new Diagnostics("C:\\Users\\fread");
        assertEquals("~\\AppData\\Roaming\\ModrinthApp", d.redact("C:\\Users\\fread\\AppData\\Roaming\\ModrinthApp"));
        assertEquals("~/AppData", d.redact("C:/Users/fread/AppData"));
        assertEquals("Verbinde mit x.x.x.x:25565, Website 127.0.0.1:47123", d.redact("Verbinde mit 203.0.113.7:25565, Website 127.0.0.1:47123"));
        assertEquals("Kopplungscode: •••", d.redact("Kopplungscode: 482913"));
        assertEquals("Mod 0.7.0 für 26.3", d.redact("Mod 0.7.0 für 26.3"), "Versionsnummern bleiben");
    }

    @Test
    void textHasSectionsAndLog() {
        var d = new Diagnostics("/home/philipp");
        d.put("Mod", "Version", "0.7.0").put("Mod", "Loader", "fabric").put("Hologramm", "Plan", null);
        d.log(List.of("[x] (bauplaner) gestartet in /home/philipp/.minecraft"));
        String text = d.text("2026-11-02T20:00");
        assertTrue(text.startsWith("## Build-Studio-Mod Diagnose\n"));
        assertTrue(text.contains("### Mod\n- Version: 0.7.0\n- Loader: fabric\n"));
        assertTrue(text.contains("- Plan: –\n"));
        assertTrue(text.contains("gestartet in ~/.minecraft"));
        assertTrue(text.contains("(Auszug aus logs/latest.log, 1 Zeilen)"));
        assertEquals("diagnose-20261102-200501.txt", Diagnostics.fileName(java.time.LocalDateTime.of(2026, 11, 2, 20, 5, 1)));
    }
}
