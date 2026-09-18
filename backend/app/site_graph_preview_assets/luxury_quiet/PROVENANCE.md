# Internal UMBRAL / QA assets

Reviewed 2026-09-18. These are packaged synthetic-fixture photographs, not
customer assets or evidence that a depicted product is available for purchase.
The fixture is identity-bound by block IDs, headline and two product names.
No external images/fonts are requested at runtime. See manifest.json for source
URLs, authors, dimensions, original/delivery SHA256 and exact transformations.

## Photographs

- Hero: Weronika Karczewska, https://unsplash.com/photos/Yk_7RscELJE.
  Independent horizontal original, 5848x3904. Glass vase/dried flowers on linen;
  natural negative space left. No dark filter or AI alteration. Desktop crop
  50% 56%; mobile 75% 50%. Visible vase retained, decorative stem tips may crop.
- Jarron blanco: Linh Le, https://unsplash.com/photos/a0rE64YJDA4.
  White vase and branch, original 4000x6000. 4:5 CSS crop, 50% 75%; vase intact.
- Duo de recipientes con tapa: Anya Chernykh,
  https://unsplash.com/photos/7jGvCol0Cz4. Original 6180x9270. 4:5 CSS crop,
  50% 100%; both lidded objects and their feet retained. Cup/books are props,
  not additional products in the graph.

All three source pages identify the free Unsplash License:
https://unsplash.com/license. Attribution is included in the preview.
Original files were downloaded and visually reviewed, as were final browser
crops. No visible logo/person was identified. This is NOT a legal clearance
guarantee for every depicted design or incidental property. Unsplash explicitly
does not grant trademark, recognizable-person or artwork rights:
https://help.unsplash.com/en/articles/14224409-what-if-there-is-a-brand-logo-in-an-image-on-unsplash.
Only CDN resize/WebP compression and CSS framing were used; no logo removal,
retouching, synthetic photos or changes to the depicted objects.

## Font and icons

Cormorant Garamond Medium, Christian Thalmann / Cormorant Project Authors.
Original static OTF at upstream revision
9719e26aa8e26d7a30e736667427b9e05b5db059, unmodified. Copyright and SIL OFL 1.1
are preserved in OFL.txt. Embedded once as font/otf, no installed font dependency.

Shopping cart/credit card SVGs reuse the existing Lucide 0.468.0 assets in
../bold_commerce, covered by its unchanged lucide-LICENSE (ISC). No icon JS runs.

## Design qualifications

H1 tracking is 0 by the user's final design approval. The earlier requested
0.02-0.04em experiment was not performed and is not described as a failed
legibility test. Composition supplies the spacing instead. The user accepted
stress320-final.json (40px H1, 12 products, no horizontal overflow) for release.
The naturally light hero is deliberate: the objects remain inspectable; trust
and footer provide the deep neutral gallery contrast. Mobile hero minimum is
min(620px,82svh), rather than the approximate 480px design target, to retain the
whole vase and leave the next section visible. H1 uses 40px only at <=360px.
