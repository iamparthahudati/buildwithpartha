/**
 * Cross-domain background job port: {@link BackgroundJobPort} and {@link BackgroundJobKind}.
 *
 * <p>Other domains (e.g. {@code auth}) must import only this package to enqueue jobs — never {@code
 * tech.buildwithpartha.lifeos.job.*} directly, preserving domain isolation (LOS-0206).
 */
package tech.buildwithpartha.lifeos.common.job;
