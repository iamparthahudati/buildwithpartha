-- LOS-1111: Add REPORT_CSV_EXPORT kind to the export_files check constraint.
-- Drops and recreates the check constraint to allow the new report CSV export kind.

ALTER TABLE public.export_files
    DROP CONSTRAINT ck_export_files_kind;

ALTER TABLE public.export_files
    ADD CONSTRAINT ck_export_files_kind CHECK (
        export_kind IN ('FULL_DATA_EXPORT', 'REPORT_CSV_EXPORT')
    );

COMMENT ON COLUMN public.export_files.export_kind IS 'FULL_DATA_EXPORT | REPORT_CSV_EXPORT; selects export structure and format.';
