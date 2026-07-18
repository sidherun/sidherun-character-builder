# Hit Points
<!-- source: Sidherun PHB 2_8_2026.docx -->

## Hit Points Represent the Health of a Character

Hit Points in Sidherun represent the current status of the health of a character. Calculating the *Hit Points* of a character take a little math, as they are specific to the individual, so consider several facts, as represented by the formula, below:

## Hit Point calculation

BASE = RACE * SIZE * AGE

(((STR + END)/2) + CON + BASE) x con% if applicable

## Important Notes:

- Hit points in Sidherun, unlike other gaming systems are static. While there are several healing mechanics in the game, a character's hit points remain the same (barring any narrative or magic means) throughout the game. The only way to increase your *Hit Points* is to raise your **Attributes**

The source document states "Table below (Constitution Modification Table) is also here" at this point, referring to the Constitution Modification Table. In the original Word document this table was an embedded image, not HTML text, so it did not carry over into the HTML export. It is reproduced verbatim below from a manual transcription of that image.

> **Constitution Modification Table**

| Descriptor | POOR | FAIR | TYPICAL | CAPABLE | STRONG | HEROIC | NOBLE | ENHANCED | AUGMENTED | CELESTIAL |
|---|---|---|---|---|---|---|---|---|---|---|
| Constitution Score | 0-4 | 5-8 | 9-12 | 13-15 | 16-18 | 19-20 | 21-23 | 24-26 | 27-29 | 30+ |
| Hit Point Adjustment | -50% | -25% | - | - | +10% | +25% | +30% | +40% | +50% (and up) | ? |

> The machine-readable version of this table lives at `rules/data/constitution-modification.json`.

## To calculate your Hit Points:

- **First**, determine your 'Base':
  - Base = RACE * SIZE * AGE

**RACE:**

- Frail = 10
  - Examples: Fae creatures, small familiars
- Slight = 15
  - Examples: Quin'dhel, Vale Dwarf, Avian = 15
- Healthy = 20
  - Examples: Human, Aerian, Gla'mdroi
- Stout = 30
  - Examples: Mountain Dwarf, Orc, Ogre

**SIZE:**

- Small = .5
  - Examples: Fae creatures, small familiars, Vale Dwarves
- Medium = 1
  - Examples: Most elves, Humans, Mountain Dwarves, Avian, Aerians
- Large = 1.5
  - Examples: Ogres, Smaller Giant Races, Large Bears
- Huge = 2
  - Examples: Giant Races, Elephant-sized creatures
- Gargantuan = 3
  - Examples: Adult Dragons, Many Dinosaurs

**AGE:**

- Young = .75
- Adult = 1
- Elderly = .75-.5

## After you have calculated your base:

- Average your Strength and Endurance (Str + End)/2
- Add the "Average" from step 1 to your Constitution (CON) score and your BASE
- If you have any further modifiers, apply them now

**Hit Point calculation (also shown at top of article)**

BASE = RACE * SIZE * AGE

(((STR + END)/2) + CON + BASE) x con% if applicable
