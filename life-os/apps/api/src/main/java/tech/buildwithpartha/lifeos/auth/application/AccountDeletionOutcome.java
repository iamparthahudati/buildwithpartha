package tech.buildwithpartha.lifeos.auth.application;

import java.time.Instant;

/** The result of successfully requesting account deletion (LOS-0518). */
public record AccountDeletionOutcome(Instant requestedAt, Instant scheduledPurgeAt) {}
