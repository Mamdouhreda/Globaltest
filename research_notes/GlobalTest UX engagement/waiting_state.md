# Waiting-State UX for 30-60+ Second Waits (GlobalTest result cards)

Context: each country result takes about 30-60 s (cold-starting container + Chrome). Today each card shows a progress bar with "Xs · usually under a minute".

## 1. What does research say about wait-time tolerance and abandonment?

### Takeaway
Waits of 30-60 s are far past the 10 s attention limit, so without feedback users drift or leave. Feedback greatly extends tolerance, and *showing the actual work being done* (labor illusion / operational transparency) is the strongest evidence-backed lever. Buell & Norton found that at 30 s and 60 s a majority preferred a transparent waiting site over an instant one, while a plain progress bar lost to instant, badly at 60 s. Even transparency's benefit declines after ~30 s, so shortening and staging the wait still matters.

### Cited Findings
- **Nielsen limits (1993, *Usability Engineering* ch. 5; updated 2014):** 0.1 s ≈ feels instantaneous; 1.0 s ≈ limit for uninterrupted flow of thought; 10 s ≈ "limit for keeping the user's attention focused on the dialogue". Beyond 10 s users switch to other tasks and must "reorient themselves" on return. "Anything slower than 10 seconds needs a percent-done indicator" plus a clear way to interrupt. — [NN/g, Response Times: The 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/)
- **Myers (CHI 1985):** cited by NN/g for the rule of thumb that "percent-done progress indicators should be used for operations taking more than about 10 seconds". Progress indicators reassure users, show roughly how long to wait, and give them something to look at. — [NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/). The paper's abstract says one experiment "demonstrates that people prefer to have progress indicators". A second part, on constant vs variable response time, was not statistically significant. — [Myers 1985 PDF, CMU](https://www.cs.cmu.edu/~bam/papers/percentdoneCHI85.pdf) (summary via search results; the PDF is a scanned image I could not text-extract). An "86% preferred" figure circulates online, but I could not verify it.
- **NN/g progress-indicator guidance:** progress indicator for anything over ~1 s; looped (spinner) animation for 2-10 s; percent-done for 10 s or more; "Looped animation is not recommended beyond 10 seconds." Users shown a moving progress bar were willing to wait on average **3x longer** than users with no indicator (University of Nebraska-Lincoln study, year not given by NN/g). — [NN/g, Progress Indicators Make a Slow System Less Insufferable](https://www.nngroup.com/articles/progress-indicators/)
- **Nah (2004), *Behaviour & Information Technology* 23(3):153-163:** tolerable waiting time for web information retrieval is about **2 s** without feedback; "the presence of feedback prolongs Web users' tolerable waiting time". — [SMU repository abstract](https://ink.library.smu.edu.sg/sis_research/9983). A secondary site claims feedback raised tolerance to an average of 38 s. Unverified against the paper.
- **Buell & Norton (2011), "The Labor Illusion", *Management Science* 57(9):1564-1579.** All numbers below are from my text extraction of the paper PDF — [HBS PDF](https://www.hbs.edu/ris/Publication%20Files/Norton_Michael_The%20labor%20illusion%20How%20operational_f4269b70-3732-4fc4-8113-72d0c47533e0.pdf):
  - Exp. 1 (travel search): 2 (transparent vs blind) × 6 (10, 20, 30, 40, 50, 60 s) design plus an instant condition. In the **transparent** condition, the screen showed a running tally of the airlines and sites being searched and the itineraries compiled. In the **blind** condition, a progress bar "gradually filled at a uniform rate". Perceived value trended down as wait time rose (main effect of wait, p<0.01), but transparency raised value. The paper notes "the positive benefits of transparency began to decline after 30 seconds".
  - Exp. 2 (choice between two sites returning identical results; one instant, one waiting 30 or 60 s): % choosing the **waiting** site was **62% at 30 s and 63% at 60 s with transparency**, vs **42% at 30 s and 23% at 60 s blind** (progress bar only).
  - Exp. 3: merely telling people a list of sites up front, without showing the work as it happens, did not produce the same benefit as live transparency at 30 s.
  - Exp. 5 (online dating): with **unfavorable outcomes** at 30 s, the transparent condition was valued *less* than instant service (M=2.10 vs 3.24). The labor illusion backfires when the result disappoints. Transparency's benefit began declining at 15 s here.
  - The authors' recommendation: supplement "nondescript, noninformative progress bars with interfaces that provide a running tally of the tasks being undertaken".
- **Buell, Kim & Tsay (2017), *Management Science* 63(6):1673-1695:** a field experiment on operational transparency in food service. When customers and chefs could see each other, customer-reported quality rose **22.2%**, throughput time fell to **80.8%** of baseline (−19.2%), and perceived value rose **18.5%**. — [PDF via Harvard DASH](https://dash.harvard.edu/server/api/core/bitstreams/7312037d-8844-6bd4-e053-0100007fdf3b/content); [IDEAS listing](https://ideas.repec.org/p/hbs/wpaper/14-034.html)
- **Maister (1985), "The Psychology of Waiting Lines":** among his propositions, "uncertain waits seem longer than known, finite waits" and "unexplained waits seem longer than explained waits". — [davidmaister.com](https://davidmaister.com/blog/201/The-Psychology-of-Waiting-Lines.html)
- **Hui & Tse (1996), *Journal of Marketing* 60(2):81-90:** neither waiting-duration nor queue information mattered in short waits. Duration information had the larger effect in intermediate waits, and queue information the larger effect in long waits. Information worked through wait *acceptability* and *affect*, not perceived duration. — [HKU repository](https://hub.hku.hk/handle/10722/177855) (abstract only)
- **Google / Think with Google (2017-18):** as mobile page load goes from 1 s to 10 s, bounce probability rises 123% (relative). This is about page loads, not tool waits, so it is only loosely relevant. — [Think with Google](https://thinkwithgoogle.com/data/mobile-page-speed-new-industry-benchmarks-load-time)

### Inferences
- The current "Xs · usually under a minute" bar is effectively the Buell & Norton **blind** condition, which at 60 s lost to instant service in 77% of choices. Replacing or supplementing it with live, specific steps ("Starting Chrome in Frankfurt… → Loading cnn.com… → Capturing screenshot…") is the closest evidence-based match to the transparent condition, which held ~62% preference at both 30 and 60 s.
- GlobalTest's steps are *real* work (container cold start, page load, capture), so this is genuine operational transparency, not a fabricated labor illusion. That keeps it on the ethical side.
- Exp. 5 suggests that a failed test (timeouts, blocked sites) after a long transparent wait may feel worse. Failure states need extra care, such as a clear explanation and a fast retry.

### Gaps
- No study found that measures abandonment specifically for 30-60 s waits in free web tools.
- I could not verify Myers's exact preference percentage or the Nebraska study's year.

## 2. Which progress patterns work best for long, uncertain waits?

### Takeaway
For waits over 10 s, use determinate or stepped progress with real stage labels rather than a spinner. Avoid pauses and slowdowns near the end, since the end of a wait dominates how it is remembered. Show results incrementally as each country finishes. Skeleton screens are meant for short (<10 s) full-page loads and are not a fix for 30-60 s process waits.

### Cited Findings
- **Harrison, Amento, Kuznetsov & Bell, "Rethinking the Progress Bar" (UIST 2007):** 22 participants and 9 progress functions, all exactly 5.5 s long. Three findings: (1) bars with **pauses were perceived as taking longer**; (2) **accelerating progress was strongly favored**; (3) both effects were "exaggerated … when located towards the end of the process", consistent with peak-and-end effects. Design suggestions: cache progress early to absorb later stalls, and "downplay progress in the beginning and accelerate towards the end". Users "are most willing to tolerate negative progress behaviors" early. — [Paper PDF](https://chrisharrison.net/projects/progressbars/ProgBarHarrison.pdf); [project page](https://www.chrisharrison.net/index.php/Research/ProgressBars)
- **Harrison, Yeo & Hudson, "Faster Progress Bars" (CHI 2010, Best Paper Honorable Mention):** 20 participants compared pulsating and ribbed bars, and a further 10 did duration matching at 5 s and 15 s. Backwards-moving, decelerating ribbing performed best. A 5 s solid bar felt equivalent to a 5.61 s ribbed bar (12.2%), and at 15 s the ribbed bar converged to ~16.75 s. Overall the ribbed bar made processes "appear **11% faster**". — [Paper PDF](https://www.chrisharrison.net/projects/progressbars2/ProgressBarsHarrison.pdf); [project page](https://chrisharrison.net/index.php/Research/ProgressBars2)
- **NN/g:** for long waits, show an estimated remaining time but keep it general and generous, since an inaccurate estimate hurts credibility. Consider showing *steps* rather than a percentage. Avoid static "Loading…" text, which leaves users unable to tell whether the system is stuck. Give a way to stop. — [NN/g Progress Indicators](https://www.nngroup.com/articles/progress-indicators/)
- **NN/g on skeleton screens:** use them only for full-page loads under 10 s. They are not for process waits like downloads, uploads or conversions, which should use a progress bar. Progress bars are recommended above 10 s, and waits over 10 s "need an explicit duration estimate". The article cites Mejtoft, Långström & Söderström (2018, ECCE) without summarizing it. — [NN/g Skeleton Screens 101](https://www.nngroup.com/articles/skeleton-screens/)
- **Hui & Tse (1996):** for long waits, queue or position information outperformed duration information. — [HKU](https://hub.hku.hk/handle/10722/177855)
- **Streaming partial results in products:** OpenAI's image API emits `partial_image` events (1-3 previews) so apps can show progressively refined images instead of a percentage, as ChatGPT does. — [OpenAI streaming events](https://developers.openai.com/api/reference/resources/images/generation-streaming-events); [OpenAI community thread](https://community.openai.com/t/how-can-i-get-the-progress-percentage-of-image-generation-with-the-openai-image-api/1303151). fal.ai streams per-step diffusion previews over SSE. — [fal.ai docs](https://docs.fal.ai/documentation/development/streaming)

### Inferences
- Per-card **stage list** with real backend events works well here: Queued → Starting browser in {city} → Loading {domain} → Capturing screenshot → (Recording scroll video) → Done. Each stage is a checkpoint that resets attention and serves as truthful labor evidence.
- The bar should front-load progress (for example, jump to a visible amount as soon as the container is requested) and **never stall near the end**. If the capture step is unpredictable, hold the bar around 70-85% with a stage label rather than creeping at 95-99%. This follows Harrison's end-effect finding and the survey results under Question 4.
- The time copy should be generous ("usually 30-60 s") so most runs finish "early". An elapsed counter alone, with no stage change, is the blind condition.
- Each country card should resolve independently and immediately: streaming partial results gives the user something to inspect at the first ~30 s mark. Order or animate the first-finished card so it is noticed.
- A skeleton of the *result card* layout (screenshot frame, load-time slot) is fine as framing, but it should not be the only progress signal for a 30-60 s wait.

### Gaps
- All of Harrison's studies used 5-15 s bars. Scaling to 30-60 s is assumed but untested.
- No primary study was found that directly compares step lists against percent bars for 30-60 s waits.

## 3. What can you show or do while waiting that adds value?

### Takeaway
Explaining what is happening, and why (cold start in a real data center), is backed by Maister (explained waits feel shorter) and Buell & Norton (live transparency). Beyond that, letting people leave and come back (tab title or favicon status, optional notification) is common practice in deploy and CI tools. Primary research on maps, tips or example-browsing during waits is thin.

### Cited Findings
- Unexplained waits feel longer than explained ones, and a stated reason makes people more patient. — [Maister 1985](https://davidmaister.com/blog/201/The-Psychology-of-Waiting-Lines.html)
- The labor illusion requires the work to be *visible as it happens*. Telling users the list of sites in advance did not match live transparency. — [Buell & Norton 2011](https://www.hbs.edu/ris/Publication%20Files/Norton_Michael_The%20labor%20illusion%20How%20operational_f4269b70-3732-4fc4-8113-72d0c47533e0.pdf)
- Beyond 10 s, users switch to other tasks. Design for them leaving and returning (reorientation). — [NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/)
- Deploy tools: Netlify streams deploy logs closer to real time, with sections for build image, dependency caching, build output and final status, plus linkable log lines (changelog, April 2026). — [Netlify changelog](https://www.netlify.com/changelog/2026-04-06-deploy-logs-streaming-is-now-faster/). Vercel build logs show each step (install, build, page generation) as a clear section, so a failure points to the right phase. — [Vercel Academy: Logs](https://vercel.com/academy/vercel-foundations/logs)
- A third-party design analysis of Vercel argues that deploy status should be visible without switching tabs, for example through favicon and page title, with a queued → building → ready timeline. This is a secondary, single-author source. — [blakecrosley.com guide](https://blakecrosley.com/de/guides/design/vercel)
- WebPageTest shows queue position text ("Waiting behind 6 other tests…") while a test is queued. Users on its forums report confusion when the number rises because of priority rules. — [WebPageTest forums](https://forums.webpagetest.org/t/waiting-in-test-queue-taking-a-long-time/8210); [forum thread](https://forums.webpagetest.org/t/testinfo-on-running-queued-tests/8836)
- **Browser notifications:** browsers throttle permission prompts, and a denial is effectively permanent. Common practice is a "soft" in-page explainer before the native prompt, triggered by a user action rather than on page load. Firefox and Safari require a user gesture. These are vendor and industry sources, not research. — [Braze docs](https://www.braze.com/docs/developer_guide/push_notifications/soft_push_prompts/?sdktab=web); [OneSignal](https://onesignal.com/blog/onesignal-webinars-browser-changes-web-push-notifications/)

### Inferences
- Add a one-line "why" under the stage list, for example: "We're starting a real Chrome browser in a data center in Frankfurt. The first start takes ~30 s." This both explains the wait and creates labor-illusion evidence.
- Highlight the active test locations on the existing world map (a pulsing pin while running, a solid one when done). This is a natural, truthful visualization of the work. No direct study validates maps, so treat it as an inference from operational transparency.
- Update `document.title` and favicon with progress (for example "(2/3 done) GlobalTest") and play a subtle completion cue. This covers tab-switchers, who per NN/g are the majority beyond 10 s. Offer browser notifications only as an opt-in button ("Notify me when done"), never as an auto-prompt.
- Example results and the written guide can sit below the running cards as optional content, but avoid anything that hides the cards or the first result when it lands.

### Gaps
- I found no primary research quantifying the engagement or retention effect of tab title or favicon changes, in-wait tips, or showing a map during waits.
- I found no NN/g or Baymard article specifically on notify-when-done patterns.

## 4. Negative findings: skeletons that don't help, fake progress backfiring

### Takeaway
Skeleton screens have mixed and sometimes negative results. Constant progress bars do not reliably reduce abandonment, and bars that start slow *increase* drop-off. Transparency can backfire when the outcome is poor. "Benevolent deception" in progress bars is defensible only when users would prefer it and it measurably helps.

### Cited Findings
- **Viget (2017), 136 participants, mobile test:** the skeleton screen performed worst on every metric. Perceived wait was **2.82 s** for skeleton, 2.41 s for spinner and 2.29 s for blank. 59% agreed "loaded quickly" with skeleton, vs 74% with spinner and 66% with blank. The authors conclude skeletons are "not a silver bullet". — [Viget, A Bone to Pick with Skeleton Screens](https://viget.com/articles/a-bone-to-pick-with-skeleton-screens)
- Contrasting result: a Brazilian IHC study (21 participants, fixed 5 s wait, six loading techniques) found skeleton screens rated best for perceived speed and blank pages worst. Cyclic (indeterminate) techniques outperformed determinate ones at 5 s, and combining techniques did not help. Year not confirmed. — [SBC IHC paper](https://sol.sbc.org.br/index.php/ihc_estendido/article/view/37767)
- **Villar, Callegaro & Yang (2013), *Social Science Computer Review* 31:744-762, meta-analysis of 32 experiments:** a constant progress indicator did *not* significantly reduce drop-off. **Fast-to-slow** indicators *reduced* drop-off, and **slow-to-fast** indicators *increased* it. Where a small incentive was promised, a constant indicator increased drop-off. — [Google Research page](https://research.google/pubs/where-am-i-a-meta-analysis-of-experiments-on-the-effects-of-progress-indicators-for-web-surveys/)
- **Conrad, Couper, Tourangeau, Peytchev & Banks (2003, conference version):** "It's what's up front that counts". When initial progress was slow, respondents broke off at higher rates. — [RTI](https://rti.org/publication/effectiveness-progress-indicators-web-surveys-front-counts)
- **Conflict to note:** Harrison 2007 found slow-start, accelerate-at-end bars *perceived* as faster (5.5 s, perception only), while the survey literature found slow-start bars *increase abandonment* in multi-minute tasks. The two can be reconciled: early visible progress keeps people from quitting, and avoiding end-stalls improves the remembered experience. — [Harrison 2007](https://chrisharrison.net/projects/progressbars/ProgBarHarrison.pdf); [Villar et al. 2013](https://research.google/pubs/where-am-i-a-meta-analysis-of-experiments-on-the-effects-of-progress-indicators-for-web-surveys/)
- **Labor illusion backfire:** with unfavorable outcomes, a transparent 30 s wait was valued lower than instant service. Value perceptions also generally fall as waits lengthen. — [Buell & Norton 2011](https://www.hbs.edu/ris/Publication%20Files/Norton_Michael_The%20labor%20illusion%20How%20operational_f4269b70-3732-4fc4-8113-72d0c47533e0.pdf)
- **Adar, Tan & Teevan, "Benevolent Deception in HCI" (CHI 2013):** this frames deceptive design, such as smoothed or fake progress, as needing justification. As reported by The Atlantic, Adar's ground rules are to prefer non-deceptive solutions, to deceive only when it measurably improves the product, and only when users would prefer it if asked. TurboTax's preset animated progress is the cited example. — [Microsoft Research](https://www.microsoft.com/en-us/research/?p=164609); [Atlantic piece (mirror)](https://voussoir.net/writing/advertixing/atlantic_fake_progressbars.html)
- **NN/g:** inaccurate time estimates hurt credibility. — [NN/g](https://www.nngroup.com/articles/progress-indicators/)

### Inferences
- Keep stage labels truthful and driven by backend events. Smoothing the bar *between* real checkpoints is acceptable, but fabricated stages or a bar that ignores reality risks credibility, especially for a testing tool whose value is accuracy.
- A strong early jump (fast-to-slow at the start) protects against abandonment. Being honest near the end avoids the 99%-stall that Harrison shows is most damaging.

### Gaps
- I found no rigorous public A/B data from a product showing fake progress backfiring on retention. The evidence is lab or survey based.
- I could not access the full Mejtoft et al. (2018) skeleton paper.

## 5. What do real products do for 30-60 s waits?

### Takeaway
Long-wait products converge on: live, sectioned step logs (CI and deploy tools), queue position (WebPageTest), progressive previews (AI image generation), and status visible outside the tab. I found no published A/B results from these companies, so this is pattern evidence, not outcome evidence.

### Cited Findings
- Netlify: real-time streaming deploy logs, sections per phase, final status, linkable lines (April 2026). — [Netlify changelog](https://www.netlify.com/changelog/2026-04-06-deploy-logs-streaming-is-now-faster/)
- Vercel: build logs sectioned by step (install → build → page generation), so failures are localized. — [Vercel Academy](https://vercel.com/academy/vercel-foundations/logs)
- WebPageTest: status codes 100 started, 101 queued, 200 complete, and a UI that says "Waiting behind N other tests…". Users complain when N rises without explanation. Per-location queue counts were a roadmap item. — [WebPageTest forums](https://forums.webpagetest.org/t/testinfo-on-running-queued-tests/8836); [Catchpoint WPT docs](https://docs.catchpoint.com/wptpro/docs/webpageteststarter)
- ChatGPT / OpenAI images: progressive partial-image previews instead of a percentage. The ChatGPT app reportedly shows a periodically refreshed image with an opacity progress effect. — [OpenAI community](https://community.openai.com/t/gpt-image-1-image-progression-status-like-in-the-app/1249660); [OpenAI API reference](https://developers.openai.com/api/reference/resources/images/generation-streaming-events)
- Travel search (the Kayak-style "searching airline X…" pattern) is the archetype Buell & Norton modeled. — [Buell & Norton 2011](https://www.hbs.edu/ris/Publication%20Files/Norton_Michael_The%20labor%20illusion%20How%20operational_f4269b70-3732-4fc4-8113-72d0c47533e0.pdf)

### Inferences
- GlobalTest's closest analogues are WebPageTest (same domain) and CI/deploy tools (stage logs). Combining a per-country stage list, the map pin, title/favicon status and immediate per-card reveal reflects the converged industry pattern and the strongest research (operational transparency plus avoiding end-stalls).
- A speed-test-style live visualization (for example, the page's load waterfall or the first paint appearing) could serve as a "partial result" analogous to AI image previews, if the backend can stream an early screenshot or first-paint frame.

### Gaps
- Speedtest.net, GTmetrix, Midjourney and GitHub Actions waiting UX: no authoritative design write-ups found in this pass.
- No company-published metrics linking these patterns to completion or retention were found.
