# Jipgyeol (집결)

> A housing welfare service that starts from a problem in your home and brings scattered home-repair support programs and counseling information together in one place

[한국어](README.md)

A project by **Wolgyedonghaeng** (Team 9), 2026 Kwangwoon University KW Hackathon.

- Topic area: Barrier-free and everyday convenience
- Written: October 1, 2026 (support program information as of 2026)
- Status: Planning and prototype design (MVP in development)

---

## Why

Nowon-gu is one of the Seoul districts with a high concentration of aging houses ([Seoul Shinmun, Dec 29, 2025](https://go.seoul.co.kr/news/newsView.php?id=20251229020004)), and Wolgye 1-dong has many older residents and old houses. Old houses bring both everyday discomfort and safety risks: leaks, mold, drafty windows, door sills, and slippery bathrooms. Yet residents often miss out on available support because:

- **They do not know which programs exist.** Home-repair support is spread across the national government, the Seoul Metropolitan Government, Nowon-gu, and public agencies, each with different names, conditions, and application periods.
- **They cannot easily tell whether they qualify.** Income bracket, housing-benefit status, building age, and ownership or tenancy must be checked in each announcement, and some programs exclude recipients of other programs.
- **Search does not match how they think.** Existing services ask users to search by program name or category. Residents know the problem ("water is leaking from the bathroom ceiling"), not the program name.
- **Digital access is hard.** Older residents in particular struggle to collect and compare information across several websites.

## Who it is for

| User | Need |
|---|---|
| Residents of aging houses (especially older adults and people with limited digital skills) | Find support they can receive from the problem alone, without knowing program names |
| Helpers (family members, neighborhood representatives, neighbors) | Check quickly on a resident's behalf and help prepare for counseling |
| Counselors at the community service center | Receive residents who already have the needed information organized, shortening counseling time |

## How it works

Jipgyeol starts from **the problem in the home**, not from a policy name.

```
Take a photo → Classify the problem → User confirms → Check conditions → Match support programs → Counseling prep card → Connect to counseling and application
```

1. **Take a photo** of the part of the house that needs repair.
2. **Classify the problem:** AI assigns the photo to one of a fixed set of problem types, such as leak, mold, window draft/insulation, heating, or safety (door sills, grab bars, slippery floors). The type becomes a search keyword for finding support programs.
3. **User confirms:** The app shows the AI's judgment ("This looks like a leak. Is that right?") and lets the resident confirm it or choose a different type. If the AI is not confident, the app suggests counseling first.
4. **Check conditions:** Users answer a few simple questions (age, housing type, owner or tenant, benefit status). Building age and approval date are retrieved automatically from the public building register.
5. **Match support programs** using a problem-type keyword mapping table and a synonym dictionary (for example, grouping "dripping", "leak", and "ceiling stain" as the same problem).
6. **Counseling prep card:** A one-page summary of what is confirmed and what still needs checking.
7. **Connect** residents to the Wolgye 1-dong community service center or the relevant agency for counseling and application.

## Programs we connect to (as of 2026)

| Program | Operator | Main eligibility | Related problem types |
|---|---|---|---|
| Safe Home Repair Grant (안심 집수리 보조사업) | Seoul | Vulnerable households at or below 100% of median income in low-rise houses 10+ years old, semi-basement units, rooftop units, and others | Windows, insulation, heating, waterproofing, accessibility and fire-safety fixtures |
| Safe Home Repair Loan (안심 집수리 융자) | Seoul | Low-rise houses 20+ years after approval | Most types |
| Hope Home Repair (희망의 집수리) | Seoul, applied through community service centers | At or below 60% of median income (housing-benefit recipients excluded) | Wallpaper and flooring, insulation, grab bars, sill removal, anti-slip bathroom floors, and more |
| Housing Benefit Repair and Maintenance (주거급여 수선유지급여) | Ministry of Land, Infrastructure and Transport; LH | Owner-occupier households at or below 48% of median income | Light, medium, and major repairs |
| Energy Efficiency Improvement for Low-Income Households (저소득층 에너지효율개선) | Ministry of Trade, Industry and Energy; Korea Energy Foundation | Basic livelihood recipients, near-poverty households, and others | Insulation, windows, boilers, air conditioners |
| Nowon-gu home repair support | Nowon-gu | Low-income households | Under verification |

Conditions, amounts, application periods, and sources for each program are in [docs/support-programs-2026.md](docs/support-programs-2026.md) (Korean). Because programs change every year, the app shows a reference date and a link to the original announcement for each program.

## What is different

| | Existing approaches | Jipgyeol |
|---|---|---|
| Starting point | Search by program name or category (Bokjiro, Seoul home-repair portal), or proactive notices based on administrative data (Welfare Membership) | **The actual condition of the home**, as residents see it |
| Eligibility check | Read announcements and decide yourself | Simple questions plus automatic building-register lookup |
| Outcome | Ends with information | A counseling prep card that leads to actual counseling and application |

Administrative data knows a household's income and composition, but it cannot tell whether the roof is leaking today. Jipgyeol fills this gap with a resident's photo and a few answers.

## Showing why a program was suggested

- Each suggested program comes with the conditions behind it, for example "You qualify because you own the house and it was approved more than 20 years ago."
- Each program shows a link to the original announcement and the date of the information.
- Programs whose application period has passed are not hidden; the app says "You can apply in the next round."

## Counseling prep card

| Item | Example |
|---|---|
| Problem | Bathroom ceiling leak (photo attached) |
| Confirmed conditions | Age 65, owner-occupied, detached house, approved in 1985 |
| Conditions to check | Income bracket, housing-benefit status |
| Programs that may apply | Program name, operator, application period |
| Documents to prepare | Per program |
| Where to go | Wolgye 1-dong community service center contact and hours |

The card is shown on screen; printing and text-message delivery are under review.

## Designed to fail safely

- **Hand off to people when unsure.** If the AI is not confident or no program matches, the app directs the user to counseling at the Wolgye 1-dong community service center.
- **AI does not make the decision.** AI only selects the problem type. Program matching uses curated program data and rules, and final eligibility is decided by the counseling agency.
- **Manual input as a fallback** when the building-register lookup fails.
- **Tenant households** are told in advance that landlord consent may be required.
- **Residents outside the service area** see a notice and are redirected to Bokjiro.

## Easy mode (barrier-free)

So that older residents can use the app on their own, the design follows these principles. Because Jipgyeol is a mobile app, it primarily follows the Korean mobile application content accessibility guidelines, and also refers to the Korean Web Content Accessibility Guidelines (KWCAG 2.2) and WCAG 2.2:

- Large text and sufficient color contrast
- Large, easy-to-tap buttons
- Plain language instead of administrative terms ("the year the house was finished" instead of "approval date")
- Step-by-step screens with one task per screen, and a way back at every step
- Choosing the problem from an illustrated list instead of a photo (under review)
- Voice guidance (under review)

## Privacy principles (under review)

- Location metadata (EXIF) is removed from photos before processing.
- Original photos are not stored by default.
- Users are informed on screen before any photo is sent to an external AI service.

## Evaluation plan

We plan to run usability evaluations with Wolgye 1-dong residents to check whether they can actually find the support programs they need and prepare for counseling.

## Tech stack (under review)

- App: React Native
- Server: FastAPI
- AI: Multimodal AI for photo classification (outputs a fixed problem type and a confidence score)
- Data: Public data APIs including the building register, and curated data on Seoul, Nowon-gu, and national home-repair programs

## Timeline

| Period | Work |
|---|---|
| Sep 29 to Oct 3 | Core features: photo-based problem classification, program matching, counseling prep card |
| Oct 4 to Oct 8 | MVP: automatic housing information lookup, easy mode |

## Getting started

To be added as development progresses.

## Project structure

To be added as development progresses.

## Team Wolgyedonghaeng

| Role | Name |
|---|---|
| Planning | Haneul Kim |
| Backend | Dongjin Choi |
| Frontend | Jihwan Yoon |
| Design | Siyeon Kim |

## Contact

For questions about the project, please contact us through the team repository or a team member.

## License

To be decided by the team.

---

This document is a draft describing the idea and design direction, and it may change as development progresses. Items marked "(under review)" are still being decided by the team.
