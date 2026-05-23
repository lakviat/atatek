# Atatek

Atatek is a simple family ancestry tree website for the Dzhunushaliev Family Line.

The first version is a static GitHub Pages-ready site with:

- A clean white-background family tree
- Zoom and pan controls
- Clickable person profiles
- Placeholder family data
- A JSON data file that can be updated as real names and photos are added

## Local Preview

Run a static server from the project folder:

```sh
python3 -m http.server 5173
```

Then open `http://localhost:5173`.

## GitHub Pages

Enable Pages in the repository settings:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

After GitHub finishes publishing, the site should be available at:

`https://lakviat.github.io/atatek/`

## Editing People

People are stored in `data/people.json`.

Profile photos should be placed in `assets/people/` and referenced from the JSON file:

```json
{
  "id": "person-id",
  "name": "Full Name",
  "photo": "assets/people/full-name.jpg"
}
```

If `photo` is empty, the site shows an initial-based placeholder portrait.

Original uploaded photos are preserved in:

`assets/uploads/originals/`

Cleaned or cropped web-ready profile photos are stored separately in:

`assets/people/`

Temporary crops from the marked group photo live in:

`assets/people/from-reference/`

These are only draft portraits and can be replaced later with cleaner individual photos while keeping the same JSON structure.

## Layout Strategy

Large branches are laid out by subtree size. A person or couple with many descendants gets more horizontal space, while branches with no children stay compact.

Family-of-origin and marriage branches are separate visually:

- Parent/sibling lines connect to the individual person's portrait.
- Children from a marriage connect from the couple midpoint.
- Spouses are shown in the same visual node, but they are not treated as siblings of the person's brothers or sisters.

For married couples, use one family node with `partner`:

```json
{
  "id": "child-06",
  "name": "Child 6",
  "partner": {
    "name": "Child 6's Wife",
    "photo": "assets/people/from-reference/child-06-family/wife.jpg"
  }
}
```

Children should reference the main couple node ID in `parents`, for example:

```json
"parents": ["child-06"]
```
