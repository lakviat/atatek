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
