/**
 * Domain-neutral contract for transactionally enqueuing verification/reset/security mail.
 *
 * <p>{@link tech.buildwithpartha.lifeos.common.mail.TransactionalMailPort} is implemented by {@code
 * notification.infrastructure}. A caller in another domain package (for example {@code
 * auth.application}) may depend on this package without depending on any {@code notification}
 * internals, matching the domain-isolation rule enforced by {@code PackageBoundaryRules}.
 */
package tech.buildwithpartha.lifeos.common.mail;
