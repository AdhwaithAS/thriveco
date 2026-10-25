package com.marian.thriveco.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * The original UI stores human-readable timestamps such as
 * "2026-10-11 18:30". Keeping that format means the API response is a
 * drop-in match for the existing HTML/JS frontend.
 */
public final class Timestamps {

    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private Timestamps() {
    }

    public static String now() {
        return LocalDateTime.now().format(DATE_TIME);
    }

    public static String today() {
        return LocalDate.now().format(DATE);
    }

    public static String isoNow() {
        return LocalDateTime.now().toString();
    }
}
