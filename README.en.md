# Jipgyeol (집결)

> A housing welfare service that starts from a problem in your home and connects you to home-repair support programs and counseling

[한국어](README.md)

A project by **Wolgyedonghaeng** (Team 9), 2026 Kwangwoon University KW Hackathon.

- Written: October 1, 2026
- Status: Planning and prototype design (MVP in development)

---

## Why

Wolgye 1-dong in Nowon-gu, Seoul, has a high share of older residents and aging houses. When a problem appears at home, such as a leak, mold, or a draft around a window, residents often miss out on available support because:

- **They do not know which programs exist.** Home-repair support programs are spread across the Seoul Metropolitan Government, district offices, and other agencies, each with different names and conditions.
- **They cannot easily tell whether they qualify.** Income, age, building age, and ownership or tenancy must be checked by reading each announcement.
- **Search does not match how they think.** Existing services ask users to search by program name or category. Residents know the problem ("water is leaking from the bathroom ceiling"), not the program name.
- **Digital access is hard.** Older residents in particular struggle to collect information across several websites.

## How it works

Jipgyeol starts from **the problem in the home**, not from a policy name.

```
Take a photo → Classify the problem → Check conditions → Match support programs → Counseling prep card → Connect to counseling and application
```

1. **Take a photo** of the part of the house that needs repair.
2. **Classify the problem:** AI makes a first-pass classification of the problem type (leak, mold, window draft, and so on). Users can also pick the problem from an illustrated list instead.
3. **Check conditions:** Users answer a few simple questions (age, housing type, owner or tenant). Building age and approval date are retrieved automatically from the public building register.
4. **Match support programs** from Seoul and Nowon-gu that fit the problem type and conditions.
5. **Counseling prep card:** A one-page summary of confirmed conditions, items still to check, and documents to prepare.
6. **Connect** residents to the community service center or the relevant agency for counseling and application.

## What is different

| | Existing approaches | Jipgyeol |
|---|---|---|
| Starting point | Search by program name or category (Bokjiro, Seoul home-repair portal), or proactive notices based on administrative data (Welfare Membership) | **The actual condition of the home**, as residents see it |
| Eligibility check | Read announcements and decide yourself | Simple questions plus automatic building-register lookup |
| Outcome | Ends with information | A counseling prep card that leads to actual counseling and application |

Administrative data knows a household's income and composition, but it cannot tell whether the roof is leaking today. Jipgyeol fills this gap with a resident's photo and a few answers.

## Designed to fail safely

- **Hand off to people when unsure.** If the AI is not confident or no program matches, the app directs the user to counseling at the Wolgye 1-dong community service center.
- **AI does not make the decision.** AI only selects the problem type. Program matching uses curated program data and rules, and final eligibility is decided by the counseling agency.
- **Manual input as a fallback** when the building-register lookup fails.
- **Tenant households** are told in advance that landlord consent may be required.
- **Residents outside the service area** see a notice and are redirected to Bokjiro.

## Easy mode

To let older residents use the app on their own, the default design uses large text, plain language, and step-by-step screens with one task per screen.

## Privacy principles

- Location metadata (EXIF) is removed from photos before processing.
- Original photos are not stored by default.
- Users are informed on screen before any photo is sent to an external AI service.

## Tech stack (under review)

- App: React Native
- Server: FastAPI
- AI: Multimodal AI for photo classification
- Data: Public data APIs including the building register, and curated data on Seoul and Nowon-gu home-repair programs

## Timeline

| Period | Work |
|---|---|
| Sep 29 to Oct 3 | Core features: photo-based problem classification, program matching, counseling prep card |
| Oct 4 to Oct 8 | MVP: automatic housing information lookup, easy mode |

## Team Wolgyedonghaeng

| Role | Name |
|---|---|
| Planning | Haneul Kim |
| Backend | Dongjin Choi |
| Frontend | Jihwan Yoon |
| Design | Siyeon Kim |

---

This document is a draft describing the idea and design direction, and it may change as development progresses.
