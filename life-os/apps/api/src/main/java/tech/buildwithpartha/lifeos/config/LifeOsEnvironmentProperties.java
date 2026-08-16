package tech.buildwithpartha.lifeos.config;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "lifeos")
public record LifeOsEnvironmentProperties(
    @NotNull URI publicUrl, boolean sessionCookieSecure, @NotBlank @Email String mailFrom) {}
