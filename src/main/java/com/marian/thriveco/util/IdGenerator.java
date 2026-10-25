package com.marian.thriveco.util;

import java.util.Collection;
import java.util.Locale;

/**
 * Generates sequential, human-readable IDs such as FAC001, MED013, BLD013.
 * Unlike the original JavaScript implementation, this looks at the highest
 * existing ID (not the list length), so IDs are never reused after deletion.
 */
public final class IdGenerator {

    private IdGenerator() {
    }

    public static String next(String prefix, Collection<String> existingIds, int width) {
        int highest = 0;
        for (String id : existingIds) {
            if (id == null || !id.startsWith(prefix)) {
                continue;
            }
            try {
                highest = Math.max(highest, Integer.parseInt(id.substring(prefix.length())));
            } catch (NumberFormatException ignored) {
                // Ignore malformed legacy IDs instead of failing the request.
            }
        }
        return prefix + String.format(Locale.ROOT, "%0" + width + "d", highest + 1);
    }
}
