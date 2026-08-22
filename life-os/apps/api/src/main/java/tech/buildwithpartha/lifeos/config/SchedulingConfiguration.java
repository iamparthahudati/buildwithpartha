package tech.buildwithpartha.lifeos.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/**
 * Enables {@code @Scheduled} methods, first used by the outbox mail worker (LOS-1402). The
 * scheduler thread pool is explicitly daemon: Spring's own default (no {@link TaskScheduler} bean
 * present) creates non-daemon threads, which would keep the JVM alive indefinitely under {@code
 * spring.main.web-application-type: none} — the profile {@code scripts/verify-flyway-postgres.sh}
 * uses to start and expect the process to exit on its own once startup checks complete.
 */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
public class SchedulingConfiguration {

  @Bean
  TaskScheduler taskScheduler() {
    ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
    scheduler.setPoolSize(1);
    scheduler.setThreadNamePrefix("lifeos-scheduler-");
    scheduler.setDaemon(true);
    return scheduler;
  }
}
