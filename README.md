# Menu Picker

Simple web app to rank chef menu options by meal type (breakfast, lunch, dinner).

## Run

1. Open `/Users/jeffrago/Documents/CodexCodingProjects/MenuPicker/index.html` in a browser.

## How it works

1. Paste menu text with meal headers and lettered options, then click **Import Menu**.
2. Add each guest name.
3. Optional: customize scoring choices in **Scoring Scale** using `points=label` lines.
4. Each guest scores each option using your custom choices.
5. Results are ranked by total points per meal type.

Data is saved in browser `localStorage` so refreshes do not lose progress.

## Custom scale example

```text
0=Skip
1=Maybe
2=Like
3=Strong yes
```

## Menu format example

```text
Breakfast
A. Chilaquiles with eggs and salsa verde
B. Tropical fruit, yogurt, and granola

Lunch
A. Fish tacos with slaw
B. Chicken fajitas

Dinner
A. Grilled snapper with rice
B. Mole chicken with tortillas
```
