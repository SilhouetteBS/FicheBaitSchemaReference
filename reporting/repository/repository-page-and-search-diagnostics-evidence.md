# Repository Page and Search Diagnostics Evidence

Product/version: Repository `12.0.4.433` (current structural checks and sample review; not live tested)

## Goal

Provide read-only page, image-size, active-document, and search-diagnostic context without using `NOLOCK` or hard-coded database names.

## Confirmed Schema Evidence

- `dbo.doc.tocid -> dbo.toc.tocid`.
- `dbo.toc.vol_id -> dbo.vol.vol_id`.
- `dbo.doc.img_bpp`, `img_size`, and `txt_size` support page/image-size diagnostics.
- `dbo.active_doc.tocid` aligns with repository entries for checked-out or active document context.

## Queue Sources Processed

- [Query to see how many pages in repository are in color and black & white?](https://answers.laserfiche.com/questions/168368/Query-to-see-how-many-pages-in-repository-are-in-color-and-black--white)
- [Unknown SQL have a performance impact on Laseriche](https://answers.laserfiche.com/questions/66306/Unknown-SQL-have-a-performance-impact-on-Laseriche)
- [General database error 9008 during search](https://answers.laserfiche.com/questions/221495/While-we-search-within-repository-we-got-error--Error-executing-SQL-command-General-database-error-9008)
- [ORA-32033 unsupported column aliasing](https://answers.laserfiche.com/questions/78110/sql-statement-returns-ORA32033-unsupported-column-aliasing)

## Cautions

- Repository `12.0.4.433` review distinguished image pages from electronic-file internal pages. A PDF can have zero image-page rows. Page counts here count `doc` rows, not entries or internal PDF pages.
- The page classification aggregates exclude the synthetic NULL row from LEFT JOIN and leave NULL bit-depth pages unclassified. Bits-per-pixel is only a heuristic; it does not reliably distinguish grayscale from color. No live execution or performance test of this script was performed.

- `img_bpp` is a practical signal for likely color versus black-and-white pages; validate against actual image storage in your environment.
- Avoid adding `NOLOCK` unless the report explicitly accepts dirty reads.
- Search result tables can be session-specific or transient; this pattern avoids depending on a specific `searchresult` table number.
