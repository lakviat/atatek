# Atatek Requirements

## Project

Atatek is a simple family ancestry webpage for the Junos Shalia family line.
The name comes from Kyrgyz and refers to ancestry.

The site is intended to be deployed later with GitHub Pages, likely under a
`github.io` URL.

## Goal

Create a clean visual generational tree showing people, profile photos, names,
and family relationships across generations.

The page should make it immediately clear who comes from whom.

## Visual Direction

- White background.
- Minimal interface.
- Simple connecting lines between generations.
- Clear parent-child relationship flow.
- Calm, respectful, readable design.
- No heavy decoration, dark theme, or clutter.

## Core Features

- Display people as nodes in a family tree.
- Show each person with a profile photo and name.
- Support optional details such as birth year, death year, birthplace, and short notes.
- Allow clicking a person to open a larger profile view.
- Show the selected person's photo in a clean expanded view.
- Support zooming and panning around the tree.
- Work well on desktop and mobile.
- Keep data easy to update as more names and photos are added.

## Suggested Technical Direction

- Static website suitable for GitHub Pages.
- No backend required for the first version.
- Use a simple frontend structure that can be maintained easily.
- Store family data in a structured file, likely JSON.
- Store profile images in a predictable folder such as `assets/people/`.
- Keep the first version lightweight before adding advanced tooling.

## Suggested Data Model

Each person can eventually include:

- Unique ID
- Full name
- Profile photo path
- Parent IDs
- Spouse IDs, if needed
- Child IDs, if needed
- Birth date or birth year
- Death date or death year, if applicable
- Birthplace or region, optional
- Short biography, optional
- Privacy flag for living people, optional

## Initial Placeholder Content

Until real photos and names are available, the first version can use placeholder
people and placeholder portraits.

Example structure:

- Root ancestor
- Children generation
- Grandchildren generation
- Later descendants

## Future Considerations

- Whether spouses should appear directly in the main tree or only inside profiles.
- Whether to support both paternal and maternal branches from the beginning.
- Whether living people should have limited public information.
- Whether to include Kyrgyz, English, or both languages.
- Whether the family tree should default to one root ancestor or support multiple roots.

## Open Questions

- Should the project spelling be `Atatek`, `Atatech`, or another transliteration?
- What is the exact preferred spelling of `Junos Shalia`?
- What last-name letter or branch label should appear in the title?
- Should the first version be plain HTML/CSS/JavaScript or a small React app?
- Should photos open as a full-screen lightbox, side panel, or centered modal?
