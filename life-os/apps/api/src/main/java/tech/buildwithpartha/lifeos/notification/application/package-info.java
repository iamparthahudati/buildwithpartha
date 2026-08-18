/**
 * Enqueues, dispatches, and retires outbox mail messages. Depends only on {@code
 * notification.domain} ports and {@code common}; the concrete JPA/SMTP/template adapters live in
 * {@code notification.infrastructure}.
 */
package tech.buildwithpartha.lifeos.notification.application;
