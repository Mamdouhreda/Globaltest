# Competitor Tools: UX Teardown (Input, Waiting, Results, Retention)

Research date: 2026-10-16. Method: WebFetch and WebSearch, plus read-only browser visits to gtmetrix.com, gtmetrix.com/pricing, geopeeker.com and geopeeker.com/pricing. I ran no tests on any tool, because that would mean submitting forms. The browser extension blocked webpagetest.org and testlocal.ly, and WebFetch returned 403 on gtmetrix.com and webpagetest.org. Waiting-state details are therefore the thinnest part of these notes.

## (a) Input step: URL field, defaults, advanced settings, location pickers

### Takeaway
Most tools use the same pattern: one large URL field with a single primary button, defaults already applied, and the defaults shown as a small summary line rather than as open controls. GTmetrix's "Seattle, WA, USA · Chrome · Unthrottled Connection · Change Options" is the clearest example. Geo-screenshot tools differ mainly in how locations are picked. LocaBrowser uses a checkbox list with a "0 / 6" counter and a hard cap. BrowserStack uses a grouped picker with a "15/25" counter. GeoPeeker's homepage has only a URL field and an arrow button.

### Cited Findings
- **GTmetrix homepage (current, visited 2026-10):**
  - Hero text reads "Find out why your website is slow / Then fix it".
  - Below it are a URL field, a "Test Now" button and an "Analysis Options" summary showing "Seattle, WA, USA", "Chrome" and "Unthrottled Connection", with a "Change Options" link. Defaults are visible but collapsed.
  - The homepage gives the number of test locations as both 25 and 28. The pricing page says 28.
  - It advertises "55+ simulated mobile and tablet devices".
  - Its world map is described as "a bright, multi-ring pulse that radiates outward from one location at a time, cycling in a randomized order around the globe."
  - Source: [GTmetrix](https://gtmetrix.com/)
- **GTmetrix location gating by plan:** Lite has 5 test locations, Core has 10, and Advanced and Expert have 28. Mobile testing is listed on every paid plan. "PRO Analysis Options" are a paid extra. — [GTmetrix Pricing](https://gtmetrix.com/pricing/)
- **GTmetrix upsell on its blog:** A blog splash reads "Get access to more Test Locations, Analysis Options, and Connection Speeds! Log in to your GTmetrix account". — [GTmetrix blog](https://gtmetrix.com/blog/everything-you-need-to-know-about-the-new-gtmetrix-report-powered-by-lighthouse/)
- **GTmetrix free (Basic) account locations are unclear.** GTmetrix's own older blog says 2 regions (London, Seattle). Another GTmetrix post says 7. Freetier.co also lists Seattle and London. — [GTmetrix blog](https://gtmetrix.com/blog/basic-analysis-with-gtmetrix/); [freetier.co](https://freetier.co/directory/products/gtmetrix). The sources conflict.
- **GeoPeeker homepage (current, visited 2026-10):**
  - Headline "See how your site looks to the rest of the world" sits over a dotted world map.
  - There is one URL field (placeholder "example.com") with an arrow submit button, and a "See what's new" link.
  - No location picker is visible on the homepage.
  - The cookie banner gives equal weight to Accept and Reject.
  - Source: [GeoPeeker](https://geopeeker.com/)
- **GeoPeeker positioning text:** "Enter any URL and see it from around the world, side by side". "Quick Peeks are free, no account needed." "Free Peeks cover six locations. Paid plans add six more, plus browser languages and screen sizes." — [GeoPeeker (WebFetch)](https://geopeeker.com/)
- **LocaBrowser:**
  - There is a "Website" field with the example "https://www.google.com" and a Desktop/Mobile toggle.
  - Desktop browsers are Chrome, Firefox, Edge and Safari. Mobile offers a list of named devices, from iPhone to Xiaomi 14.
  - The location list has 12 countries and a "0 / 6" counter that starts with none selected. At the cap it says "Limit reached (Max 6). Uncheck a location to add a new one."
  - The action button is labelled "Browse". The site also promotes an "Add to Chrome" extension.
  - Source: [LocaBrowser](https://www.locabrowser.com/)
- **BrowserStack Screenshots:**
  - The URL field has a history icon next to it, and the empty state says "Enter your URL, select browsers and click Generate Screenshots to get started."
  - The picker is collapsible and grouped by OS and device, with version chips. A counter reads "Select browsers and device combinations (15/25)", up to 25 at once.
  - Settings (resolution, Quality, a Defer Time of 2 to 60 seconds, Portrait or Landscape) are locked behind "Buy a Plan".
  - Source: [BrowserStack Screenshots](https://www.browserstack.com/screenshots)
- **TestLocally (WonderProxy):**
  - Launch flow: "select your locations, enter your URL, and go", with no installation. — [WonderProxy blog](https://wonderproxy.com/blog/introducing-testlocally/)
  - Product page: "Simply type in a URL and off you go!" and custom searches can "Choose up to 9 locations". — [WonderNetwork TestLocally](https://wondernetwork.com/testlocally)
- **WebPageTest:** I could not observe the current start form. The documentation describes results showing the configuration (device/browser, connection, node location) and Labels you can add. — [Catchpoint WPT docs](https://docs.catchpoint.com/wpt/docs/interpreting-instant-test-results.md)
- **WebPageTest default connection (older):** A forum thread says WebPageTest defaulted to a simulated 5 Mbps cable connection, while GTmetrix limited throttling to registered users at the time. — [WPT forum](https://forums.webpagetest.org/t/gtmetrix-makes-my-performance-efforts-seem-irrelevant/10673)
- **Pingdom Website Speed Test:** The input is a URL field plus a "Test from" location selector. The page offers "Enter a URL to test the page load time, analyze it, and find bottlenecks." — [Pingdom Tools](https://tools.pingdom.com/)
- **PageSpeed Insights:** The 2021 redesign moved the Mobile/Desktop switch to the centre of the report. There is no location picker. — [web.dev, Nov 2021](https://web.dev/whats-new-pagespeed-insights)

### Inferences
- GlobalTest's inline "Test 3 countries" button follows the common pattern. Putting the selection count in the button label works like the location counters at LocaBrowser ("0 / 6") and BrowserStack ("15/25"). Those tools also state the cap explicitly, which GlobalTest could do as well.
- GTmetrix's collapsed "defaults summary + Change Options" is a proven way to keep the input step to one line while still showing what will happen. GlobalTest's two option cards (Screenshot vs Screenshot + video) could collapse into a summary line the same way.
- A world map on the homepage is common: GTmetrix uses an animated pulse map and GeoPeeker a dotted map. GlobalTest's clickable-pin map does more than these, because they treat the map as decoration rather than as a picker. This comes from the observed pages and is not a sourced claim.

### Gaps
- I could not see the current WebPageTest start form (simple presets vs advanced tab) because of access blocks.
- I could not see GeoPeeker's location picker after a URL is submitted, because I ran no tests.
- I could not see the testlocal.ly UI directly.
- I found no LambdaTest screenshot-tool UI details from a primary source. Aggregators conflict on whether geolocation is free or paid. — [toolradar](https://toolradar.com/tools/lambdatest)

## (b) Waiting state while a test runs

### Takeaway
I found little documented evidence of how these tools design their waiting states. Two patterns are confirmed:
- **WebPageTest:** shows a text queue position ("Waiting behind N other tests…", "Waiting at the front of the queue...").
- **BrowserStack Screenshots:** shows a per-job counter ("0 of 12 done. 0 timed out. 0 stopped."), thumbnails that fill in as they finish, a Stop control, and an option to email results when they are done.

### Cited Findings
- **WebPageTest queue text:**
  - A forum post shows "Waiting behind 6 other tests…" rising to "Waiting behind 9 other tests…". Staff explained that manual tests get priority over API tests and that paid tests jump the queue.
  - Another thread quotes "Waiting at the front of the queue..." and a JSON field named `behindCount`.
  - These are older forum threads, and the current UI may differ.
  - Sources: [WPT forum: test queue](https://forums.webpagetest.org/t/test-queue/10648); [WPT forum: testInfo](https://forums.webpagetest.org/t/testinfo-on-running-queued-tests/8836); [WPT forum: waiting in queue](https://forums.webpagetest.org/t/waiting-in-test-queue-taking-a-long-time/8210)
- **GTmetrix queue priority is a paid feature:** "Higher queue priority" and "Higher Queue Concurrency" are listed as included in all paid plans. — [GTmetrix Pricing](https://gtmetrix.com/pricing/)
- **GTmetrix timeout:** a test fails if the page takes "longer than 2 minutes to finish loading", and the suggested fix is to "Try testing from a test location closer to your server." — [GTmetrix blog via search](https://gtmetrix.com/blog/gtmetrix-lighthouse-errors/)
- **BrowserStack Screenshots progress UI:**
  - Status line: "0 of 12 done. 0 timed out. 0 stopped."
  - Placeholder: "Thumbnails for your screenshots will be generated here momentarily."
  - There is a Stop control with the message "Processing your Stop request for current session".
  - The FAQ says screenshots can be emailed when finished.
  - Source: [BrowserStack Screenshots](https://www.browserstack.com/screenshots)

### Inferences
- GlobalTest takes 30 to 60 seconds per country, which makes BrowserStack's model the closest match. That model has three parts:
  - a per-location card that switches from pending to done or failed on its own;
  - an overall "N of M done" counter;
  - an option to leave and be notified.
- WebPageTest shows that an honest queue position is acceptable to users, even when it goes up. Staff had to explain why it rose, so a short reason next to the number helps.
- GTmetrix sells queue priority. That points to a possible monetisation lever if GlobalTest ever adds paid plans.

### Gaps
- I did not capture GTmetrix's current in-test screen (step text or progress bar), PSI's loading animation, GeoPeeker's waiting screen or Pingdom's progress UI. Doing so would have required running tests, and the search results did not document them.
- I found no source describing a live filmstrip during a test or an estimated time remaining in any of these tools.

## (c) Results page layout

### Takeaway
Performance tools lead with one headline judgement (a GTmetrix letter grade A to F, a PSI Core Web Vitals pass/fail, or WebPageTest's "Is it Quick / Usable / Resilient?" cards). Below that come key metrics, then a filmstrip or video, then tabs for waterfall, history and audits. Geo-screenshot tools are simpler: a side-by-side grid of screenshots by location. GeoPeeker adds watermarks on the free tier and HTML source capture on Pro.

### Cited Findings
- **GTmetrix report:**
  - The Grade (A to F) is weighted from the Performance Score (60%) and the Structure Score (40%).
  - Web Vitals (LCP, TBT, CLS) appear "front and center".
  - The Summary tab opens with a "Speed Visualization", an intervaled capture of the page load with flags marking each metric. Below it are "Top Issues", a "Page Details" chart of request types, and "More from GTmetrix" tips tailored to the platform (WordPress, Shopify).
  - Other tabs are Performance, Structure, CrUX, Waterfall, Video (requires the Video analysis option), History (graphs) and Alerts.
  - Source: [GTmetrix blog](https://gtmetrix.com/blog/everything-you-need-to-know-about-the-new-gtmetrix-report-powered-by-lighthouse/)
- **WebPageTest results:**
  - The header shows the configuration and editable Labels, with a page screenshot on the right.
  - Three cards ask "Is it Quick?", "Is it Usable?" and "Is it Resilient?".
  - Key metrics, a filmstrip and CrUX real-world metrics follow, then Lighthouse scores.
  - Tabs: Filmstrip, Waterfall, Lighthouse, Carbon Control, Opportunities, Experiments ("Run Experiments" re-runs the test with the fixes applied), Assets and Javascript.
  - Compare: pick 2 to 4 tests in Test History and click "Compare Tests".
  - Source: [Catchpoint WPT docs](https://docs.catchpoint.com/wpt/docs/interpreting-instant-test-results.md)
- **WebPageTest comparisons depend on video capture.** Video is needed for Speed Index and the filmstrip. — [Using WebPageTest ch.4 (O'Reilly, older)](https://oreilly.com/library/view/using-webpagetest/9781491902783/ch04.html)
- **PageSpeed Insights (redesign of 2021, still the base layout):**
  - Field data sits at the top, with Core Web Vitals pass/fail as its own subsection with an icon. Origin data has its own tab.
  - Each card has metadata: collection period, devices and sample size.
  - Lab data has the screenshot and the loading-sequence thumbnails.
  - Source: [web.dev](https://web.dev/whats-new-pagespeed-insights)
- **Pingdom results:**
  - A 0 to 100 score with a letter grade, an "Improve page performance" section, a waterfall colour-coded by request phase (DNS, SSL, Connect, Send, Wait, Receive, Blocked), content-type icons and HTTP status dots.
  - Sources are secondary and partly older. The grade was described in 2016 as based on Google Page Speed and elsewhere as based on YSlow.
  - Sources: [Pingdom Tools](https://tools.pingdom.com/); [SupportHost](https://supporthost.com/pingdom/); [archived 2016 page](https://web-archive.nli.org.il/National_Library/20161114105157mp_/http://tools.pingdom.com/fpt)
- **GeoPeeker results:**
  - Screenshots are shown "side by side" for comparison.
  - Free Peeks are watermarked. Pro adds "HTML Source Capture".
  - Its SiteSeeker monitoring takes "a Peek of the error" from the failing location, and paid plans include "before/after Peeks".
  - Sources: [GeoPeeker](https://geopeeker.com/); [GeoPeeker Pricing](https://geopeeker.com/pricing)
- **TestLocally:** "Loads full screenshots of your website", with "View & save image results". — [WonderNetwork](https://wondernetwork.com/testlocally)
- **BrowserStack Screenshots:** a thumbnail grid with a "Created on:" date, a Share control, a ZIP download, and a "Back to current session" link from history. — [BrowserStack Screenshots](https://www.browserstack.com/screenshots)

### Inferences
- GlobalTest shows load time per country but has no single verdict. A headline status per country would match the "one judgement first" pattern; options include pass/fail or a fast/ok/slow colour, along with a rollup such as "Loaded in 3/3 countries, slowest: India 4.2s".
- No geo-screenshot tool I found pairs per-country screenshots with load times and a scroll video. GeoPeeker and TestLocally show screenshots only. This looks like a differentiator for GlobalTest, but the competitor coverage behind it is limited.
- Watermarking free output, as GeoPeeker does, is a known approach. It conflicts with GlobalTest's "free" positioning, but it would put the brand on screenshots people share.

### Gaps
- I could not see a live GeoPeeker results page to check grid layout, enlarge behaviour or per-location metadata.
- I could not confirm whether PSI's current (2024-2026) layout has changed since the 2021 redesign post.

## Retention and growth features: shareable URLs, history, re-test, comparison, monitoring, gates

### Takeaway
Every tool gives away a one-off test and charges for repeat use over time:
- monitoring and alerts;
- longer history retention;
- more locations;
- higher queue priority.

GeoPeeker is the closest analogue. It offers free Quick Peeks with no account and 6 locations, then a free account with 1 uptime monitor and 30-day retention. Its 30-day Solo trial needs no card. GTmetrix moved to stricter account gating in 2023-2024, which drew Trustpilot backlash.

### Cited Findings
- **GeoPeeker Free plan ($0):**
  - 5 Quick Peeks per hour, 1 Basic Site Profile and 6 geo-locations.
  - 30-day Peek retention, with watermarked Peeks.
  - 1 uptime monitor checked every 5 minutes, email notifications and limited API access.
  - Source: [GeoPeeker Pricing](https://geopeeker.com/pricing)
- **GeoPeeker paid plans:**
  - Solo is $12/mo on a launch promo (regular $19). It has 20 Peeks per hour, 3 Peek Paths, 3 Auto Peeks, 12 locations and 60-day retention. It adds DNS change tracking and SMS alerts.
  - Pro is $25/mo and Team is $79/mo.
  - "Try Solo free for 30 days. No card needed". When the trial ends, the account "moves to Free… One uptime monitor keeps running."
  - Source: [GeoPeeker Pricing](https://geopeeker.com/pricing)
- **GeoPeeker monitoring features:**
  - SiteSeeker checks "every minute from locations you pick" and Peeks the error.
  - DNSKeeper logs DNS changes and sends a notification plus a Peek.
  - Source: [GeoPeeker](https://geopeeker.com/)
- **GeoPeeker on Product Hunt:** the listing says 12 server locations and an API. It had "No reviews yet". Comments praised checking GST pricing from Australia and spotting slow loads in California. — [Product Hunt](https://www.producthunt.com/products/geopeeker)
- **GTmetrix paid plans:**
  - Lite is $4.99/mo with 50 tests, 1 monitored slot, 5 locations and 1-month retention.
  - Core is $9.99 with 150 tests, 3 slots, 10 locations and 6 months' retention.
  - Advanced is $24.99 with unlimited tests under fair use, 10 slots, 28 locations and hourly monitoring.
  - Expert is $49.99 with 50 slots, 12 months' retention and 5 seats.
  - Every paid plan includes a full-report PDF, history notes, video capture for alerts, bulk testing and export, and higher queue priority.
  - Re-tests run from a report count as on-demand tests.
  - Source: [GTmetrix Pricing](https://gtmetrix.com/pricing/)
- **GTmetrix positioning:** the homepage frames the product as "1. Test 2. Monitor 3. Collaborate 4. Integrate with AI" and promotes an MCP server for AI agents. — [GTmetrix](https://gtmetrix.com/)
- **GTmetrix free-tier backlash:**
  - Trustpilot reviewers (late 2023 to 2024) said you "MUST get an account" to see results and were then capped at 5 tests. — [Trustpilot](https://au.trustpilot.com/review/gtmetrix.com)
  - A blogger who switched to SpeedVitals says GTmetrix reverted the non-renewing 5-test limit to 5 tests a month. — [linuxblog.io](https://linuxblog.io/gtmetrix-made-me-switch-to-speedvitals/)
  - DreamHost says free tests are 5 per month, data is kept 1 week, and free on-demand testing lasts 6 months. Freetier.co says the limit applies for 3 months. — [DreamHost](https://www.dreamhost.com/blog/gtmetrix/); [freetier.co](https://freetier.co/directory/products/gtmetrix). The sources conflict.
- **WebPageTest free tier:**
  - LogicMonitor and FitGap say the free Starter plan has 150 test runs per month, while TrustRadius says 300. These are third-party sources and they conflict.
  - LogicMonitor says a single test needs no account but continued use does. An anecdotal AlternativeTo comment says guests get 3 free runs.
  - A 5-run test with Repeat View counts as 10 runs.
  - Sources: [LogicMonitor](https://www.logicmonitor.com/webpagetest); [TrustRadius](https://www.trustradius.com/compare-products/catchpoint-vs-catchpoint-webpagetest); [AlternativeTo](https://alternativeto.net/software/webpagetest/about/)
- **WebPageTest retention features:** Test History with "Compare Tests" (2 to 4 tests), Labels on tests, and Experiments that re-run with fixes applied. — [Catchpoint WPT docs](https://docs.catchpoint.com/wpt/docs/interpreting-instant-test-results.md)
- **Pingdom:**
  - The free speed test has "Share result" (social) and HAR download, plus a History tab charting load over time. These details come from secondary sources and a 2016 archive.
  - The current page has a "Start Your Free Trial" monitoring banner ("The internet is fragile. Be the first to know when your site is in danger.").
  - Sources: [Pingdom Tools](https://tools.pingdom.com/); [SupportHost](https://supporthost.com/pingdom/); [archive 2016](https://web-archive.nli.org.il/National_Library/20161114105157mp_/http://tools.pingdom.com/fpt)
- **TestLocally:** "Sign up with your team and track your history", and "Results are saved for six months." — [WonderNetwork](https://wondernetwork.com/testlocally)
- **BrowserStack Screenshots:** Share link, ZIP export, email-when-done, session history and a parallel-session upsell ("Please Upgrade to add more parallel sessions"). — [BrowserStack Screenshots](https://www.browserstack.com/screenshots)
- **Other geo-screenshot competitors found:**
  - Site-Shot: 44 country IPs as of July 2026. The free no-signup tool captures from the US only, and geotargeting is paid. — [Site-Shot blog](https://www.site-shot.com/blog/screenshot-website-from-another-country/)
  - localscreenshot: 227 countries, a "signed technical attestation" of the country, and automatic removal of cookie banners and pop-ups. — [mcpservers.org listing](https://mcpservers.org/servers/docs-localscreenshot-com-overview)
  - Stillio: scheduled screenshots with country IPs. — [Stillio](https://www.stillio.com/blog/capture-screenshots-different-countries)
  - GeoScreenshot: API-first. — [Jentic](https://jentic.com/apis/geoscreenshot)

### Inferences
- The most-copied path from free use to retention among geo tools works like this:
  - a free one-off check with no account;
  - a free account that keeps one monitor or schedule running and stores history (30 days at GeoPeeker, 6 months at TestLocally);
  - alerts that include a screenshot from the failing location.
- For GlobalTest, the strongest return hooks would be:
  - permanent shareable result URLs;
  - "re-test this URL", ideally with a before/after comparison against the previous run;
  - an optional email for "notify me when done" or "weekly re-check".
- GTmetrix's backlash suggests that forcing sign-up before showing results hurts goodwill. Asking for an email after results are shown is likely lower-risk. This is an inference from reviews, not a measured result.

### Gaps
- I found no reliable data on whether GeoPeeker, GTmetrix or PSI result URLs are permanent or public by default. Only BrowserStack and Pingdom (older) mention a share control.
- I could not reach Reddit threads directly, so search returned no Reddit results. Praise and complaint evidence comes from Trustpilot, blogs and forums. The DebugBear comparison, which says GTmetrix results are more trustworthy than PSI's, was written by a competitor. — [DebugBear](https://debugbear.com/software/gtmetrix-vs-pagespeed-insights-vs-webpagetest)
- I found no G2 or Capterra review text specifically about GeoPeeker, LocaBrowser or TestLocally. These tools have few reviews.
