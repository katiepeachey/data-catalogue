ALTER TABLE datapoint_fields ADD COLUMN dynamics_field_type TEXT NOT NULL DEFAULT '';
ALTER TABLE datapoint_fields ADD COLUMN field_length INTEGER;
ALTER TABLE datapoint_fields ADD COLUMN help_text TEXT NOT NULL DEFAULT '';

-- Auto-populate dynamics_field_type from existing sf_field_type
UPDATE datapoint_fields SET dynamics_field_type = CASE sf_field_type
  WHEN 'Text'                  THEN 'Single Line of Text'
  WHEN 'Long Text Area'        THEN 'Multiple Lines of Text'
  WHEN 'Text (Long)'           THEN 'Multiple Lines of Text'
  WHEN 'Text Area (Long)'      THEN 'Multiple Lines of Text'
  WHEN 'Number'                THEN 'Whole Number'
  WHEN 'Currency'              THEN 'Currency'
  WHEN 'Percent'               THEN 'Decimal Number'
  WHEN 'Date'                  THEN 'Date Only'
  WHEN 'DateTime'              THEN 'Date and Time'
  WHEN 'Checkbox'              THEN 'Two Options'
  WHEN 'Picklist'              THEN 'Choice'
  WHEN 'Multi-Select Picklist' THEN 'Choices'
  WHEN 'URL'                   THEN 'URL'
  WHEN 'Email'                 THEN 'Email'
  WHEN 'Phone'                 THEN 'Phone'
  WHEN 'Lookup'                THEN 'Lookup'
  ELSE ''
END
WHERE dynamics_field_type = '';
