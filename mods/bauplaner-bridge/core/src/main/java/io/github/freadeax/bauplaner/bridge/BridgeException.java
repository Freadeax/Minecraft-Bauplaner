package io.github.freadeax.bauplaner.bridge;

/** Readable failure shown to the player in chat. */
public final class BridgeException extends RuntimeException {
    private final String english;

    public BridgeException(String message) { this(message, null); }

    /** German message plus the English one for players whose game (or mod setting) is English. */
    public BridgeException(String message, String english) { super(message); this.english = english; }

    /** English text when there is one, else the German message. */
    public String english() { return english != null ? english : getMessage(); }

    /** Message of any failure in the player's language; only {@link BridgeException} carries an English text. */
    public static String text(Throwable e, boolean english) {
        return english && e instanceof BridgeException b ? b.english() : e.getMessage();
    }
}
