package tech.buildwithpartha.lifeos.auth.application;

import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.auth.domain.RawPassword;

public record ChangePasswordCommand(
    UUID userId,
    RawPassword currentPassword,
    RawPassword newPassword,
    Optional<String> currentSessionToken) {}
