# Oracle Networks — Private Client Desk

A responsive, dependency-free website for Oracle Networks, configured for Indian clients with INR defaults, Indian number grouping and India Standard Time (IST). Open `index.html` in a modern browser, or serve this folder with any static web server.

## Included

- Branded home, About and Platform sections
- Workspace dashboard using only records saved in the current browser
- Plan distribution chart, recent records, search and filters
- Three-step client report wizard with live BDX quantity calculation and BVS Fixed, BVS Combo and ESP plan illustrations
- Report archive, preview, deletion confirmation and print-to-PDF flow
- Dark and light themes, responsive navigation and mobile layouts
- Oracle Networks logo applied in the shared navigation, footer and report document
- Indian English locale, INR default and IST dates across the website and client reports
- Time-aware “Good morning”, “Good afternoon” and “Good evening” greeting on the report cover
- Optional client phone number captured in the wizard and included in reports
- Optional multiple-select financial goals and a custom goal field, included in the report
- Compact legal disclaimer printed visibly on the same one-page client report PDF
- The matching BVS Combo, BVS Fixed or ESP explanation and calculations are included in the report
- A dedicated blank signing area is reserved above the client signature label at the bottom of the one-page PDF
- PDF print layout distributes report sections vertically across one A4 page

## Privacy and calculation notes

Client reports are stored in `localStorage` on the device and browser used to create them. There is no account system, server, database or access control in this static build. Do not use it to store sensitive client information in a shared browser. No market data is fetched. Enter a whole-number BDX coin quantity. The estimated BDX amount is that quantity in whole coins, and the reference valuation is coin quantity multiplied by the entered BDX price. Dates and times are entered and shown in IST. The supplied plan sheets are reflected in the report output: BVS Fixed (3-year 250% and 5-year 400%), BVS Combo (50/50 allocation, 3% monthly for 60 months, and 400% fixed reference), and ESP (the four pictured 5-year tiers). These figures are illustrative references, not independently verified terms or guaranteed returns. ESP applies a rate only when the estimated quantity exactly matches one of the pictured tiers.

To create a PDF, use **Save & create PDF** and select **Save as PDF** in the browser print dialog. The printable report uses a white A4 sheet with charcoal typography and champagne-gold details. The supplied white lettering remains visible on its charcoal logo backing.
