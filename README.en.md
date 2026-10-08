# Jipgyeol (집결)

> Take a photo of a problem in your home, and AI recognizes it and connects you to the home-repair support programs you may qualify for, all the way to counseling

[한국어](README.md)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23088350.svg)](https://doi.org/10.5281/zenodo.23088350)

A project by **Wolgyedonghaeng** (Team 9), 2026 Kwangwoon University KW Hackathon.

- Topic area: Barrier-free and everyday convenience
- Last updated: October 8, 2026 (program data as of October 6, 2026; income thresholds based on the 2026 standard median income)
- Status: **MVP complete and deployed** (web, Android, and iOS from one codebase; no resident evaluation has been run yet)

Results are guidance on programs you "may qualify for"; the app does not determine eligibility.

---

## At a glance

**One photo is all it takes.** If water is leaking from your bathroom ceiling, just take a picture of it. Jipgyeol recognizes the problem and, using a few simple questions and building-register data, finds the Seoul, Nowon-gu, and national home-repair programs you may qualify for, then summarizes everything on a card you can take to counseling.

```
1. Snap  →  2. Confirm  →  3. Receive
```

| Step | What the resident does | What Jipgyeol does |
|---|---|---|
| 1. Snap | Takes a photo of the problem | AI identifies the problem type (leak, mold, and so on) |
| 2. Confirm | Answers "Is this a leak?" and a few simple questions | Looks up the building's age from the building register automatically |
| 3. Receive | Gets the matching support programs and a counseling prep card | Points to where to go for counseling |

Example: A 72-year-old homeowner in a detached house takes a photo of the bathroom ceiling, answers "Is this a leak?" and two or three questions, then receives the home-repair programs that may apply (for example, Housing Benefit Repair and Maintenance or Hope Home Repair) and a counseling prep card to bring to the Wolgye 1-dong community service center.

---

## Why

Nowon-gu is one of the Seoul districts with a high concentration of aging houses ([Seoul Shinmun, Dec 29, 2025](https://go.seoul.co.kr/news/newsView.php?id=20251229020004)), and Wolgye 1-dong has many older residents and old houses. Old houses bring both everyday discomfort and safety risks: leaks, mold, drafty windows, door sills, and slippery bathrooms. Yet residents often miss out on available support because:

- **They do not know which programs exist.** Home-repair support is spread across the national government, the Seoul Metropolitan Government, Nowon-gu, and public agencies, each with different names, conditions, and application periods.
- **They cannot easily tell whether they qualify.** Income thresholds are based not on wages but on "recognized income", which converts assets into income, so residents cannot calculate it themselves. Housing-benefit status, building age, and ownership or tenancy must also be checked in each announcement, and some programs exclude recipients of other programs.
- **Search does not match how they think.** Existing services ask users to search by program name or category. Residents know the problem ("water is leaking from the bathroom ceiling"), not the program name.
- **Digital access is hard.** Older residents in particular struggle to collect and compare information across several websites.

## Who it is for

| User | Need |
|---|---|
| Residents of aging houses (especially older adults and people with limited digital skills) | Find support they can receive from the problem alone, without knowing program names |
| Helpers (family members, neighborhood representatives, neighbors) | Check quickly on a resident's behalf and help prepare for counseling |
| Counselors at the community service center | Receive residents who already have the needed information organized, shortening counseling time |

## How it works

Jipgyeol starts from **the problem in the home**, not from a policy name. Residents see three steps (1. Snap, 2. Confirm, 3. Receive), and the following happens behind them:

```
1. Snap: take a photo → AI classifies the problem type
2. Confirm: confirm the AI result + simple questions (housing data looked up automatically)
3. Receive: match support programs → counseling prep card → guidance to counseling and application
```

### 1. Snap

- When a resident photographs the part of the house that needs repair, AI assigns it to one of a fixed set of problem types, such as leak, mold, window draft/insulation, heating, or safety (door sills, grab bars, slippery floors).
- The type becomes a search keyword for finding support programs.

### 2. Confirm

- The app shows the AI's judgment ("This looks like a leak. Is that right?") and lets the resident confirm it or choose a different type. If the AI is not confident, the app suggests counseling first.
- The resident then answers a few simple household questions. Income is chosen from amount-range buttons that match the household size, never typed as an exact amount.
- The address is found from the phone's location (GPS) and confirmed with "Is this the right address?"; if location is unavailable, the resident types a road address.
- Building age and approval date come from the public building register, so the resident does not need to enter them. If the lookup fails, the app says the year will be checked at counseling.

| Question | What it tells us |
|---|---|
| "How many people live together?" | Household size; the income ranges below are shown for that size |
| "About how much does your family earn per month in total?" (4 buttons) | Ranges cut at 48%, 60%, and 100% of the standard median income. Example for a 1-person household: up to 1.23M won, 1.23 to 1.54M, 1.54 to 2.56M, and over 2.56M |
| "Do you receive the housing benefit?" (only when income is at or below 48%) | Owner-occupiers who receive it are guided to Repair and Maintenance and excluded from other repair programs |
| "What kind of home do you live in?" | Owned, jeonse or monthly rent, or public rental |
| "Tap everything that applies" | A member aged 65+, a member with a disability, basic livelihood or near-poverty status |

Every question has an "I'm not sure" option; choosing it still shows the programs but adds "income criteria including assets to be checked at counseling" to the prep card. Bracket amounts and per-program income criteria are listed in [docs/support-programs-research-2026.md](docs/support-programs-research-2026.md) (Korean).

### 3. Receive

- The app matches support programs using a problem-type keyword mapping table and a synonym dictionary (for example, grouping "dripping", "leak", and "ceiling stain" as the same problem).
- What is confirmed and what still needs checking are summarized on a one-page counseling prep card.
- The app guides the resident to the Wolgye 1-dong community service center or the relevant agency for counseling and application.

## Programs we connect to (14, as of 2026)

Program data lives in [server/data/programs-2026.json](server/data/programs-2026.json) with sources and a reference date (2026-10-06), and the app shows only these values. Eligibility is decided by code rules (`server/services/matcher.py`); the AI only orders and explains the programs that remain as candidates.

| Operator | Programs |
|---|---|
| National | Housing Benefit Repair and Maintenance, Energy Efficiency Improvement for Low-Income Households, Green Remodeling Interest Support for Private Buildings |
| Seoul | Hope Home Repair, Safe Home Repair Grant, Safe Home Repair Loan, Saebit Housing (building energy efficiency subsidy), Housing Accessibility Support for Low-Income People with Disabilities |
| Nowon-gu | Low-income home repair support (small repairs), winter home energy consulting, free flood-prevention installation, housing stability support through in-home elder care agencies |
| Reference only | Nowon-gu apartment complex support, living-environment improvement for hoarding households (information only, not repair programs) |

Conditions, amounts, application periods, and sources for each program are in [docs/support-programs-research-2026.md](docs/support-programs-research-2026.md) and [docs/support-programs-research-2-2026.md](docs/support-programs-research-2-2026.md) (Korean). Each program's phone number is included only where it was confirmed in the announcement; otherwise the app falls back to the Wolgye 1-dong community service center.

## What is different

| | Existing approaches | Jipgyeol |
|---|---|---|
| Starting point | Search by program name or category (Bokjiro, Seoul home-repair portal), or proactive notices based on administrative data (Welfare Membership) | **The actual condition of the home**, as residents see it |
| Eligibility check | Read announcements and decide yourself | Simple questions plus automatic building-register lookup |
| Outcome | Ends with information | A counseling prep card that leads to actual counseling and application |

Administrative data knows a household's income and composition, but it cannot tell whether the roof is leaking today. Jipgyeol fills this gap with a resident's photo and a few answers.

### Compared with private home-repair apps

Some private apps now combine a government-support eligibility check with contractor matching. We tried a representative one, Drrk (드르륵), on October 2, 2026.

| | Private home-repair app (Drrk) | Jipgyeol |
|---|---|---|
| Starting point for finding support | Choosing a type of construction work (waterproofing, insulation, windows, and so on) | A photo of the problem or plain words ("water is leaking from the ceiling") |
| Role of photos | Checked by staff in the paid repair flow | AI classifies the problem type to find support programs |
| Result | Eligible or not eligible | Programs that may apply, one by one, with reasons, sources, and reference dates |
| Next step | In-house consultation and contractor matching | Counseling at the community service center (public connection) |

Jipgyeol starts from the problem, so residents do not have to translate it into construction terms such as "waterproofing work". The app's screen flow is documented in [docs/related-services/drrk-2026-10-02](docs/related-services/drrk-2026-10-02/) (Korean screenshots).

![Drrk app flow (captured 2026-10-02)](docs/related-services/drrk-2026-10-02/flow.png)

## Built to be trusted

**Showing why a program was suggested**
- Each suggested program comes with the conditions behind it, for example "You may qualify because you own the house and it was built more than 20 years ago."
- Each program shows a link to the original announcement and the date of the information.
- Programs whose application period has passed are not hidden; the app says "You can apply in the next round."

**The AI and the app do not make the decision**
- AI only selects the problem type. Program matching uses curated program data and rules.
- Results say "you may qualify", not "you qualify", and final eligibility is decided by the counseling agency.

**Handing off to people when stuck**
- If the AI is not confident or no program matches, the app directs the user to counseling at the Wolgye 1-dong community service center.
- If the building-register lookup fails, the app switches to manual input.
- Tenant households are told in advance that landlord consent may be required.
- Residents outside the service area see a notice and are redirected to Bokjiro.

## Counseling prep card

On a program's detail screen, "Make card" creates a one-page card to take to the counseling desk. It can be saved or shared as an image, and it is stored on the device so it can be reopened from the home screen.

| Item | Example |
|---|---|
| Program | Program name, where to apply, phone number |
| Application status | Apply anytime, application period to be checked, and so on |
| Our home | Household size, monthly income range, housing benefit, owner or tenant, neighborhood, the year the house was finished, problem type (photo thumbnail) |
| To check | Income criteria including assets, and other program-specific items |

The card does not include a name or detailed address, only the neighborhood. Printing and text-message delivery are under review.

## Easy mode (barrier-free)

So that older residents can use the app on their own, the design follows these principles. Because Jipgyeol is a mobile app, it primarily follows the Korean mobile application content accessibility guidelines, and also refers to the Korean Web Content Accessibility Guidelines (KWCAG 2.2) and WCAG 2.2:

- Large text and sufficient color contrast
- Large, easy-to-tap buttons
- Plain language instead of administrative terms ("the year the house was finished" instead of "approval date", "monthly household income" instead of "recognized income")
- A progress indicator with step number and name, such as "2/3 Our home", showing which step the user is on
- Step-by-step screens with one task per screen, and a way back at every step
- If the AI is wrong or unsure, the resident picks the problem type from an illustrated list
- Light and dark modes (following the phone setting, switchable between auto, light, and dark), support for 200% text scaling and reduced motion, and an accessible name on every button
- Voice guidance (under review)

## Privacy principles

- Income is asked only as a range, never as an exact amount.
- Photos are shrunk and re-saved on the device, which removes location metadata (EXIF), before they are sent. The server does not store photos.
- Server logs do not record photos, addresses, coordinates, or names.
- Saved programs and counseling cards are stored on the device. Login is optional, and Kakao login receives only the nickname.
- Because an external AI service is used for photo classification and recommendations, how to tell users on screen that a photo is sent is under review.

## Evaluation plan

We plan to run usability evaluations with Wolgye 1-dong residents to check whether they can actually find the support programs they need and prepare for counseling.

## Operating model (under review)

- **Operator:** We envision a public-service model in which Nowon-gu and the Wolgye 1-dong community service center adopt the app as a tool for guiding residents. Residents use it for free.
- **Running costs:** The main costs are AI calls for photo classification and updating program information and income thresholds, which change every year, once or twice a year.
- **Benefits for the administration:** When residents arrive with a counseling prep card, counselors do not need to ask about every condition from scratch, which shortens counseling. Cases with no matching program are also filtered out in advance.

## Tech stack

| Area | What we use |
|---|---|
| App | Expo (React Native, expo-router, TypeScript); web, Android, and iOS from one codebase |
| Server | FastAPI (Python 3.12, Pydantic v2) |
| AI | A multimodal model called through OpenRouter. It classifies a photo into a fixed problem type with a confidence score, and orders and explains the remaining candidate programs |
| Public and external data | Ministry of the Interior and Safety road address search API, Ministry of Land, Infrastructure and Transport building register (Architecture HUB), Kakao Local (coordinates to address) and Kakao Login |
| Own data | 14 support programs (`server/data/programs-2026.json`), problem types (`contracts/problem-types.json`), the standard median income table (`app/src/config/income-2026.ts`) |
| Deployment | Web on Vercel, server on Render (Docker) |
| Quality | Server pytest, app jest, web Playwright E2E, GitHub Actions CI |

Every external integration sits behind an interface. When an API key is empty, the server automatically uses a fake implementation (mock), and the `/health` response lists which parts are fake.

## Timeline

| Period | Work | Status |
|---|---|---|
| Sep 29 to Oct 3 | Core features: photo-based problem classification, program matching, counseling prep card | Done |
| Oct 4 to Oct 8 | MVP: automatic housing information lookup, easy mode, deployment | Done |

## Future plans

- **Reflecting resident feedback:** Run usability evaluations with Wolgye 1-dong residents and refine screens and questions based on the results.
- **Saving personal information on the server:** Today a logged-in user's information is still stored only on the device. Permanent server-side storage is the next step.
- **Voice guidance, card printing and text-message delivery** are under review.
- **Expanding to other areas:** Photo classification and matching rules stay as they are; only the regional program data changes to extend the service to other neighborhoods and districts.
- **Managing program data:** Keep original announcements and reference dates together, and set up a process to update information in line with application periods and the standard median income announced each year.
- **More real-device checks:** Verify camera, phone call, and card saving on more Android and iOS devices.

## Getting started

### Server

```bash
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # leave keys empty to run in fake (mock) mode
uvicorn main:app --reload --port 8000
pytest -q                       # rule-table tests and contract tests
pytest -q tests/smoke -rs       # real-integration checks after adding keys (skipped without keys)
```

`server/.env.example` lists only the variable names: photo classification (`OPENROUTER_*`), addresses (`JUSO_API_KEY`, `KAKAO_REST_KEY`), the building register (`BLDG_API_KEY`), and Kakao Login (`KAKAO_CLIENT_SECRET`, `APP_TOKEN_SECRET`). `.env` files and keys are never committed. While the server runs, `http://localhost:8000/health` shows which parts are fake.

### App

```bash
cd app
npm install
cp .env.example .env            # set EXPO_PUBLIC_API_BASE_URL to the server address
npx expo start                  # i: iOS, a: Android, w: web
npx tsc --noEmit && npx eslint . && npx jest
npm run e2e                     # web E2E (includes the build)
```

- To reach the server on your PC from a phone (Expo Go), use the PC's LAN IP instead of `localhost`.
- To view screens without a server, run with `EXPO_PUBLIC_USE_MOCK_API=1`.
- Camera and location work on the web only over HTTPS or localhost.
- Kakao only redirects back to `http(s)` addresses, so the app returns through a web address (`EXPO_PUBLIC_AUTH_WEB_BASE`) to get back into the app.

### Deployment

- Server: deployed to Render from `render.yaml` at the repository root and `server/Dockerfile`. Secrets are entered as environment variables in the Render dashboard.
- Web: deployed to Vercel with `app/vercel.json` (Root Directory is `app`).

## Project structure

```
app/                  Expo app (web, Android, iOS)
  app/                screens (expo-router): home, household, address, results, program detail, card, my info
  src/                config (copy, income table), features, services (API, storage), ui (design tokens, shared parts)
  e2e/                web E2E
server/               FastAPI server
  routers/ services/  API, rules (matcher), classifier, ranker, address, building, login
  data/               program data (programs-2026.json) and build_programs.py that produces it
  tests/ eval/        tests and rule-table tests
contracts/            API contract and problem types shared by server and app
docs/                 program research, logos, records of compared services
render.yaml           server deployment config
```

## Team Wolgyedonghaeng

| Role | Name |
|---|---|
| Planning | Haneul Kim |
| Backend | Dongjin Choi |
| Frontend | Jihwan Yoon |
| Design | Siyeon Kim |

## Contact

For questions about the project, please contact us through the team repository or a team member.

## Citation

Please cite this project using its Zenodo record.

- DOI: [10.5281/zenodo.23088350](https://doi.org/10.5281/zenodo.23088350)

## License

- Code: [GNU Affero General Public License v3.0 only](LICENSE) (SPDX: `AGPL-3.0-only`)
- Documentation (README and `docs/`): [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) (CC BY 4.0)
- Exception: screenshots of other services in `docs/related-services/` are copyright of their operators, quoted for comparison, and are not covered by CC BY 4.0.

---

This document reflects the MVP as of October 8, 2026. Program information changes every year, so please check the original announcement and the responsible agency before applying. Items marked "(under review)" are still being decided by the team.
