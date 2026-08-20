package tech.buildwithpartha.lifeos.report.domain;

/**
 * Represents the loading/freshness state of a modular dashboard widget. Models partial failure and
 * zero-safe/first-use empty states.
 */
public enum WidgetStatus {
  SUCCESS,
  EMPTY,
  ERROR
}
