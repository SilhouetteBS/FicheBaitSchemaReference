# Forms Attachment Entry-ID Associations

Source: [Duplicate entry IDs saving in multiple instances v12](https://answers.laserfiche.com/questions/237458/Duplicate-entry-IDs-saving-in-multiple-instances-v12).

This original adaptation counts distinct attachments, mapped data rows and associated instances for one supplied entry reference. Detail output is capped at 1,000 associations; summary counts are not capped. It avoids attachment binaries, filenames and submitted values. LEFT JOINs retain unmatched attachment records.

All referenced tables and columns exist in the five imported Forms builds, from 11.0.2311.50564 through 12.0.2607.40144. This is structural compatibility, not live testing.

Counts include soft-deleted attachments. Missing mappings do not prove an attachment was never used. Entry numbers are repository-scoped; verify the destination repository and process history independently. Do not delete or repair rows based on this report. No status meanings or confidence labels were promoted.
