package tech.buildwithpartha.lifeos.common.export;

/** Kind of export archive generated. */
public enum ExportFileKind {
  /** Full account data export including all user data, profile, and history (LOS-0517). */
  FULL_DATA_EXPORT,
  /** CSV export of a named report (LOS-1111). */
  REPORT_CSV_EXPORT
}
