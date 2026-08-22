# Time Prison Population Tracker

A local, laptop-oriented referee board for tracking where inmates and staff are during each prison schedule period.

Created with help from Claude, used during a specific period of my homebrew campaign. No longer maintained.

## Run locally

From this folder:

```bash
pnpm install
pnpm run dev
```

Open the local address printed by Vite. For a production check, run `pnpm run build`.

## Use

- Click a schedule period to move every unpinned person according to their weighted routine.
- Returning to Morning Count from another period asks whether to advance the prison day. Cancelling keeps the current day but still rerolls unpinned people; clicking Morning Count again rerolls without advancing.
- Correct the saved day directly with the Prison Day field when needed.
- Drag a token into another room, or click the token and then click a room header.
- Click the diamond on a token to pin that person in their current room. Pinned people ignore schedule changes.
- Positions, pins, prison day, and the current period are saved in browser local storage.
- Use the legend buttons to temporarily filter the board.

## Edit the board data

All campaign data is plain JSON under `src/config/`:

- `board.json` contains display labels, token category names, persistence defaults, and aliases for migrating renamed person or room IDs.
- `people.json` contains person IDs, display names, categories, routine roles, and starting rooms. The valid categories are `inmate`, `guard`, and `staff`.
- `rooms.json` contains the available rooms and their display details.
- `schedule-states.json` controls the schedule buttons and their order.
- `routines.json` contains each role's valid rooms and weighted placement probabilities for every schedule state.

Weights are relative and do not need to add up to 100. Every role used in `people.json` needs a routine for every schedule state. The current canonical roster is reflected in `people.json`; legacy IDs are migrated through `board.json`.

Within each room, pinned people are displayed first; pinned and unpinned groups are each sorted alphabetically.
Tokens use their full background and border to show category: blue for inmates, orange for guards, and green for other staff.
